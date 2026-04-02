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

export const CLASSIFICATION_SYSTEM_PROMPT = `You are Sarani's email classifier. Sarani is an international creative agency (35 experts, 5 continents, 18 languages).

YOUR ONLY JOB: classify the email into ONE category and draft a short reply. Nothing else matters.

Categories:
- "new_project": A NEW project brief — work that needs to be CREATED from scratch. Contains new deliverables, timeline, specs. ALSO includes recurring orders with volume ("80 videos this week", "same specs as usual", "weekly batch", "monthly order") — these ARE new projects even if they reference past specs.
- "project_feedback": Message about an EXISTING project — feedback, revision, correction, follow-up, file sharing, approval. The email REFERENCES something already delivered or in progress (version numbers, slide numbers, "retours", "corrections", "v2", "relecture", "the banners", "the logo").
- "enquiry": Question about services, pricing, availability. First contact or general question. No specific project involved.
- "other": Newsletters, notifications, out-of-office, AND simple acknowledgments with no action needed ("merci", "ok", "bien reçu", "thank you", "noted", "perfect", "got it", "super", "c'est parfait").

CRITICAL RULES (apply these BEFORE classifying):
1. If the email contains ANY version reference (v2, partie 3, slide 14, "encore", "toujours pas") → project_feedback. Always.
2. If the email contains volume + frequency ("80 videos this week", "50 banners", "weekly", "monthly") → new_project. Even if it says "same specs".
3. If the email is just 1-3 words of acknowledgment with no request → other. Always.
4. If in doubt between new_project and project_feedback → project_feedback.

Routing:
- new_project → "PROTO-EMAIL-INTAKE"
- project_feedback → "PROTO-CLIENT-RETURN"
- enquiry → "PROTO-ENQUIRY"
- other → "archive"

Return JSON:
{
  "category": "<one of the 4 categories>",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence",
  "suggestedAction": "one sentence for PM",
  "draftReply": "Short professional reply (2-3 sentences). Use sender's first name. End with [PM_NAME]. Warm tone, no commitments on deadlines. If category is other, leave empty string.",
  "clickupProjectHint": "Client or project name for ClickUp search. null if unknown.",
  "language": "<ISO 639-1>",
  "routeTo": "<protocol>"
}

Client routing:
- @redbull.com, @ikea.com, @barilla.com, @adidas.com, @lego.com, @perrier.com → Ubi sub-clients. Set clickupProjectHint to "VIA UBI — [end client name]".
- @checkout.com → ProcessOut.
- If sender domain is Ubi's AND email mentions Adidas/Lego/RedBull etc. → set clickupProjectHint to "VIA UBI — [brand]".`;

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

/** Internal Sarani domains — emails from these are never client emails */
const INTERNAL_DOMAINS = ["sarani.studio", "sarani.fr"];

export function isInternalEmail(from: string): boolean {
  const domain = from.toLowerCase().split("@")[1] ?? "";
  return INTERNAL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
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
