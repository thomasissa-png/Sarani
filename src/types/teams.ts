// ─── AI Project Teams — Frontend Types ─────────────────────────────────────
// Based on ai-project-teams-specs.md Section 4 (Data Model) and Section 2 (Templates)

export type TeamStatus = "draft" | "in_progress" | "completed" | "archived";
export type StepStatus = "pending" | "running" | "completed" | "failed";

export type TemplateType =
  | "social_media"
  | "seo_content"
  | "brand_identity"
  | "video"
  | "translation"
  | "ad_campaign"
  | "custom";

export type AgentType =
  | "creative_strategist"
  | "copywriter"
  | "seo"
  | "social"
  | "qa"
  | "video_script"
  | "translator"
  | "project_manager";

// ─── API Response Types ────────────────────────────────────────────────────

export interface TeamStep {
  id: string;
  teamId: string;
  stepOrder: number;
  label: string;
  agentType: AgentType;
  status: StepStatus;
  input: Record<string, unknown> | null;
  output: string | null;
  tokenCost?: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TeamDeliverable {
  id: string;
  stepId: string;
  name: string;
  content: string;
  format: "markdown" | "plain_text" | "json";
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  clientId: string;
  clientName?: string;
  templateType: TemplateType | null;
  brief: string;
  status: TeamStatus;
  steps: TeamStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamListItem {
  id: string;
  name: string;
  clientName: string;
  templateType: TemplateType | null;
  status: TeamStatus;
  stepsCompleted: number;
  stepsTotal: number;
  createdAt: string;
}

// ─── Template Definitions (Frontend) ───────────────────────────────────────

export interface TemplateStepDef {
  stepOrder: number;
  label: string;
  agentType: AgentType;
  deliverable: string;
}

export interface TemplateDefinition {
  type: TemplateType;
  name: string;
  description: string;
  agents: string[];
  steps: TemplateStepDef[];
}

// ─── Create Team Payload ───────────────────────────────────────────────────

export interface CreateTeamPayload {
  name: string;
  clientId: string;
  templateType: TemplateType;
  brief: string;
  steps: { agentType: AgentType; stepOrder: number; label: string }[];
}

// ─── Agent Type Labels ─────────────────────────────────────────────────────

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  creative_strategist: "Creative Strategist IA",
  copywriter: "Copywriter IA",
  seo: "SEO IA",
  social: "Social IA",
  qa: "QA / Proofreader IA",
  video_script: "Video Script IA",
  translator: "Translator IA",
  project_manager: "Project Manager IA",
};

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};
