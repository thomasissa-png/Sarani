import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { getEmailById, stripHtml, isEmailConfigured } from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  ClassificationResultSchema,
  isNoiseByEmail,
  type ClassificationResult,
} from "@/lib/ai/prompts/classifier";
import { buildClientProfileBlock } from "@/lib/arya/client-profile-builder";

// ─── Validation ────────────────────────────────────────────────────────────

const ClassifyByIdSchema = z.object({
  messageId: z.string().min(1),
});

const ClassifyByContentSchema = z.object({
  subject: z.string(),
  from: z.string(),
  bodyPreview: z.string(),
});

const ClassifySchema = z.union([ClassifyByIdSchema, ClassifyByContentSchema]);

// ─── POST handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth guard
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 requests per minute
  if (!checkRateLimit("email-classify", 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many classification requests. Please wait." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Parse body
  let parsed: z.infer<typeof ClassifySchema>;
  try {
    const rawBody = await request.json();
    parsed = ClassifySchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON body. Send { messageId } or { subject, from, bodyPreview }." },
      { status: 400 }
    );
  }

  try {
    let subject: string;
    let from: string;
    let bodyPreview: string;

    if ("messageId" in parsed) {
      // Fetch email from Graph API
      if (!isEmailConfigured()) {
        return NextResponse.json(
          { error: "Email integration not configured" },
          { status: 503 }
        );
      }

      const email = await getEmailById(parsed.messageId);
      subject = email.subject;
      from = email.from.emailAddress.address;
      bodyPreview = stripHtml(email.body.content).slice(0, 2000);
    } else {
      subject = parsed.subject;
      from = parsed.from;
      bodyPreview = parsed.bodyPreview.slice(0, 2000);
    }

    // Pre-LLM filter: obvious noise
    if (isNoiseByEmail(from)) {
      const result: ClassificationResult = {
        category: "other",
        confidence: 0.95,
        reasoning: `Sender address "${from}" matches automated/notification pattern.`,
        suggestedAction: "Archive or ignore — automated sender detected.",
        draftReply: "",
        clickupProjectHint: null,
        language: "en",
        routeTo: "archive",
      };
      return NextResponse.json(result);
    }

    // Load client profile (non-blocking — empty string if unavailable)
    const clientProfile = await buildClientProfileBlock({
      senderEmail: from,
    });

    // Classify with Claude Haiku
    const llmResult = await callClaudeJSON<ClassificationResult>({
      systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
      userMessage: `Subject: ${subject}\nFrom: ${from}\nBody preview: ${bodyPreview}${clientProfile}`,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 512,
      timeout: 10_000,
    });

    // Validate LLM output with Zod schema
    const parseResult = ClassificationResultSchema.safeParse(llmResult.data);
    if (!parseResult.success) {
      console.error(
        "[Email Classify] LLM returned malformed data:",
        JSON.stringify(llmResult.data),
        "Errors:",
        parseResult.error.issues
      );
      return NextResponse.json(
        { error: "Classification returned invalid structure. Please retry." },
        { status: 500 }
      );
    }

    // ─── ClickUp project search for project_feedback ───────────────────
    const classificationData = { ...parseResult.data } as Record<string, unknown>;

    if (
      parseResult.data.category === "project_feedback" &&
      parseResult.data.clickupProjectHint
    ) {
      try {
        const { searchTaskByName } = await import("@/lib/integrations/clickup");
        const match = await searchTaskByName(parseResult.data.clickupProjectHint);
        if (match) {
          classificationData.taskId = match.taskId;
          classificationData.taskUrl = match.taskUrl;
          classificationData.taskName = match.taskName;
        }
      } catch (searchError) {
        // Graceful degradation — classification still works without ClickUp link
        console.warn("[Email Classify] ClickUp search failed:", searchError);
      }
    }

    return NextResponse.json(classificationData);
  } catch (error) {
    console.error("[Email Classify] Error:", error);

    const message =
      error instanceof Error ? error.message : "Classification failed";

    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { error: "Classification timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
