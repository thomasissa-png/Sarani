import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { getEmailById, stripHtml, isEmailConfigured } from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Types ─────────────────────────────────────────────────────────────────

type EmailCategory =
  | "client_brief"
  | "client_followup"
  | "noise"
  | "new_client_potential";

interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
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

const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier. Sarani is an international creative agency. Classify the following email into exactly ONE category.

Categories:
- "client_brief": email containing a project brief, request for work, or new deliverable request from an existing or known client
- "client_followup": follow-up, question, feedback, revision request, or status update about an ongoing project
- "noise": newsletters, automated notifications, marketing emails, system alerts, subscription confirmations
- "new_client_potential": first contact from someone who could become a client — inquiry, introduction, request for information or pricing

Return JSON:
{
  "category": "client_brief"|"client_followup"|"noise"|"new_client_potential",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence — what should the PM do next"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure between two categories, pick the one that requires human attention (prefer false positive over missed client email).
- Confidence below 0.6 means you are uncertain — flag it in reasoning.`;

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
        category: "noise",
        confidence: 0.95,
        reasoning: `Sender address "${from}" matches automated/notification pattern.`,
        suggestedAction: "Archive or ignore — automated sender detected.",
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

    return NextResponse.json(llmResult.data);
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
