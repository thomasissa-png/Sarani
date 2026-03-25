import { z } from "zod";

// ─── Presentation types ─────────────────────────────────────────────────────

export const PRESENTATION_TYPES = [
  "pitch-deck",
  "project-update",
  "campaign-results",
  "company-overview",
  "product-launch",
  "training",
  "workshop",
] as const;

export type PresentationType = (typeof PRESENTATION_TYPES)[number];

export const PRESENTATION_TYPE_LABELS: Record<PresentationType, string> = {
  "pitch-deck": "Pitch Deck",
  "project-update": "Project Update",
  "campaign-results": "Campaign Results",
  "company-overview": "Company Overview",
  "product-launch": "Product Launch",
  "training": "Training",
  "workshop": "Workshop",
};

// ─── Languages ───────────────────────────────────────────────────────────────

export const PRESENTATION_LANGUAGES = [
  "English",
  "French",
  "Italian",
  "Spanish",
  "German",
  "Arabic",
  "Portuguese",
  "Japanese",
  "Chinese",
  "Korean",
] as const;

export type PresentationLanguage = (typeof PRESENTATION_LANGUAGES)[number];

// ─── Generate request ────────────────────────────────────────────────────────

export const presentationGenerateSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  presentationType: z.enum(PRESENTATION_TYPES, {
    error: "Select a presentation type",
  }),
  topic: z
    .string()
    .min(10, "Topic must be at least 10 characters")
    .max(500, "Topic must be under 500 characters"),
  audienceDescription: z
    .string()
    .min(5, "Audience description must be at least 5 characters")
    .max(300, "Audience description must be under 300 characters"),
  slideCount: z
    .number()
    .int()
    .min(5, "Minimum 5 slides")
    .max(40, "Maximum 40 slides"),
  language: z.enum(PRESENTATION_LANGUAGES).default("English"),
  keyMessages: z.string().max(1000, "Key messages must be under 1000 characters").optional(),
  includeData: z.boolean().default(false),
});

export type PresentationGenerateInput = z.infer<
  typeof presentationGenerateSchema
>;

// ─── Claude presentation response schemas ────────────────────────────────────

export const presentationSlideSchema = z.object({
  slideNumber: z.number().int().positive(),
  title: z.string(),
  bullets: z.array(z.string()).max(5),
  speakerNotes: z.string(),
  visualSuggestion: z.string(),
});

export const presentationOutputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  totalSlides: z.number().int().positive(),
  slides: z.array(presentationSlideSchema).min(1),
  summary: z.string(),
});

export type PresentationSlide = z.infer<typeof presentationSlideSchema>;
export type PresentationOutput = z.infer<typeof presentationOutputSchema>;
