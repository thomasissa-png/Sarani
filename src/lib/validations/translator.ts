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

// ─── Review request ──────────────────────────────────────────────────────────

export const reviewRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  textToReview: z
    .string()
    .min(10, "Text to review must be at least 10 characters")
    .max(100_000, "Text is too long (max 100,000 characters)"),
  textLanguage: z.enum(SUPPORTED_LANGUAGES, {
    message: "Unsupported language",
  }),
  contextNote: z.string().max(2000).optional(),
});

export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;

// ─── Claude review response ──────────────────────────────────────────────────

export const reviewIssueSchema = z.object({
  severity: z.enum(["critical", "major", "minor"]),
  category: z.enum([
    "terminology",
    "glossary",
    "brandVoice",
    "grammar",
    "omission",
    "cultural",
    "formatting",
  ]),
  originalText: z.string(),
  suggestion: z.string(),
  explanation: z.string(),
});

export const glossaryViolationSchema = z.object({
  expectedTerm: z.string(),
  foundTerm: z.string(),
  sourceTerm: z.string(),
});

export const inconsistentTermSchema = z.object({
  term: z.string(),
  translations: z.array(z.string()),
  recommendation: z.string(),
});

export const reviewResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  overallAssessment: z.string(),
  issues: z.array(reviewIssueSchema),
  glossaryCompliance: z.object({
    totalTermsChecked: z.number(),
    compliantTerms: z.number(),
    violations: z.array(glossaryViolationSchema),
  }),
  consistencyReport: z.object({
    inconsistentTerms: z.array(inconsistentTermSchema),
  }),
  toneAssessment: z.object({
    detectedRegister: z.enum(["formal", "standard", "mixed"]),
    brandVoiceAlignment: z.string(),
    notes: z.string(),
  }),
  wordCount: z.number(),
});

export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
export type ReviewIssue = z.infer<typeof reviewIssueSchema>;
