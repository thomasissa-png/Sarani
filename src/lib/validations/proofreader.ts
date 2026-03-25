import { z } from "zod";

// ─── Content types ──────────────────────────────────────────────────────────

export const CONTENT_TYPES = [
  "translation",
  "social-post",
  "article",
  "email",
  "contract",
  "presentation",
  "ad-copy",
  "other",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  translation: "Translation",
  "social-post": "Social Media Post",
  article: "Article / Blog Post",
  email: "Email",
  contract: "Contract / Legal",
  presentation: "Presentation",
  "ad-copy": "Ad Copy",
  other: "Other",
};

// ─── Supported languages (reuse from translator) ────────────────────────────

export const PROOFREADER_LANGUAGES = [
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

export type ProofreaderLanguage = (typeof PROOFREADER_LANGUAGES)[number];

export const PROOFREADER_LANGUAGE_LABELS: Record<ProofreaderLanguage, string> = {
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

// ─── Review request ─────────────────────────────────────────────────────────

export const proofreadRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  contentToReview: z
    .string()
    .min(1, "Content to review is required")
    .max(100_000, "Content is too long (max 100,000 characters)"),
  contentType: z.enum(CONTENT_TYPES, {
    message: "Invalid content type",
  }),
  sourceLanguage: z.enum(PROOFREADER_LANGUAGES, {
    message: "Unsupported language",
  }),
  checkBrand: z.boolean().default(false),
  checkGlossary: z.boolean().default(false),
});

export type ProofreadRequestInput = z.infer<typeof proofreadRequestSchema>;

// ─── Claude proofreader response ────────────────────────────────────────────

export const proofreadIssueSchema = z.object({
  type: z.enum([
    "spelling",
    "grammar",
    "punctuation",
    "style",
    "tone",
    "terminology",
    "brand",
    "consistency",
    "factual",
    "formatting",
  ]),
  severity: z.enum(["error", "warning", "suggestion"]),
  location: z.string(),
  original: z.string(),
  suggestion: z.string(),
  explanation: z.string(),
});

export const glossaryViolationSchema = z.object({
  term: z.string(),
  expected: z.string(),
  found: z.string(),
  location: z.string(),
});

export const proofreadResponseSchema = z.object({
  overallScore: z.number().min(0).max(10),
  issues: z.array(proofreadIssueSchema),
  brandConsistency: z.object({
    score: z.number().min(0).max(10),
    notes: z.array(z.string()),
  }),
  glossaryCompliance: z.object({
    score: z.number().min(0).max(10),
    violations: z.array(glossaryViolationSchema),
  }),
  improvedVersion: z.string(),
  summary: z.string(),
});

export type ProofreadResponse = z.infer<typeof proofreadResponseSchema>;
export type ProofreadIssue = z.infer<typeof proofreadIssueSchema>;
export type GlossaryViolation = z.infer<typeof glossaryViolationSchema>;

// ─── History request ────────────────────────────────────────────────────────

export const proofreaderHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ProofreaderHistoryInput = z.infer<typeof proofreaderHistorySchema>;
