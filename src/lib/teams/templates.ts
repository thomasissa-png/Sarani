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
  | "project_manager"
  | "designer"
  | "email_drafter"
  | "presentation"
  | "legal"
  | "proofreader";

export type TemplateType =
  | "social_media"
  | "seo_content"
  | "brand_identity"
  | "video"
  | "translation"
  | "ad_campaign"
  | "graphic_design"
  | "marketing_campaign"
  | "event_communication"
  | "email_marketing"
  | "presentation"
  | "legal_review"
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
  graphic_design: {
    type: "graphic_design",
    name: "Graphic Design",
    description:
      "Design project: creative strategy, visual design, and quality review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Creative brief & direction",
      },
      {
        stepOrder: 2,
        agentType: "designer",
        label: "Visual design & assets",
      },
      {
        stepOrder: 3,
        agentType: "qa",
        label: "Brand consistency & quality check",
      },
    ],
  },

  marketing_campaign: {
    type: "marketing_campaign",
    name: "Marketing Campaign",
    description:
      "Full marketing campaign: strategy, copy, design, social distribution, SEO, and quality review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Campaign strategy & brief",
      },
      {
        stepOrder: 2,
        agentType: "copywriter",
        label: "Campaign copy & messaging",
      },
      {
        stepOrder: 3,
        agentType: "designer",
        label: "Campaign visuals & assets",
      },
      {
        stepOrder: 4,
        agentType: "social",
        label: "Social media distribution plan",
      },
      {
        stepOrder: 5,
        agentType: "seo",
        label: "SEO optimisation",
      },
      {
        stepOrder: 6,
        agentType: "qa",
        label: "Final review & compliance",
      },
    ],
  },

  event_communication: {
    type: "event_communication",
    name: "Event Communication",
    description:
      "Event communication package: strategy, copy, design, presentation deck, and quality review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Event strategy & messaging framework",
      },
      {
        stepOrder: 2,
        agentType: "copywriter",
        label: "Event copy & invitations",
      },
      {
        stepOrder: 3,
        agentType: "designer",
        label: "Event visuals & collateral",
      },
      {
        stepOrder: 4,
        agentType: "presentation",
        label: "Presentation deck",
      },
      {
        stepOrder: 5,
        agentType: "qa",
        label: "Final review & brand check",
      },
    ],
  },

  email_marketing: {
    type: "email_marketing",
    name: "Email Marketing",
    description:
      "Email campaign: strategy, copy, email drafting, and quality review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Email strategy & segmentation",
      },
      {
        stepOrder: 2,
        agentType: "copywriter",
        label: "Email copy & subject lines",
      },
      {
        stepOrder: 3,
        agentType: "email_drafter",
        label: "Email template & layout",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "Deliverability & content review",
      },
    ],
  },

  presentation: {
    type: "presentation",
    name: "Presentation / Pitch Deck",
    description:
      "Presentation project: strategy, narrative copy, slide design, and quality review.",
    steps: [
      {
        stepOrder: 1,
        agentType: "creative_strategist",
        label: "Presentation strategy & structure",
      },
      {
        stepOrder: 2,
        agentType: "copywriter",
        label: "Slide narrative & copy",
      },
      {
        stepOrder: 3,
        agentType: "presentation",
        label: "Slide design & layout",
      },
      {
        stepOrder: 4,
        agentType: "qa",
        label: "Final review & consistency check",
      },
    ],
  },

  legal_review: {
    type: "legal_review",
    name: "Legal Review",
    description:
      "Legal document review: legal analysis, proofreading, and quality check.",
    steps: [
      {
        stepOrder: 1,
        agentType: "legal",
        label: "Legal review & compliance check",
      },
      {
        stepOrder: 2,
        agentType: "proofreader",
        label: "Proofreading & formatting",
      },
      {
        stepOrder: 3,
        agentType: "qa",
        label: "Final quality check",
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
  designer: "Designer IA",
  email_drafter: "Email Drafter IA",
  presentation: "Presentation IA",
  legal: "Legal IA",
  proofreader: "Proofreader IA",
};
