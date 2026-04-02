import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getEmailById,
  getEmailAttachments,
  markEmailAsRead,
  stripHtml,
  isEmailConfigured,
} from "@/lib/integrations/email";
import { callClaudeJSON } from "@/lib/ai/claude";
import { db } from "@/lib/db";
import { clients, inboxItems } from "@/lib/db/schema";
import { like, eq } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BriefExtraction {
  project_name: string;
  project_type: "design" | "video" | "translation" | "other";
  brief_markdown: string;
  deadline: string | null;
  missing_info: string[];
}

interface ClientReply {
  subject: string;
  body: string;
}

interface ImportResponse {
  email: {
    id: string;
    subject: string;
    from: string;
    fromEmail: string;
    receivedDateTime: string;
  };
  clientMatch: {
    id: string;
    name: string;
  } | null;
  brief: BriefExtraction;
  attachments: {
    id: string;
    name: string;
    contentType: string;
    size: number;
  }[];
  /** Auto-generated reply for the client — ready to copy-paste */
  clientReply: ClientReply | null;
}

// ─── Claude Prompt ──────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are Sarani's Project Manager. Analyze this client email and extract a structured project brief using Sarani's 6-section template.

Return JSON:
{
  "project_name": "concise title max 60 chars",
  "project_type": "design"|"video"|"translation"|"other",
  "brief_markdown": "the brief in Markdown using the 6-section template below",
  "deadline": "ISO date or null",
  "missing_info": ["list of missing critical info"]
}

The brief_markdown MUST follow this exact 6-section structure:

🌟 Introduction
[Context of the project, objective, client background — show understanding of their business need]

✈️ Brief
[Detailed description of the request, technical specs, references, creative direction — everything the production team needs]

🚚 Deliverables
[Exhaustive list of deliverables with formats, dimensions, languages, quantities]

📍 Source Files
[SharePoint links to source assets — or "To be provided by client" if not mentioned in the email]

💬 Branding
[Client brand guidelines, colors, fonts, logo usage — extract from email or "See client brand guidelines on SharePoint"]

➡️ Others
[Deadline, special constraints, additional notes — extract any scheduling, budget, or process requirements from the email]

Rules:
- Never invent data. If information is not in the email, say "To be provided by client" or "Not specified".
- Keep brief factual and actionable.
- Each section must have content (even if just "Not specified" or "To be confirmed").
- Use the emoji headers exactly as shown above.
- Return valid JSON only.`;

// ─── Aggregation Prompt ────────────────────────────────────────────────────

const AGGREGATION_SYSTEM_PROMPT = `You are Sarani's Project Manager. You have an existing project brief and a follow-up email from the same client that adds or modifies information.

Your job: UPDATE the existing brief by integrating the new information from the follow-up email.

Rules:
- If the client contradicts something from the original brief, use the MORE RECENT version (the follow-up email).
- If the client adds new information, integrate it into the appropriate section.
- If the client asks a question or gives feedback, add it to the "Others" section.
- Preserve the 6-section structure exactly.
- Never remove information from the original brief unless explicitly contradicted.
- Return the COMPLETE updated brief, not just the changes.

Return JSON:
{
  "project_name": "concise title max 60 chars (update if the follow-up changes the scope)",
  "project_type": "design"|"video"|"translation"|"other",
  "brief_markdown": "the UPDATED brief in Markdown using the 6-section template",
  "deadline": "ISO date or null (update if follow-up mentions a new deadline)",
  "missing_info": ["list of STILL missing critical info after integrating the follow-up"]
}

Rules: Return valid JSON only. Never invent data not present in either the original brief or the follow-up email.`;

// ─── Body Schema ───────────────────────────────────────────────────────────

const ImportBodySchema = z.object({
  existingBriefId: z.string().uuid().optional(),
}).optional();

const REPLY_SYSTEM_PROMPT = `You are a project manager at Sarani, an international creative agency (45 experts, 5 continents, 24/7 delivery).
You are writing a reply to a client email that just came in with a project request.

TONE MIRRORING — CRITICAL:
- Match the language AND register of the client's email exactly.
- If they write casually ("Hey!", first name, emojis) → reply casually.
- If they write formally → reply formally but with warmth.
- You KNOW this client. Use their first name. Be warm, not corporate.
- NEVER use: "Dear Sir/Madam", "I hope this email finds you well", "Please do not hesitate to contact us".
- Sound like a real person who genuinely enjoys working with this client.

CONTENT:
- Confirm you received the brief and the team is on it.
- If deliverables are clear → confirm what you understood and give an estimated delivery timeframe (Sarani delivers in D+1 for standard requests).
- If info is missing (see missing_info) → ask the specific questions naturally, not as a bullet list. Weave them into the conversation.
- If deadline is tight (same day or < 24h) → acknowledge the urgency positively ("We'll make it happen" energy, not "This is going to be difficult").
- Keep it SHORT. 3-5 sentences max for a complete brief, 5-8 sentences if questions needed.
- Sign off with just the PM's first name (no title, no "Best regards").

Return JSON:
{
  "subject": "Re: [original subject]",
  "body": "the reply text — plain text, no HTML, no markdown"
}

