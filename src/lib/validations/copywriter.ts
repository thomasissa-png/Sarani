import { z } from "zod";
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from "./translator";

// Re-export language utilities for convenience
export { SUPPORTED_LANGUAGES, LANGUAGE_LABELS };
export type { SupportedLanguage } from "./translator";

// ─── Content types ─────────────────────────────────────────────────────────

export const CONTENT_TYPES = [
  "email",
  "tagline",
  "ad-copy",
  "press-release",
  "product-description",
  "brand-manifesto",
  "presentation-script",
  "email-sequence",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  email: "Email",
  tagline: "Tagline",
  "ad-copy": "Ad Copy",
  "press-release": "Press Release",
  "product-description": "Product Description",
  "brand-manifesto": "Brand Manifesto",
  "presentation-script": "Presentation Script",
  "email-sequence": "Email Sequence",
};

// ─── Copywriter request ────────────────────────────────────────────────────

export const copywriterRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  contentType: z.enum(CONTENT_TYPES, {
    message: "Invalid content type",
  }),
  topic: z
    .string()
    .min(1, "Topic is required")
    .max(5_000, "Topic is too long (max 5,000 characters)"),
  targetAudience: z
    .string()
    .min(1, "Target audience is required")
    .max(1_000, "Target audience is too long (max 1,000 characters)"),
  tone: z
    .string()
    .max(500, "Tone override is too long (max 500 characters)")
    .optional(),
  language: z.enum(SUPPORTED_LANGUAGES, {
    message: "Unsupported language",
  }),
  keyMessages: z
    .string()
    .max(5_000, "Key messages are too long (max 5,000 characters)")
    .optional(),
  variantCount: z.coerce.number().int().min(1).max(5).default(1),
});

export type CopywriterRequestInput = z.infer<typeof copywriterRequestSchema>;

// ─── Claude copywriter response ────────────────────────────────────────────

export const copywriterVariantSchema = z.object({
  headline: z.string(),
  body: z.string(),
});

export const copywriterResponseSchema = z.object({
  contentType: z.string(),
  headline: z.string(),
  body: z.string(),
  variants: z.array(copywriterVariantSchema),
  callToAction: z.string(),
  toneUsed: z.string(),
  wordCount: z.number(),
  notes: z.array(z.string()),
});

export type CopywriterResponse = z.infer<typeof copywriterResponseSchema>;
export type CopywriterVariant = z.infer<typeof copywriterVariantSchema>;

// ─── History request ───────────────────────────────────────────────────────

export const copywriterHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CopywriterHistoryInput = z.infer<typeof copywriterHistorySchema>;
