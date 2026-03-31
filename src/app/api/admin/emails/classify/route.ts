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
  | "new_client_potential"
  | "new_client_prospect";

type RouteTo =
  | "PROTO-EMAIL-INTAKE"
  | "PROTO-CLIENT-RETURN"
  | "PROTO-PITCH"
  | "PROTO-CLIENT-REPLY"
  | "archive";

interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
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
  category: z.enum([
    "client_brief",
    "client_followup",
    "noise",
    "new_client_potential",
    "new_client_prospect",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedAction: z.string(),
  language: z.string().min(2).max(5),
  routeTo: z.enum([
    "PROTO-EMAIL-INTAKE",
    "PROTO-CLIENT-RETURN",
    "PROTO-PITCH",
    "PROTO-CLIENT-REPLY",
    "archive",
  ]),
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

const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier. Sarani is an international creative agency (35 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category AND detect its language.

Categories:
- "client_brief": email containing a project brief, request for work, or new deliverable request from an EXISTING or KNOWN client. The sender has worked with Sarani before, the brief is clear and specific (deliverables, timeline, brand mentioned).
- "client_followup": follow-up, question, feedback, revision request, or status update about an ONGOING project.
- "noise": newsletters, automated notifications, marketing emails, system alerts, subscription confirmations, out-of-office replies.
- "new_client_potential": first contact from someone who could become a client — casual inquiry, introduction, "just reaching out". No specific project request yet.
- "new_client_prospect": first contact from a prospect who WANTS something specific — requests a quote, a pitch, a proposal, asks for pricing, describes a project they need help with. They are ready to buy, not just browsing.

Key distinction — client_brief vs new_client_prospect:
- client_brief = KNOWN client + CLEAR brief (specific deliverables, deadline, brand context). Example: "Hi team, we need 20 banners for our Q3 campaign, here are the specs..."
- new_client_prospect = UNKNOWN sender + WANTS a quote/pitch/proposal. Example: "We're a fashion brand looking for a creative agency to handle our social media. Can you send us a proposal?"
- If unsure: does the sender reference past Sarani projects or use internal vocabulary (SharePoint links, ClickUp refs)? → client_brief. Otherwise → new_client_prospect.

Routing rules:
- client_brief → "PROTO-EMAIL-INTAKE"
- client_followup → "PROTO-CLIENT-RETURN"
- noise → "archive"
- new_client_potential → "PROTO-CLIENT-REPLY"
- new_client_prospect → "PROTO-PITCH"

Return JSON:
{
  "category": "<one of the 5 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explaining why this category",
  "suggestedAction": "one sentence — what should the PM do next",
  "language": "<ISO 639-1 code of the email's language>",
  "routeTo": "<protocol name from routing rules>"
}

Rules:
- Return valid JSON only, no markdown.
- If unsure between two categories, pick the one that requires human attention (prefer false positive over missed client email).
- Confidence below 0.6 means you are uncertain — flag it in reasoning.
- Language detection: identify the PRIMARY language of the email body. If mixed, use the dominant language. Default to "en" only if truly ambiguous.`;

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

    return NextResponse.json(parseResult.data);
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