Rules: Return valid JSON only. Reply MUST be in the same language as the client email.`;

// ─── Client Matching ────────────────────────────────────────────────────────

/**
 * Try to match a client by the sender's email domain.
 * Looks for clients whose primaryContactEmail shares the same domain.
 */
async function matchClientByDomain(
  senderEmail: string
): Promise<{ id: string; name: string } | null> {
  const domain = senderEmail.split("@")[1]?.toLowerCase();
  if (!domain) return null;

  // Search clients whose primary contact email contains this domain
  const matches = await db
    .select({ id: clients.id, name: clients.name, email: clients.primaryContactEmail })
    .from(clients)
    .where(like(clients.primaryContactEmail, `%@${domain}`));

  if (matches.length > 0) {
    return { id: matches[0].id, name: matches[0].name };
  }

  // Fallback: try matching by client name appearing in the domain
  // e.g., sender from "sony.com" matches client "Sony"
  const allClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients);

  for (const client of allClients) {
    const clientNameLower = client.name.toLowerCase().replace(/\s+/g, "");
    const domainBase = domain.split(".")[0]?.toLowerCase();
    if (domainBase && clientNameLower.includes(domainBase)) {
      return { id: client.id, name: client.name };
    }
    if (domainBase && domainBase.includes(clientNameLower) && clientNameLower.length >= 3) {
      return { id: client.id, name: client.name };
    }
  }

  return null;
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await getUserFromSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 requests per minute (2 parallel LLM calls per request)
  if (!checkRateLimit("email-import", 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email integration not configured" },
      { status: 503 }
    );
  }

  const { messageId } = await params;

  if (!messageId) {
    return NextResponse.json(
      { error: "messageId is required" },
      { status: 400 }
    );
  }

  // Parse optional body for aggregation mode
  let existingBriefId: string | undefined;
  try {
    const rawBody = await _request.json().catch(() => null);
    if (rawBody) {
      const parsed = ImportBodySchema.parse(rawBody);
      existingBriefId = parsed?.existingBriefId;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
  }

  try {
    // 1. Fetch the full email and attachments in parallel
    const [email, attachments] = await Promise.all([
      getEmailById(messageId),
      getEmailAttachments(messageId),
    ]);

    const fromName = email.from.emailAddress.name;
    const fromEmail = email.from.emailAddress.address;
    const bodyText = stripHtml(email.body.content);

    // 2. Match client by sender domain
    const clientMatch = await matchClientByDomain(fromEmail);

    // 3. Extract brief (or aggregate with existing) + generate reply
    const userMessage = `EMAIL:
Subject: ${email.subject}
From: ${fromName} <${fromEmail}>
Body: ${bodyText}`;

    // Aggregation mode: load existing brief and merge with new email
    let existingBriefMarkdown: string | null = null;
    if (existingBriefId) {
      const [existingItem] = await db
        .select({ summary: inboxItems.summary })
        .from(inboxItems)
        .where(eq(inboxItems.id, existingBriefId))
        .limit(1);

      if (existingItem?.summary) {
        try {
          const payload = JSON.parse(existingItem.summary) as Record<string, unknown>;
          // The brief might be in arya_payload.brief.brief_markdown or directly in summary
          const brief = payload.brief as Record<string, unknown> | undefined;
          existingBriefMarkdown = (brief?.brief_markdown as string) ?? null;
        } catch {
          // If parsing fails, try to use summary as-is
          existingBriefMarkdown = existingItem.summary;
        }
      }
    }

    const isAggregation = existingBriefId && existingBriefMarkdown;

    const briefPromptMessage = isAggregation
      ? `EXISTING BRIEF:\n${existingBriefMarkdown}\n\nFOLLOW-UP EMAIL:\n${userMessage}`
      : userMessage;

    const [briefResult, replyResult] = await Promise.allSettled([
      callClaudeJSON<BriefExtraction>({
        systemPrompt: isAggregation
          ? AGGREGATION_SYSTEM_PROMPT
          : EXTRACTION_SYSTEM_PROMPT,
        userMessage: briefPromptMessage,
        model: "claude-haiku-4-5-20251001",
        maxTokens: 1024,
        timeout: isAggregation ? 15_000 : 10_000, // slightly more time for aggregation
      }),
      callClaudeJSON<ClientReply>({
        systemPrompt: REPLY_SYSTEM_PROMPT,
        userMessage: `${userMessage}\n\nClient name: ${clientMatch?.name ?? "Unknown"}\nPM name: Thomas${isAggregation ? "\n\nNote: This is a follow-up email. The client already sent a previous brief. Acknowledge the additional information." : ""}`,
        model: "claude-haiku-4-5-20251001",
        maxTokens: 512,
        timeout: 10_000,
      }),
    ]);

    if (briefResult.status === "rejected") {
      throw briefResult.reason;
    }
    const brief = briefResult.value.data;

    // Reply is non-critical — if it fails, we still return the brief
    let clientReply: ClientReply | null = null;
    if (replyResult.status === "fulfilled") {
      clientReply = replyResult.value.data;
    }

    // 4. Mark email as read (fire-and-forget, non-blocking)
    markEmailAsRead(messageId).catch((err) => {
      console.error("[Email Import] Failed to mark as read:", err);
    });

    // 5. Build response
    const response: ImportResponse = {
      email: {
        id: email.id,
        subject: email.subject,
        from: fromName,
        fromEmail,
        receivedDateTime: email.receivedDateTime,
      },
      clientMatch,
      brief,
      attachments: attachments.map((a) => ({
        id: a.id,
        name: a.name,
        contentType: a.contentType,
        size: a.size,
      })),
      clientReply,
      ...(isAggregation ? { aggregated: true, existingBriefId } : {}),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Email Import] Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to import email";

    // Surface timeout errors clearly
    if (message.toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { error: "AI analysis timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
