import { z } from "zod";

// ─── Content types ──────────────────────────────────────────────────────────

export const SEO_CONTENT_TYPES = [
  "article",
  "meta-description",
  "keyword-research",
  "blog-outline",
] as const;

export type SeoContentType = (typeof SEO_CONTENT_TYPES)[number];

export const SEO_CONTENT_TYPE_LABELS: Record<SeoContentType, string> = {
  article: "Article",
  "meta-description": "Meta Description",
  "keyword-research": "Keyword Research",
  "blog-outline": "Blog Outline",
};

// ─── Supported languages ────────────────────────────────────────────────────

export const SEO_LANGUAGES = [
  "EN",
  "FR",
  "IT",
  "ES",
  "DE",
  "PT",
  "NL",
  "SV",
  "DA",
  "NO",
  "FI",
  "PL",
  "TR",
  "AR",
  "ZH",
  "JA",
  "KO",
  "RU",
] as const;

export type SeoLanguage = (typeof SEO_LANGUAGES)[number];

export const SEO_LANGUAGE_LABELS: Record<SeoLanguage, string> = {
  EN: "English",
  FR: "French",
  IT: "Italian",
  ES: "Spanish",
  DE: "German",
  PT: "Portuguese",
  NL: "Dutch",
  SV: "Swedish",
  DA: "Danish",
  NO: "Norwegian",
  FI: "Finnish",
  PL: "Polish",
  TR: "Turkish",
  AR: "Arabic",
  ZH: "Chinese",
  JA: "Japanese",
  KO: "Korean",
  RU: "Russian",
};

// ─── Word count options ─────────────────────────────────────────────────────

export const WORD_COUNT_OPTIONS = [500, 1000, 1500, 2000] as const;

export type WordCountOption = (typeof WORD_COUNT_OPTIONS)[number];

// ─── Generate request ───────────────────────────────────────────────────────

export const seoGenerateRequestSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  contentType: z.enum(SEO_CONTENT_TYPES, {
    message: "Invalid content type",
  }),
  targetKeyword: z
    .string()
    .min(1, "Target keyword is required")
    .max(200, "Target keyword is too long (max 200 characters)"),
  secondaryKeywords: z
    .string()
    .max(1000, "Secondary keywords are too long (max 1000 characters)")
    .default(""),
  language: z.enum(SEO_LANGUAGES, {
    message: "Unsupported language",
  }),
  wordCount: z.coerce
    .number()
    .int()
    .min(300, "Minimum word count is 300")
    .max(5000, "Maximum word count is 5000")
    .default(1000),
  topic: z
    .string()
    .min(1, "Topic/brief is required")
    .max(5000, "Topic is too long (max 5000 characters)"),
});

export type SeoGenerateRequestInput = z.infer<typeof seoGenerateRequestSchema>;

// ─── Claude SEO responses ───────────────────────────────────────────────────

// Article response
export const seoArticleResponseSchema = z.object({
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  content: z.string(),
  keywordDensity: z.object({
    targetKeyword: z.object({
      count: z.number(),
      percentage: z.string(),
    }),
    secondaryKeywords: z.array(
      z.object({
        keyword: z.string(),
        count: z.number(),
        percentage: z.string(),
      })
    ),
  }),
  internalLinkingSuggestions: z.array(
    z.object({
      anchorText: z.string(),
      targetPage: z.string(),
      context: z.string(),
    })
  ),
  wordCount: z.number(),
  readabilityScore: z.enum(["easy", "moderate", "advanced"]),
  seoScore: z.object({
    overall: z.number(),
    details: z.object({
      keywordInTitle: z.boolean(),
      keywordInFirstParagraph: z.boolean(),
      keywordInH2: z.boolean(),
      metaDescriptionLength: z.boolean(),
      headingHierarchy: z.boolean(),
      contentLength: z.boolean(),
      internalLinks: z.boolean(),
    }),
  }),
  notes: z.array(z.string()),
});

export type SeoArticleResponse = z.infer<typeof seoArticleResponseSchema>;

// Meta description response
export const seoMetaDescriptionResponseSchema = z.object({
  variants: z.array(
    z.object({
      text: z.string(),
      charCount: z.number(),
      angle: z.enum(["benefit", "question", "action"]),
    })
  ),
  targetKeywordIncluded: z.boolean(),
  notes: z.array(z.string()),
});

export type SeoMetaDescriptionResponse = z.infer<
  typeof seoMetaDescriptionResponseSchema
>;

// Keyword research response
export const seoKeywordResearchResponseSchema = z.object({
  targetKeyword: z.string(),
  longTailKeywords: z.array(
    z.object({
      keyword: z.string(),
      searchIntent: z.enum([
        "informational",
        "navigational",
        "transactional",
        "commercial",
      ]),
      difficulty: z.enum(["low", "medium", "high"]),
    })
  ),
  semanticKeywords: z.array(
    z.object({
      keyword: z.string(),
      relevance: z.enum(["high", "medium"]),
    })
  ),
  questionKeywords: z.array(
    z.object({
      keyword: z.string(),
      searchIntent: z.string(),
    })
  ),
  topicClusters: z.array(
    z.object({
      clusterName: z.string(),
      keywords: z.array(z.string()),
    })
  ),
  notes: z.array(z.string()),
});

export type SeoKeywordResearchResponse = z.infer<
  typeof seoKeywordResearchResponseSchema
>;

// Blog outline response
export const seoBlogOutlineResponseSchema = z.object({
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      level: z.number(),
      description: z.string(),
      suggestedWordCount: z.number(),
      keywordsToInclude: z.array(z.string()),
      subsections: z
        .array(
          z.object({
            heading: z.string(),
            level: z.number(),
            description: z.string(),
            suggestedWordCount: z.number(),
          })
        )
        .default([]),
    })
  ),
  totalSuggestedWordCount: z.number(),
  internalLinkingSuggestions: z.array(
    z.object({
      anchorText: z.string(),
      targetPage: z.string(),
      section: z.string(),
    })
  ),
  notes: z.array(z.string()),
});

export type SeoBlogOutlineResponse = z.infer<
  typeof seoBlogOutlineResponseSchema
>;

// Union type for all SEO responses
export type SeoResponse =
  | SeoArticleResponse
  | SeoMetaDescriptionResponse
  | SeoKeywordResearchResponse
  | SeoBlogOutlineResponse;

// ─── History request ────────────────────────────────────────────────────────

export const seoHistorySchema = z.object({
  clientId: z.string().uuid("Invalid client ID").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SeoHistoryInput = z.infer<typeof seoHistorySchema>;
