import { z } from "zod";

// ─── Constants ──────────────────────────────────────────────────────────────

export const PROSPECT_INDUSTRIES = [
  "tech",
  "luxury",
  "logistics",
  "entertainment",
  "fmcg",
  "aviation",
  "finance",
  "healthcare",
  "education",
  "other",
] as const;

export type ProspectIndustry = (typeof PROSPECT_INDUSTRIES)[number];

export const PROSPECT_INDUSTRY_LABELS: Record<ProspectIndustry, string> = {
  tech: "Tech",
  luxury: "Luxury",
  logistics: "Logistics",
  entertainment: "Entertainment",
  fmcg: "FMCG",
  aviation: "Aviation",
  finance: "Finance",
  healthcare: "Healthcare",
  education: "Education",
  other: "Other",
};

export const SERVICES_AVAILABLE = [
  "design",
  "video",
  "branding",
  "social-media",
  "content",
  "translation",
  "events",
  "presentations",
] as const;

export type ServiceType = (typeof SERVICES_AVAILABLE)[number];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  design: "Design",
  video: "Video",
  branding: "Branding",
  "social-media": "Social Media",
  content: "Content",
  translation: "Translation",
  events: "Events",
  presentations: "Presentations",
};

export const PROPOSAL_LANGUAGES = ["EN", "FR"] as const;

export type ProposalLanguage = (typeof PROPOSAL_LANGUAGES)[number];

// ─── Request schema ─────────────────────────────────────────────────────────

export const proposalGenerateSchema = z.object({
  prospectName: z
    .string()
    .min(2, "Prospect name must be at least 2 characters"),
  prospectIndustry: z.enum(PROSPECT_INDUSTRIES).optional(),
  prospectNeeds: z.string().optional(),
  estimatedBudget: z.string().optional(),
  timeline: z.string().optional(),
  servicesRequested: z
    .array(z.enum(SERVICES_AVAILABLE))
    .min(1, "Select at least one service"),
  language: z.enum(PROPOSAL_LANGUAGES).default("EN"),
  competitorMentioned: z.string().optional(),
});

export type ProposalGenerateInput = z.infer<typeof proposalGenerateSchema>;

// ─── Response schemas ───────────────────────────────────────────────────────

export const proposalCaseStudySchema = z.object({
  client: z.string(),
  deliverable: z.string(),
  keyMetric: z.string(),
  relevanceExplanation: z.string(),
});

export const proposalScopeItemSchema = z.object({
  phase: z.string(),
  deliverables: z.array(z.string()),
  duration: z.string(),
});

export const proposalResponseSchema = z.object({
  executiveSummary: z.string(),
  clientUnderstanding: z.string(),
  proposedApproach: z.string(),
  relevantCaseStudies: z.array(proposalCaseStudySchema),
  scopeOfWork: z.array(proposalScopeItemSchema),
  timeline: z.string(),
  pricingApproach: z.string(),
  teamOverview: z.string(),
  whySarani: z.array(z.string()),
  nextSteps: z.array(z.string()),
  appendix: z.string(),
  hypotheses: z.array(z.string()),
});

export type ProposalResponse = z.infer<typeof proposalResponseSchema>;
export type ProposalCaseStudy = z.infer<typeof proposalCaseStudySchema>;
export type ProposalScopeItem = z.infer<typeof proposalScopeItemSchema>;
