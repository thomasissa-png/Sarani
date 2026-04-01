import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  FEEDBACK_EXTRACTOR_SYSTEM_PROMPT,
  FeedbackExtractionResultSchema,
  buildFeedbackExtractionUserMessage,
  type FeedbackExtractionResult,
} from "@/lib/ai/prompts/feedback-extractor";

// ─── Validation ────────────────────────────────────────────────────────────

const FeedbackExtractRequestSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  from: z.string().min(1),
  clientName: z.string().min(1),
});

// ─── POST /api/admin/feedback/extract ──────────────────────────────────────
// Extracts a structured feedback comment from a client email for ClickUp.

export async function POST(request: NextRequest) {
  // Auth guard
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 requests per minute
  if (!checkRateLimit("feedback-extract", 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many extraction requests. Please wait." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Parse and validate body
  let parsed: z.infer<typeof FeedbackExtractRequestSchema>;
  try {
    const rawBody = await request.json();
    parsed = FeedbackExtractRequestSchema.parse(rawBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON body. Send { subject, body, from, clientName }." },
      { status: 400 }
    );
  }

  try {
    const llmResult = await callClaudeJSON<FeedbackExtractionResult>({
      systemPrompt: FEEDBACK_EXTRACTOR_SYSTEM_PROMPT,
      userMessage: buildFeedbackExtractionUserMessage({
        emailSubject: parsed.subject,
        emailBody: parsed.body.slice(0, 3000),
        senderEmail: parsed.from,
        clientName: parsed.clientName,
      }),
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1024,
      timeout: 10_000,
    });

    // Validate LLM output
    const parseResult = FeedbackExtractionResultSchema.safeParse(llmResult.data);
    if (!parseResult.success) {
      console.error(
        "[Feedback Extract] LLM returned malformed data:",
        JSON.stringify(llmResult.data),
        "Errors:",
        parseResult.error.issues
      );
      return NextResponse.json(
        { error: "Extraction returned invalid structure. Please retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedbackComment: parseResult.data.feedbackComment,
    });
  } catch (error) {
    console.error("[Feedback Extract] Error:", error);

    const message =
      error instanceof Error ? error.message : "Feedback extraction failed";

    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { error: "Extraction timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
