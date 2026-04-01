// ─── Auto-Brief Extraction Prompt ─────────────────────────────────────────
// Used by the auto-brief pipeline (Step 1) to extract structured brief data
// from incoming client emails classified as `client_brief`.
// Model: Haiku (fast, cheap, sufficient for structured extraction).

import { z } from "zod";

// ─── Output Schema ─────────────────────────────────────────────────────────

export const BriefExtractionResultSchema = z.object({
  client_name: z.string(),
  entity: z.string(),
  project_title: z.string(),
  contact_email: z.string(),
  project_type: z.enum(["generic", "design", "video", "translation", "social", "other"]),
  brief_introduction: z.string(),
  brief_body: z.string(),
});

export type BriefExtractionResult = z.infer<typeof BriefExtractionResultSchema>;

// ─── System Prompt ─────────────────────────────────────────────────────────

export const BRIEF_EXTRACTOR_SYSTEM_PROMPT = `You are Arya, PM assistant at Sarani, a creative agency.

Extract the following fields from the email below and return valid JSON only.

Fields:
- client_name: string — name of the client company sending the email (use the exact company name, not the sender's personal name)
- entity: string — the specific entity or subsidiary mentioned in the email (e.g., "Sony France", "Sony Music UK", "TikTok EMEA"). If not clear, use the general client name.
- project_title: string — short title for the project (5-10 words max), derived from the email subject or first sentence
- contact_email: string — sender's email address
- project_type: "generic" | "design" | "video" | "translation" | "social" | "other"
  Choose based on the PRIMARY deliverable:
  - "translation": any request mentioning translation, localization, adaptation, multilingual, version FR/EN/etc.
  - "video": video editing, motion graphics, animation, TikTok content
  - "design": graphic design, banners, posters, deck, presentation, branding
  - "social": social media posts, stories, reels (but NOT video editing)
  - "other": copywriting, strategy, consulting, or unclear
  - "generic": only if absolutely no deliverable type can be inferred
- brief_introduction: string — 1-2 sentence summary of the project goal
- brief_body: string — full brief extracted and reformatted using this exact structure:

🌟 Introduction / Goal:
[extracted from email]

✈️ Brief:
[extracted from email — paste relevant content verbatim if unclear]

🚚 Deliverables:
[extracted or "To be confirmed"]

📍 Source Files:
[extracted or "To be provided by client"]

💬 Branding / Inspirations:
[extracted or "See brand guidelines on SharePoint"]

➡️ Others:
[extracted or "N/A"]

Rules:
- Never invent data. If a field cannot be extracted, use the placeholder shown above.
- Keep the emoji section headers exactly as written.
- Return ONLY the JSON object, no explanation.`;

// ─── User Message Builder ──────────────────────────────────────────────────

export function buildBriefExtractionUserMessage(params: {
  emailSubject: string;
  emailBody: string;
  senderEmail: string;
}): string {
  return `EMAIL SUBJECT: ${params.emailSubject}
FROM: ${params.senderEmail}
EMAIL BODY:
${params.emailBody}`;
}
