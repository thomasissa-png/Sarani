/**
 * AI Project Teams — Template definitions.
 * Each template defines the agents and steps pre-configured for a specific campaign type.
 */

export type AgentType =
  | "creative_strategist"
  | "copywriter"
  | "seo"
  | "social"
  | "qa"
  | "video_script"
  | "translator"
  | "project_manager";

export type TemplateType =
  | "social_media"
  | "seo_content"
  | "brand_identity"
  | "video"
  | "translation"
  | "ad_campaign"
  | "custom";

export interface TemplateStep {
  stepOrder: number;
  agentType: AgentType;
  label: string;
}

export interface TeamTemplate {
  type: TemplateType;
  name: string;
  description: string;
  steps: TemplateStep[];
}

export const TEAM_TEMPLATES: Record<TemplateType, TeamTemplate> = {
  social_media: {
    type: "social_media",
    name: "Social Media Management",
    description:
      "End-to-end social media campaign: audience audit, editorial calendar, post copy, and proofreading.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Platform & audience audit",
      },
      {
        stepOrder: 2,
        agentType: "social",
        label: "Monthly editorial calendar",
      },
      {
        stepOrder: 3,
        agentType: "copywriter",
        label: "Post copy & captions",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "Proofreading & brand check",
      },
    ],
  },

  seo_content: {
    type: "seo_content",
    name: "SEO Content Campaign",
    description:
      "Full SEO content pipeline: keyword research, content strategy, article writing, and SEO review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "seo",
        label: "Keyword & topic research",
      },
      {
        stepOrder: 2,
        agentType: "creative_strategist",
        label: "Content strategy",
      },
      {
        stepOrder: 3,
        agentType: "copywriter",
        label: "Article writing",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "SEO & quality review",
      },
    ],
  },

  brand_identity: {
    type: "brand_identity",
    name: "Brand Identity / Rebranding",
    description:
      "Complete brand identity project: audit, voice definition, naming, and consistency review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Brand audit & positioning",
      },
      {
        stepOrder: 2,
        agentType: "copywriter",
        label: "Brand voice & messaging",
      },
      {
        stepOrder: 3,
        agentType: "copywriter",
        label: "Naming & copy assets",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "Final review",
      },
    ],
  },

  video: {
    type: "video",
    name: "Video Production Campaign",
    description:
      "Video campaign from concept to script: creative brief, scripts, voiceover copy, and review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Campaign concept & moodboard brief",
      },
      {
        stepOrder: 2,
        agentType: "video_script",
        label: "Video scripts",
      },
      {
        stepOrder: 3,
        agentType: "copywriter",
        label: "Voiceover & caption copy",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "Script & copy review",
      },
    ],
  },

  translation: {
    type: "translation",
    name: "Translation Campaign",
    description:
      "Multi-language translation pipeline: asset intake, translation, transcreation, and QA review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "project_manager",
        label: "Source asset intake & language mapping",
      },
      {
        stepOrder: 2,
        agentType: "translator",
        label: "Translation",
      },
      {
        stepOrder: 3,
        agentType: "copywriter",
        label: "Transcreation (if needed)",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "QA & final review",
      },
    ],
  },

  ad_campaign: {
    type: "ad_campaign",
    name: "Ad Campaign (Paid Media)",
    description:
      "Paid media campaign: strategy, ad copy for all formats, scheduling, and compliance check.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Campaign strategy & audience brief",
      },
      {
        stepOrder: 2,
        agentType: "copywriter",
        label: "Ad copy — all formats",
      },
      {
        stepOrder: 3,
        agentType: "social",
        label: "Ad scheduling & platform specs",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "Final copy & compliance check",
      },
    ],
  },
  custom: {
    type: "custom",
    name: "Custom Team",
    description: "Build your own team with custom agents and steps",
    steps: [], // User defines steps manually
  },
};

/** Get a template by type, or null if not found */
export function getTemplate(type: string): TeamTemplate | null {
  return TEAM_TEMPLATES[type as TemplateType] ?? null;
}

/** All available template types for validation */
export const VALID_TEMPLATE_TYPES = Object.keys(TEAM_TEMPLATES) as TemplateType[];

/** Human-readable label for an agent type */
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
