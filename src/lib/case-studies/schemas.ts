import { z } from "zod";

// ─── Zod schemas for case study output validation ─────────────────────────

const CaseStudyCategorySchema = z.enum([
  "Video & Social",
  "Graphic Design",
  "Event",
  "Multilingual",
  "Out-of-Home",
]);

const CaseStudyStatSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const CaseStudyOutputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  client: z.string().min(1),
  deliverable: z.string().min(1),
  volume: z.string().optional().default(""),
  turnaround: z.string().optional().default(""),
  outcome: z.string().min(1),
  brief: z.string().min(10),
  result: z.string().min(10),
  headline: z.string().min(5),
  keyMetric: z.string().min(1),
  stats: z.tuple([CaseStudyStatSchema, CaseStudyStatSchema, CaseStudyStatSchema]),
  metaDescription: z.string().min(50).max(160),
  category: CaseStudyCategorySchema,
  subtitle: z.string().optional(),
  challenge: z.string().optional(),
  solution: z.string().optional(),
  resultsDetail: z.string().optional(),
  tags: z.array(z.string()).optional(),
  testimonial: z
    .object({
      quote: z.string().min(1),
      author: z.string().min(1),
      role: z.string().min(1),
      company: z.string().min(1),
    })
    .nullable()
    .optional(),
  // Visual assets selected from SharePoint
  heroImage: z.string().url().optional(),
  linkedInImage: z.string().url().optional(),
  emailHeader: z.string().url().optional(),
});

export const LinkedInPostSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(10),
  proofPoints: z.string().min(1),
  hashtags: z.string().default(""),
  charCount: z.number(),
  visualTitle: z.string().max(30).optional().default(""),
});

export const NurturingEmailSchema = z.object({
  subject: z.string().min(1).max(60),
  body: z.string().min(50),
  ctaText: z.string().min(1),
  suggestedSegment: z.string().min(1),
});

export const GenerationOutputSchema = z.object({
  caseStudy: CaseStudyOutputSchema,
  linkedInPost: LinkedInPostSchema,
  nurturingEmail: NurturingEmailSchema,
});

export type CaseStudyOutput = z.infer<typeof CaseStudyOutputSchema>;
export type GenerationOutput = z.infer<typeof GenerationOutputSchema>;

/** Map output_type DB values to their Zod schema */
export const OUTPUT_TYPE_SCHEMAS = {
  case_study: CaseStudyOutputSchema,
  linkedin_post: LinkedInPostSchema,
  nurturing_email: NurturingEmailSchema,
} as const;

export type OutputType = keyof typeof OUTPUT_TYPE_SCHEMAS;
