import { z } from "zod";

// ─── Video formats ──────────────────────────────────────────────────────────

export const VIDEO_FORMATS = [
  "tiktok-15s",
  "tiktok-30s",
  "tiktok-60s",
  "instagram-reel",
  "youtube-short",
  "youtube-long",
  "corporate",
  "ugc-brief",
  "product-demo",
] as const;

export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  "tiktok-15s": "TikTok 15s",
  "tiktok-30s": "TikTok 30s",
  "tiktok-60s": "TikTok 60s",
  "instagram-reel": "Instagram Reel",
  "youtube-short": "YouTube Short",
  "youtube-long": "YouTube Long-form",
  corporate: "Corporate Video",
  "ugc-brief": "UGC Brief",
  "product-demo": "Product Demo",
};

// ─── Platforms ──────────────────────────────────────────────────────────────

export const VIDEO_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "linkedin",
  "website",
] as const;

export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

export const VIDEO_PLATFORM_LABELS: Record<VideoPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  website: "Website",
};

// ─── Tones ──────────────────────────────────────────────────────────────────

export const VIDEO_TONES = [
  "entertaining",
  "educational",
  "inspirational",
  "promotional",
] as const;

export type VideoTone = (typeof VIDEO_TONES)[number];

export const VIDEO_TONE_LABELS: Record<VideoTone, string> = {
  entertaining: "Entertaining",
  educational: "Educational",
  inspirational: "Inspirational",
  promotional: "Promotional",
};

// ─── Languages ──────────────────────────────────────────────────────────────

export const VIDEO_LANGUAGES = [
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

export type VideoLanguage = (typeof VIDEO_LANGUAGES)[number];

export const VIDEO_LANGUAGE_LABELS: Record<VideoLanguage, string> = {
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

export const videoScriptGenerateRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  videoFormat: z.enum(VIDEO_FORMATS, {
    message: "Unsupported video format",
  }),
  platform: z.enum(VIDEO_PLATFORMS, {
    message: "Unsupported platform",
  }),
  topic: z
    .string()
    .min(1, "Topic is required")
    .max(2000, "Topic is too long (max 2,000 characters)"),
  targetAudience: z
    .string()
    .max(500, "Target audience too long (max 500 characters)")
    .optional()
    .default(""),
  tone: z.enum(VIDEO_TONES, {
    message: "Unsupported tone",
  }),
  keyMessages: z
    .string()
    .max(5000, "Key messages too long (max 5,000 characters)")
    .optional()
    .default(""),
  language: z.enum(VIDEO_LANGUAGES, {
    message: "Unsupported language",
  }),
  variantCount: z.coerce.number().int().min(1).max(3).default(1),
});

export type VideoScriptGenerateRequestInput = z.infer<
  typeof videoScriptGenerateRequestSchema
>;

// ─── Claude video script response ───────────────────────────────────────────

export const videoSceneSchema = z.object({
  sceneNumber: z.number(),
  duration: z.string(),
  action: z.string(),
  dialogue: z.string().nullable(),
  visualDirection: z.string(),
  audio: z.string(),
});

export const videoVariantSchema = z.object({
  variantLabel: z.string(),
  concept: z.string(),
  hook: z.string(),
  scenes: z.array(videoSceneSchema),
  callToAction: z.string(),
  totalDuration: z.string(),
  notes: z.string().optional().default(""),
});

export const videoScriptResponseSchema = z.object({
  concept: z.string(),
  hook: z.string(),
  scenes: z.array(videoSceneSchema).min(1),
  callToAction: z.string(),
  totalDuration: z.string(),
  hashtags: z.array(z.string()),
  musicSuggestion: z.string(),
  notes: z.string().optional().default(""),
  variants: z.array(videoVariantSchema),
});

export type VideoScriptResponse = z.infer<typeof videoScriptResponseSchema>;
export type VideoScene = z.infer<typeof videoSceneSchema>;
export type VideoVariant = z.infer<typeof videoVariantSchema>;

// ─── History request ────────────────────────────────────────────────────────

export const videoScriptHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type VideoScriptHistoryInput = z.infer<
  typeof videoScriptHistorySchema
>;
