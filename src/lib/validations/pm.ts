import { z } from "zod";

// ─── Agent types ────────────────────────────────────────────────────────────

export const AGENT_TYPES = [
  "translator",
  "creative",
  "designer",
  "legal",
  "social",
  "seo",
  "copywriter",
  "email-drafter",
  "presentation",
  "proofreader",
  "proposal",
  "video-script",
  "pm",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const PRIORITY_OPTIONS = ["normal", "urgent", "asap"] as const;

export type Priority = (typeof PRIORITY_OPTIONS)[number];

// ─── Analyze brief request ──────────────────────────────────────────────────

export const analyzeBriefSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  brief: z.string().min(20, "Brief must be at least 20 characters"),
  deadline: z.string().optional(), // ISO date string
  priority: z.enum(PRIORITY_OPTIONS).default("normal"),
});

export type AnalyzeBriefInput = z.infer<typeof analyzeBriefSchema>;

// ─── Claude PM analysis response ────────────────────────────────────────────

export const clientCheckSchema = z.object({
  label: z.string(),
  status: z.enum(["ok", "warning", "missing"]),
  detail: z.string(),
});

export const missingInfoSchema = z.object({
  field: z.string(),
  suggestion: z.string(),
  blocking: z.boolean(),
});

export const taskSchema = z.object({
  title: z.string(),
  agent: z.enum(AGENT_TYPES),
  description: z.string(),
  complexity: z.enum(["low", "medium", "high"]),
  estimatedMinutes: z.number(),
  dependencies: z.array(z.string()),
});

export const pmAnalysisSchema = z.object({
  briefSummary: z.string(),
  detectedLanguage: z.string(),
  clientChecks: z.array(clientCheckSchema),
  missingInfo: z.array(missingInfoSchema),
  tasks: z.array(taskSchema),
});

export type PMAnalysis = z.infer<typeof pmAnalysisSchema>;
export type SuggestedTask = z.infer<typeof taskSchema>;

// ─── Dispatch request ───────────────────────────────────────────────────────

export const dispatchTaskSchema = z.object({
  title: z.string(),
  agent: z.enum(AGENT_TYPES),
  description: z.string(),
  complexity: z.enum(["low", "medium", "high"]),
});

export const dispatchSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  briefSummary: z.string(),
  deadline: z.string().optional(),
  priority: z.enum(PRIORITY_OPTIONS),
  tasks: z.array(dispatchTaskSchema).min(1, "Select at least one task"),
});

export type DispatchInput = z.infer<typeof dispatchSchema>;
