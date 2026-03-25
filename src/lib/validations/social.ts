import { z } from "zod";

// ─── Supported platforms ────────────────────────────────────────────────────

export const SOCIAL_PLATFORMS = ["linkedin", "instagram", "tiktok", "x"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X (Twitter)",
};

// ─── Content types ──────────────────────────────────────────────────────────

export const CONTENT_TYPES = ["post", "carousel", "story", "thread"] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  post: "Post",
  carousel: "Carousel",
  story: "Story",
  thread: "Thread",
};

// ─── Platform-content type compatibility ────────────────────────────────────

export const PLATFORM_CONTENT_TYPES: Record<SocialPlatform, ContentType[]> = {
  linkedin: ["post", "carousel", "thread"],
  instagram: ["post", "carousel", "story"],
  tiktok: ["post", "story"],
  x: ["post", "thread"],
};

// ─── Supported languages ────────────────────────────────────────────────────

export const SOCIAL_LANGUAGES = [
  "FR",
  "EN",
  "IT",
  "ES",
  "DE",
  "PT",
  "AR",
  "ZH",
  "JA",
  "KO",
  "NL",
  "TR",
] as const;

export type SocialLanguage = (typeof SOCIAL_LANGUAGES)[number];

export const SOCIAL_LANGUAGE_LABELS: Record<SocialLanguage, string> = {
  FR: "French",
  EN: "English",
  IT: "Italian",
  ES: "Spanish",
  DE: "German",
  PT: "Portuguese",
  AR: "Arabic",
  ZH: "Chinese",
  JA: "Japanese",
  KO: "Korean",
  NL: "Dutch",
  TR: "Turkish",
};

// ─── Generate request ───────────────────────────────────────────────────────

export const socialGenerateRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  platform: z.enum(SOCIAL_PLATFORMS, {
    message: "Unsupported platform",
  }),
  contentType: z.enum(CONTENT_TYPES, {
    message: "Unsupported content type",
  }),
  topic: z
    .string()
    .min(1, "Topic is required")
    .max(2000, "Topic is too long (max 2,000 characters)"),
  keyMessages: z
    .string()
    .max(5000, "Key messages too long (max 5,000 characters)")
    .optional()
    .default(""),
  tone: z
    .string()
    .max(200, "Tone override too long (max 200 characters)")
    .optional()
    .default(""),
  language: z.enum(SOCIAL_LANGUAGES, {
    message: "Unsupported language",
  }),
  variantCount: z.coerce.number().int().min(1).max(5).default(1),
});

export type SocialGenerateRequestInput = z.infer<typeof socialGenerateRequestSchema>;

// ─── Claude social response ─────────────────────────────────────────────────

export const socialSlideSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  body: z.string(),
});

export const socialPostSchema = z.object({
  content: z.string(),
  hashtags: z.array(z.string()),
  characterCount: z.number(),
  slides: z.array(socialSlideSchema).nullable().optional(),
  hookLine: z.string(),
  cta: z.string(),
  notes: z.string().optional().default(""),
});

export const socialResponseSchema = z.object({
  posts: z.array(socialPostSchema).min(1),
  platformTips: z.array(z.string()),
  suggestedPostingTime: z.string(),
  contentStrategy: z.string(),
});

export type SocialResponse = z.infer<typeof socialResponseSchema>;
export type SocialPost = z.infer<typeof socialPostSchema>;
export type SocialSlide = z.infer<typeof socialSlideSchema>;

// ─── History request ────────────────────────────────────────────────────────

export const socialHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SocialHistoryInput = z.infer<typeof socialHistorySchema>;
