import { z } from "zod";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./translator";

// Re-export for convenience
export { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, type SupportedLanguage } from "./translator";

// ─── Email types ─────────────────────────────────────────────────────────────

export const EMAIL_TYPES = [
  "brief-confirmation",
  "status-update",
  "delivery",
  "feedback-request",
  "follow-up",
  "meeting-request",
  "revision-response",
  "thank-you",
  "introduction",
  "custom",
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  "brief-confirmation": "Brief Confirmation",
  "status-update": "Status Update",
  delivery: "Delivery",
  "feedback-request": "Feedback Request",
  "follow-up": "Follow-up",
  "meeting-request": "Meeting Request",
  "revision-response": "Revision Response",
  "thank-you": "Thank You",
  introduction: "Introduction",
  custom: "Custom",
};

// ─── Tone ────────────────────────────────────────────────────────────────────

export const EMAIL_TONES = ["formal", "friendly", "urgent"] as const;

export type EmailTone = (typeof EMAIL_TONES)[number];

export const EMAIL_TONE_LABELS: Record<EmailTone, string> = {
  formal: "Formal",
  friendly: "Friendly",
  urgent: "Urgent",
};

// ─── Generate request ────────────────────────────────────────────────────────

export const emailDrafterRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  emailType: z.enum(EMAIL_TYPES, {
    message: "Invalid email type",
  }),
  context: z
    .string()
    .min(10, "Context must be at least 10 characters")
    .max(5_000, "Context is too long (max 5,000 characters)"),
  recipientName: z.string().max(100).optional(),
  recipientRole: z.string().max(100).optional(),
  language: z.enum(SUPPORTED_LANGUAGES, {
    message: "Unsupported language",
  }),
  tone: z.enum(EMAIL_TONES, {
    message: "Invalid tone",
  }),
  includeAttachmentMention: z.boolean().default(false),
  variantCount: z.number().int().min(1).max(3).default(1),
});

export type EmailDrafterRequestInput = z.infer<typeof emailDrafterRequestSchema>;

// ─── Claude email drafter response ───────────────────────────────────────────

export const emailVariantSchema = z.object({
  label: z.string(),
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  callToAction: z.string(),
  closing: z.string(),
});

export const emailDrafterResponseSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  callToAction: z.string(),
  closing: z.string(),
  signature: z.string(),
  language: z.string(),
  wordCount: z.number(),
  variants: z.array(emailVariantSchema),
});

export type EmailDrafterResponse = z.infer<typeof emailDrafterResponseSchema>;
export type EmailVariant = z.infer<typeof emailVariantSchema>;

// ─── History request ─────────────────────────────────────────────────────────

export const emailDrafterHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type EmailDrafterHistoryInput = z.infer<typeof emailDrafterHistorySchema>;
