// ─── Centralized Email Classification Prompt ──────────────────────────────
// Single source of truth for email classification across all routes:
// - /api/admin/emails/classify
// - /api/admin/cron/poll-emails
// Used by Haiku for fast, cheap classification.

import { z } from "zod";

// ─── Types ─────────────────────────────────────────────────────────────────

export type EmailCategory = "enquiry" | "new_project" | "project_feedback" | "other";

export type RouteTo = "PROTO-ENQUIRY" | "PROTO-EMAIL-INTAKE" | "PROTO-CLIENT-RETURN" | "archive";

export interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  draftReply: string;
  clickupProjectHint: string | null;
  language: string;
  routeTo: RouteTo;
}

// ─── Zod Schema ────────────────────────────────────────────────────────────

export const ClassificationResultSchema = z.object({
  category: z.enum(["enquiry", "new_project", "project_feedback", "other"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedAction: z.string(),
  draftReply: z.string(),
  clickupProjectHint: z.string().nullable(),
  language: z.string().min(2).max(5),
  routeTo: z.enum(["PROTO-ENQUIRY", "PROTO-EMAIL-INTAKE", "PROTO-CLIENT-RETURN", "archive"]),
});

// ─── System Prompt ─────────────────────────────────────────────────────────

export const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier and reply assistant. Sarani is an international creative agency (35 experts, 5 continents, 18 languages). Classify the following email into exactly ONE category, detect its language, and draft a professional reply.

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
  "draftReply": "Complete email reply ready to send (see tone rules below).",
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
- clickupProjectHint: extract the client or company name for new_project and project_feedback categories (e.g., "Sony Music France", "TikTok"). Return null only for enquiries from unknown senders and other/noise.

Sarani tone rules for draftReply:
- Dynamic, warm, available — NOT corporate. Use short sentences, action verbs. Example: "Got it — we're on it!" not "We acknowledge receipt of your request."
- MUST use the client's first name in the greeting (extract from the "From" field).
- MUST end with "[PM_NAME]" as placeholder signature, not "The Sarani Team".
- MUST NEVER commit to specific deadlines, turnaround times, or deliverables unless explicitly confirmed. Use "we'll review and get back to you shortly" instead of "we'll have this ready by tomorrow".
- MUST NEVER promise free work, discounts, or special conditions.`;

// ─── Noise filters ─────────────────────────────────────────────────────────

export const NOISE_SENDERS = [
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

export function isNoiseByEmail(from: string): boolean {
  const lower = from.toLowerCase();
  return NOISE_SENDERS.some((pattern) => lower.includes(pattern));
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function priorityFromCategory(category: EmailCategory): "high" | "medium" | "low" {
  switch (category) {
    case "new_project": return "high";
    case "project_feedback": return "high";
    case "enquiry": return "medium";
    case "other": return "low";
  }
}

export function protocolFromCategory(category: EmailCategory): string | null {
  switch (category) {
    case "new_project": return "PROTO-EMAIL-INTAKE";
    case "project_feedback": return "PROTO-CLIENT-RETURN";
    case "enquiry": return "PROTO-ENQUIRY";
    case "other": return null;
  }
}
