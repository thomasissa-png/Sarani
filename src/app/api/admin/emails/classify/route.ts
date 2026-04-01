import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { getEmailById, stripHtml, isEmailConfigured } from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Types ─────────────────────────────────────────────────────────────────

type EmailCategory = "enquiry" | "new_project" | "project_feedback" | "other";

type RouteTo = "PROTO-ENQUIRY" | "PROTO-EMAIL-INTAKE" | "PROTO-CLIENT-RETURN" | "archive";

interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  draftReply: string;
  clickupProjectHint: string | null;
  language: string;  // ISO 639-1 code ("en", "fr", "de", etc.)
  routeTo: RouteTo;  // Protocol target for routing
}

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

const ClassificationResultSchema = z.object({
  category: z.enum(["enquiry", "new_project", "project_feedback", "other"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedAction: z.string(),
  draftReply: z.string(),
  clickupProjectHint: z.string().nullable(),
  language: z.string().min(2).max(5),
  routeTo: z.enum(["PROTO-ENQUIRY", "PROTO-EMAIL-INTAKE", "PROTO-CLIENT-RETURN", "archive"]),
});

// ─── Pre-LLM noise filters ────────────────────────────────────────────────

const NOISE_SENDERS = [
  "noreply",
  "no-reply",
  "no_reply",
  "newsletter",
  "notification",
  "mailer-daemon",
  "postmaster",
  "donotreply",
  "do-not-reply",
  "do_not_reply",
];

function isNoiseByEmail(from: string): boolean {
  const lower = from.toLowerCase();
  return NOISE_SENDERS.some((pattern) => lower.includes(pattern));
}

// ─── Claude prompt ─────────────────────────────────────────────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier and reply assistant. Sarani is an international creative agency (35 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category, detect its language, and draft a professional reply.

Categories:
- "enquiry": Question about Sarani's services, request for quote/pricing, general question, first contact (casual or specific). No existing project involved.
- "new_project": A brief for a NEW project from an existing OR new client — contains deliverables, timeline, brand info, or a clear project request. Sender may or may not have worked with Sarani before.
- "project_feedback": Feedback, revision request, follow-up, status question, or any message about an EXISTING ongoing project. The sender references a specific past or ongoing project.
- "other": Newsletters, automated notifications, system alerts, out-of-office, marketing emails.

Routing:
- enquiry → "PROTO-ENQUIRY"
- new_project → "PROTO-EMAIL-INTAKE"
- project_feedback → "PROTO-CLIENT-RETURN"
- other → "archive"

Return JSON:
{
  "category": "<one of the 4 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence — internal analysis for the PM on what to do next",
  "draftReply": "Complete email reply ready to send. Greeting: 'Hi [FirstName],' or formal equivalent matching the sender's language. Body: 2-3 sentences directly addressing the email content. Closing: 'Best regards,\\nThe Sarani Team'. Language: MUST match the sender's email language.",
  "clickupProjectHint": "Client name or project name extracted from the email, as it would appear in ClickUp task titles. Null if not identifiable.",
  "language": "<ISO 639-1 code of the email's language>",
  "routeTo": "<protocol name from routing rules>"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure between two categories, pick the one that requires human attention (prefer false positive over missed client email).
- Confidence below 0.6 means you are uncertain — flag it in reasoning.
- Language detection: identify the PRIMARY language of the email body. If mixed, use the dominant language. Default to "en" only if truly ambiguous.
- draftReply MUST be a real email reply the PM can send as-is. Never include analysis phrases like "I suggest", "This email is about", "You should".
- clickupProjectHint: extract the client or project name only if the email references a specific ongoing project. Return null for enquiries, new projects, and other.`;

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

    // Classify with Claude Haiku
    const llmResult = await callClaudeJSON<ClassificationResult>({
      systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
      userMessage: `Subject: ${subject}\nFrom: ${from}\nBody preview: ${bodyPreview}`,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 256,
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
        const searchUrl = new URL("/api/admin/clickup/search", request.url);
        const searchRes = await fetch(searchUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: parseResult.data.clickupProjectHint }),
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json() as {
            taskId: string | null;
            taskUrl: string | null;
            taskName: string | null;
          };
          if (searchData.taskId) {
            classificationData.taskId = searchData.taskId;
            classificationData.taskUrl = searchData.taskUrl;
            classificationData.taskName = searchData.taskName;
          }
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
