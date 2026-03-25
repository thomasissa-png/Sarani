import { z } from "zod";

// ─── Target markets ─────────────────────────────────────────────────────────

export const TARGET_MARKETS = [
  "Europe",
  "North America",
  "Middle East",
  "Asia Pacific",
  "Latin America",
  "Africa",
] as const;

export type TargetMarket = (typeof TARGET_MARKETS)[number];

// ─── Recommend request ──────────────────────────────────────────────────────

export const creativeRecommendSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  campaignObjective: z
    .string()
    .min(20, "Campaign objective must be at least 20 characters"),
  targetMarkets: z
    .array(z.enum(TARGET_MARKETS))
    .min(1, "Select at least one target market"),
  budget: z
    .object({
      amount: z.number().positive("Budget must be positive"),
      currency: z.string().min(1).max(5),
    })
    .optional(),
  timeline: z.string().min(1, "Timeline is required"),
  constraints: z.string().optional(),
});

export type CreativeRecommendInput = z.infer<typeof creativeRecommendSchema>;

// ─── Claude creative response schemas ───────────────────────────────────────

export const targetAudienceSchema = z.object({
  primary: z.string(),
  secondary: z.string().nullable(),
  consumerInsight: z.string(),
});

export const keyMessageSchema = z.object({
  type: z.enum(["primary", "secondary", "proofPoint"]),
  message: z.string(),
  rationale: z.string(),
});

export const creativeAngleSchema = z.object({
  name: z.string(),
  concept: z.string(),
  rationale: z.string(),
  toneAndManner: z.string(),
  exampleExecutions: z.array(z.string()),
});

export const activationPhaseSchema = z.object({
  name: z.string(),
  duration: z.string(),
  channels: z.array(z.string()),
  keyActions: z.array(z.string()),
  budgetAllocation: z.string(),
});

export const activationPlanSchema = z.object({
  phases: z.array(activationPhaseSchema),
  kpiSuggestions: z.array(z.string()),
});

export const toneGuidanceSchema = z.object({
  doThis: z.array(z.string()),
  avoidThis: z.array(z.string()),
  brandAlignment: z.string(),
});

export const creativeRecommendationSchema = z.object({
  executiveSummary: z.string(),
  problemStatement: z.string(),
  targetAudience: targetAudienceSchema,
  keyMessages: z.array(keyMessageSchema),
  creativeAngles: z.array(creativeAngleSchema),
  activationPlan: activationPlanSchema,
  toneGuidance: toneGuidanceSchema,
  competitiveContext: z.string(),
  hypotheses: z.array(z.string()),
});

export type CreativeRecommendation = z.infer<
  typeof creativeRecommendationSchema
>;
export type CreativeAngle = z.infer<typeof creativeAngleSchema>;
export type KeyMessage = z.infer<typeof keyMessageSchema>;
export type ActivationPhase = z.infer<typeof activationPhaseSchema>;
