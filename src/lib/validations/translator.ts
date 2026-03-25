import { z } from "zod";

// ─── Supported languages ────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
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
  "RU",
  "NL",
  "PL",
  "SV",
  "DA",
  "NO",
  "FI",
  "TR",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
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
  RU: "Russian",
  NL: "Dutch",
  PL: "Polish",
  SV: "Swedish",
  DA: "Danish",
  NO: "Norwegian",
  FI: "Finnish",
  TR: "Turkish",
};

// ─── Translate request ──────────────────────────────────────────────────────

export const translateRequestSchema = z
  .object({
    clientId: z.string().uuid("Invalid client ID").optional(),
    sourceLanguage: z.enum(SUPPORTED_LANGUAGES, {
      message: "Unsupported source language",
    }),
    targetLanguage: z.enum(SUPPORTED_LANGUAGES, {
      message: "Unsupported target language",
    }),
    inputText: z
      .string()
      .min(1, "Input text is required")
      .max(100_000, "Input text is too long (max 100,000 characters)"),
    formalRegister: z.boolean().default(false),
  })
  .refine((data) => data.sourceLanguage !== data.targetLanguage, {
    message: "Source and target language must be different",
    path: ["targetLanguage"],
  });

export type TranslateRequestInput = z.infer<typeof translateRequestSchema>;

// ─── Claude translator response ─────────────────────────────────────────────

export const glossaryHitSchema = z.object({
  sourceTerm: z.string(),
  targetTerm: z.string(),
  languagePair: z.string(),
});

export const translatorResponseSchema = z.object({
  translatedText: z.string(),
  glossaryHits: z.array(glossaryHitSchema),
  notes: z.array(z.string()),
  detectedRegister: z.enum(["formal", "standard", "mixed"]),
  wordCount: z.object({
    source: z.number(),
    target: z.number(),
  }),
});

export type TranslatorResponse = z.infer<typeof translatorResponseSchema>;
export type GlossaryHit = z.infer<typeof glossaryHitSchema>;

// ─── History request ────────────────────────────────────────────────────────

export const translatorHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TranslatorHistoryInput = z.infer<typeof translatorHistorySchema>;
