import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  varchar,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

// ─── Client ─────────────────────────────────────────────────────────────────

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Bloc identité (required)
    name: text("name").notNull(),
    industry: varchar("industry", { length: 50 }).notNull(), // tech | luxe | logistics | entertainment | fmcg | aviation | other
    status: varchar("status", { length: 20 }).notNull().default("prospect"), // active | inactive | prospect
    primaryLanguage: varchar("primary_language", { length: 5 }).notNull(), // FR | EN | IT | ES | DE
    secondaryLanguages: jsonb("secondary_languages").$type<string[]>(), // array of language codes
    primaryContactName: text("primary_contact_name"),
    primaryContactEmail: text("primary_contact_email"),
    clickupProjectId: text("clickup_project_id"),

    // Bloc brand (optional)
    primaryColor: varchar("primary_color", { length: 7 }),
    secondaryColors: text("secondary_colors"),
    fontName: text("font_name"),
    brandTone: text("brand_tone"),
    brandGuidelinesNotes: text("brand_guidelines_notes"),

    // Bloc traduction (optional)
    translationMemory: text("translation_memory"),
    prohibitedTerms: text("prohibited_terms"),

    // Bloc financier (optional)
    paymentTermsDays: integer("payment_terms_days").default(45), // default 45 days, configurable per client

    // Bloc juridique (optional)
    legalEntityName: text("legal_entity_name"),
    legalCountry: varchar("legal_country", { length: 5 }),
    vatNumber: varchar("vat_number", { length: 50 }),
    signedFrameworkAgreement: boolean("signed_framework_agreement").default(false),
    preferredContractTemplate: varchar("preferred_contract_template", { length: 20 }), // UGC | SOW | NDA | other

    // Bloc workspace (optional)
    clickupSpaceId: text("clickup_space_id"),
    sharepointFolder: text("sharepoint_folder"),
    excelTrackerFilename: text("excel_tracker_filename"),
    brandGuidelinesLink: text("brand_guidelines_link"),
    logoFolderLink: text("logo_folder_link"),
    fontFolderLink: text("font_folder_link"),
    notes: text("notes"),
    /** true = direct end client (Sony), false = partner agency (Ubi, Lamarck) */
    isEndClient: boolean("is_end_client").default(true),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_clients_status").on(table.status)]
);

// ─── Agent Output ───────────────────────────────────────────────────────────

export const agentOutputs = pgTable(
  "agent_outputs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }), // nullable — proposals target prospects (no client record yet)
    agentType: varchar("agent_type", { length: 20 }).notNull(), // pm | translator | creative | designer | legal | social | seo | proposal
    inputPayload: jsonb("input_payload"), // the form data submitted
    outputContent: text("output_content"), // the generated deliverable
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | processing | done | error
    clickupTaskId: text("clickup_task_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (table) => [
    index("idx_agent_outputs_client_id").on(table.clientId),
    index("idx_agent_outputs_agent_type").on(table.agentType),
  ]
);

// ─── Client Glossary Entry ──────────────────────────────────────────────────

export const clientGlossaryEntries = pgTable(
  "client_glossary_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    sourceTerm: text("source_term").notNull(),
    targetTerm: text("target_term").notNull(),
    languagePair: varchar("language_pair", { length: 10 }).notNull(), // e.g. "fr→en"
    validatedAt: timestamp("validated_at"),
  },
  (table) => [index("idx_glossary_client_id").on(table.clientId)]
);

// ─── Contract Template ──────────────────────────────────────────────────────

export const contractTemplates = pgTable("contract_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(), // UGC | SOW | NDA | Freelance
  templateContent: text("template_content"), // template text with {{variables}}
  variables: jsonb("variables").$type<string[]>(), // array of variable names
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"), // "admin" | "user"
    clickupUserId: integer("clickup_user_id"), // nullable — not all users have a ClickUp account
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_users_email").on(table.email)]
);

// ─── Sync Cache ─────────────────────────────────────────────────────────────
// Caches external API responses (ClickUp, SharePoint, Evoliz) with TTL.

export const syncCache = pgTable(
  "sync_cache",
  {
    key: text("key").primaryKey(), // e.g. "clickup:spaces", "sharepoint:tracker:Sony"
    source: varchar("source", { length: 20 }).notNull(), // "clickup" | "sharepoint" | "evoliz"
    data: jsonb("data").notNull(), // cached JSON response
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
    ttlSeconds: integer("ttl_seconds").notNull().default(300),
  },
  (table) => [index("idx_sync_cache_source").on(table.source)]
);

// ─── Sync Logs ──────────────────────────────────────────────────────────────
// Audit trail for all external API interactions (reads and writes).

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 20 }).notNull(), // "clickup" | "sharepoint" | "evoliz"
    action: varchar("action", { length: 50 }).notNull(), // "read_tasks" | "update_row" | "create_folder" etc.
    entityId: text("entity_id"), // external ID of the affected entity
    payload: jsonb("payload"), // request/response data for debugging
    status: varchar("status", { length: 20 }).notNull().default("success"), // "success" | "error" | "retrying"
    error: text("error"), // error message if status is "error"
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_sync_logs_source").on(table.source),
    index("idx_sync_logs_created_at").on(table.createdAt),
  ]
);

// ─── Quotes ─────────────────────────────────────────────────────────────────
// Generated quote PDFs with snapshot of pricing data.

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteNumber: varchar("quote_number", { length: 20 }).notNull().unique(), // SAR-YYYY-XXXX
    clientName: text("client_name").notNull(),
    projectName: text("project_name").notNull(),
    items: jsonb("items").notNull().$type<QuoteLineItem[]>(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    pdfUrl: text("pdf_url"), // SharePoint URL or null if not yet uploaded
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft | sent | dismissed
    purposeOfWork: text("purpose_of_work"),
    lang: varchar("lang", { length: 5 }).notNull().default("EN"), // FR | EN
    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    estimationConfidence: varchar("estimation_confidence", { length: 10 }), // high | medium | low
    unpricedItems: jsonb("unpriced_items").$type<string[]>(),
    clickupTaskId: text("clickup_task_id"), // linked ClickUp task for finalize flow
    contactEmail: text("contact_email"), // client contact for email draft
    createdBy: text("created_by").notNull(), // user ID or email
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_quotes_client_name").on(table.clientName),
    index("idx_quotes_created_by").on(table.createdBy),
  ]
);

/** Shape of a single line item within a quote */
export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Shape of the auto-quote draft extracted by the LLM */
export interface QuoteDraftPayload {
  lang: "FR" | "EN";
  purposeOfWork: string;
  paymentTermsDays: number;
  estimationConfidence: "high" | "medium" | "low";
  unpricedItems: string[];
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number | null;
    total: number | null;
  }>;
}

// ─── Project Teams ──────────────────────────────────────────────────────────

export const projectTeams = pgTable(
  "project_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    templateType: varchar("template_type", { length: 50 }), // social_media | seo_content | brand_identity | video | translation | ad_campaign | custom
    brief: text("brief").notNull(),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("draft"), // draft | in_progress | completed | archived
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_project_teams_client").on(table.clientId),
    index("idx_project_teams_status").on(table.status),
  ]
);

// ─── Team Steps ─────────────────────────────────────────────────────────────

export const teamSteps = pgTable(
  "team_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => projectTeams.id, { onDelete: "cascade" }),
    stepOrder: integer("step_order").notNull(),
    agentType: varchar("agent_type", { length: 50 }).notNull(), // creative_strategist | copywriter | seo | social | qa | video_script | translator | project_manager
    label: text("label").notNull(),
    status: varchar("status", { length: 20 })
      .notNull()
      .default("pending"), // pending | running | completed | failed
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: text("output"),
    tokenCost: integer("token_cost"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  (table) => [index("idx_team_steps_team").on(table.teamId)]
);

// ─── Team Deliverables ──────────────────────────────────────────────────────

export const teamDeliverables = pgTable(
  "team_deliverables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => teamSteps.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    content: text("content").notNull(),
    format: varchar("format", { length: 20 })
      .notNull()
      .default("markdown"), // markdown | plain_text | json
    version: integer("version").notNull().default(1),
    rerunComment: text("rerun_comment"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_team_deliverables_step").on(table.stepId)]
);

// ─── Case Study Candidates ─────────────────────────────────────────────────

export const caseStudyCandidates = pgTable(
  "case_study_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clickupTaskId: text("clickup_task_id").notNull().unique(),
    clientId: uuid("client_id").references(() => clients.id),
    clientName: text("client_name").notNull(),
    projectName: text("project_name"),
    projectType: varchar("project_type", { length: 50 }),
    projectAmount: numeric("project_amount"),
    completedAt: timestamp("completed_at"),
    sharePointAssetCount: integer("sharepoint_asset_count").default(0),
    sharePointFolderUrl: text("sharepoint_folder_url"),
    scoreTotal: integer("score_total").notNull(),
    scoreBreakdown: jsonb("score_breakdown").$type<{
      clientName: number;
      amount: number;
      assets: number;
      projectType: number;
      recency: number;
      diversity: number;
    }>(),
    scoreOverride: boolean("score_override").default(false),
    scoreOverrideReason: text("score_override_reason"),
    status: varchar("status", { length: 20 }).notNull().default("ignored"),
    // ignored | suggested | generating | generated | reviewed | published | excluded
    excludedReason: varchar("excluded_reason", { length: 50 }),
    excludedBy: text("excluded_by"),
    lastScannedAt: timestamp("last_scanned_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_candidates_status").on(table.status),
    index("idx_candidates_score").on(table.scoreTotal),
    index("idx_candidates_client").on(table.clientName),
  ]
);

// ─── Case Study Outputs ────────────────────────────────────────────────────

export const caseStudyOutputs = pgTable(
  "case_study_outputs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => caseStudyCandidates.id, { onDelete: "cascade" }),
    outputType: varchar("output_type", { length: 20 }).notNull(),
    // case_study | linkedin_post | nurturing_email
    currentVersion: integer("current_version").notNull().default(1),
    content: jsonb("content").notNull(),
    versions: jsonb("versions").$type<
      Array<{
        version: number;
        content: unknown;
        generatedAt: string;
        generatedBy: string;
        instruction?: string;
      }>
    >(),
    publishedAt: timestamp("published_at"),
    publishedBy: text("published_by"),
    caseStudySlug: text("case_study_slug"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_outputs_candidate").on(table.candidateId),
    index("idx_outputs_type").on(table.outputType),
  ]
);

// ─── Scoring Config ────────────────────────────────────────────────────────

export const scoringConfig = pgTable("scoring_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  weightClientName: integer("weight_client_name").notNull().default(25),
  weightAmount: integer("weight_amount").notNull().default(20),
  weightAssets: integer("weight_assets").notNull().default(20),
  weightProjectType: integer("weight_project_type").notNull().default(15),
  weightRecency: integer("weight_recency").notNull().default(10),
  weightDiversity: integer("weight_diversity").notNull().default(10),
  tier1Clients: jsonb("tier1_clients").$type<string[]>(),
  tier2Clients: jsonb("tier2_clients").$type<string[]>(),
  projectTypeScores: jsonb("project_type_scores").$type<
    Record<string, number>
  >(),
  autoGenerateThreshold: integer("auto_generate_threshold")
    .notNull()
    .default(70),
  autoGenerateEnabled: boolean("auto_generate_enabled")
    .notNull()
    .default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

// ─── Landing Page Sections Type ────────────────────────────────────────

export interface LandingPageSections {
  hero: {
    headline: string;
    subheadline: string;
    ctaText: string;
    ctaUrl: string;
    backgroundType: "color" | "image";
    backgroundImageUrl?: string;
    imageUrl?: string;
  };
  features?: Array<{
    iconName: string;
    title: string;
    description: string;
  }>;
  featuresHeadline?: string;
  gallery?: Array<{
    imageUrl: string;
    caption?: string;
  }>;
  socialProof?:
    | {
        quote: string;
        author: string;
        company: string;
      }
    | Array<{
        quote: string;
        author: string;
        company: string;
      }>;
  pricing?: {
    headline: string;
    items: Array<{ name: string; price: string; description?: string }>;
    total?: string;
    note?: string;
  };
  team?: {
    headline: string;
    members: Array<{ name: string; role: string }>;
  };
  cta: {
    headline: string;
    subtext: string;
    buttonText: string;
    buttonUrl: string;
  };
  footer: {
    tagline: string;
  };
  meta: {
    title: string;
    description: string;
  };
}

// ─── Landing Pages ─────────────────────────────────────────────────────────

export const landingPages = pgTable(
  "landing_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Identity
    title: text("title").notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    // draft | generating | ready | published | archived

    // Brief & generation inputs
    brief: text("brief").notNull(),
    language: varchar("language", { length: 5 }).notNull().default("EN"),

    // Generated content (structured JSON)
    sections: jsonb("sections").$type<LandingPageSections>(),

    // Manual overrides
    manualOverrides: jsonb("manual_overrides").$type<Record<string, string>>(),

    // Visual assets
    logoUrl: text("logo_url"),
    visualAssets: jsonb("visual_assets").$type<string[]>(),

    // Palette overrides
    paletteOverride: jsonb("palette_override").$type<{
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
    }>(),

    // Layout
    sectionsEnabled: jsonb("sections_enabled")
      .$type<{ features: boolean; socialProof: boolean }>()
      .default({ features: true, socialProof: false }),

    // SEO
    noIndex: boolean("no_index").notNull().default(false),

    // Cost tracking
    totalTokenCost: integer("total_token_cost").default(0),
    rawLlmOutput: text("raw_llm_output"),

    // ClickUp integration
    clickupTaskId: text("clickup_task_id"),

    // Share token
    shareToken: varchar("share_token", { length: 64 }).unique(),

    // Timestamps
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_landing_pages_client").on(table.clientId),
    index("idx_landing_pages_status").on(table.status),
    index("idx_landing_pages_slug").on(table.slug),
  ]
);

// ─── Landing Page Versions ─────────────────────────────────────────────────

export const landingPageVersions = pgTable(
  "landing_page_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    landingPageId: uuid("landing_page_id")
      .notNull()
      .references(() => landingPages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    sections: jsonb("sections").$type<LandingPageSections>().notNull(),
    paletteOverride: jsonb("palette_override").$type<Record<string, string>>(),
    visualAssets: jsonb("visual_assets").$type<string[]>(),
    manualOverrides: jsonb("manual_overrides").$type<Record<string, string>>(),
    tokenCost: integer("token_cost"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_lp_versions_page").on(table.landingPageId),
  ]
);

// ─── Storyboards ───────────────────────────────────────────────────────────

export const storyboards = pgTable(
  "storyboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    scriptText: text("script_text"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    // draft | generating | ready | shared | approved | rejected
    shareToken: uuid("share_token").unique(),
    shareExpiresAt: timestamp("share_expires_at"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_storyboards_client_id").on(table.clientId),
    index("idx_storyboards_share_token").on(table.shareToken),
    index("idx_storyboards_status").on(table.status),
  ]
);

// ─── Storyboard Scenes ─────────────────────────────────────────────────────

export const storyboardScenes = pgTable(
  "storyboard_scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyboardId: uuid("storyboard_id")
      .notNull()
      .references(() => storyboards.id, { onDelete: "cascade" }),
    sceneOrder: integer("scene_order").notNull(),
    description: text("description"),
    cameraDirection: text("camera_direction"),
    mood: text("mood"),
    imageUrl: text("image_url"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | generating | ready | failed
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_storyboard_scenes_storyboard").on(table.storyboardId),
  ]
);

// ─── Storyboard Scene Versions ─────────────────────────────────────────────

export const storyboardSceneVersions = pgTable(
  "storyboard_scene_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => storyboardScenes.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    imageUrl: text("image_url").notNull(),
    promptUsed: text("prompt_used"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_scene_versions_scene").on(table.sceneId),
  ]
);

// ─── Storyboard Approvals ──────────────────────────────────────────────────

export const storyboardApprovals = pgTable(
  "storyboard_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyboardId: uuid("storyboard_id")
      .notNull()
      .references(() => storyboards.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(),
    // pending | approved | rejected
    feedback: text("feedback"),
    clientName: text("client_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_storyboard_approvals_storyboard").on(table.storyboardId),
  ]
);

// ─── Project Previews ──────────────────────────────────────────────────────
// Public presentation links for sharing project progress with clients.

export const projectPreviews = pgTable(
  "project_previews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id").notNull(),
    version: integer("version").notNull().default(1),
    clientSlug: text("client_slug").notNull(),
    projectSlug: text("project_slug").notNull(),
    clientName: text("client_name").notNull(),
    projectName: text("project_name").notNull(),
    brief: text("brief"),
    sharepointLink: text("sharepoint_link"),
    spFolderId: text("sp_folder_id"),
    spDriveId: text("sp_drive_id"),
    selectedAssets: text("selected_assets"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_client_project_slug").on(table.clientSlug, table.projectSlug),
    uniqueIndex("uq_project_version").on(table.projectId, table.version),
    index("idx_project_previews_project_id").on(table.projectId),
  ]
);

// ─── Video Previews ───────────────────────────────────────────────────────

export interface VideoPreviewScene {
  sceneId: string;
  prompt: string;
  videoUrl: string | null;
  status: "pending" | "generating" | "ready" | "failed";
  duration: number;
  error: string | null;
}

export const videoPreviews = pgTable(
  "video_previews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storyboardId: uuid("storyboard_id").references(() => storyboards.id, {
      onDelete: "set null",
    }),
    projectName: varchar("project_name", { length: 500 }).notNull(),
    clientName: varchar("client_name", { length: 255 }),
    provider: varchar("provider", { length: 50 }).notNull(), // 'veo' | 'runway' | 'kling'
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // pending | generating | ready | failed | assembled
    scenes: jsonb("scenes").$type<VideoPreviewScene[]>().notNull().default([]),
    assembledUrl: text("assembled_url"),
    shareToken: uuid("share_token").unique(),
    shareExpiresAt: timestamp("share_expires_at"),
    costEstimateCents: integer("cost_estimate_cents"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_video_previews_storyboard").on(table.storyboardId),
    index("idx_video_previews_share").on(table.shareToken),
  ]
);

// ─── Email Project Links ──────────────────────────────────────────────────
// Links Microsoft Graph conversationId to internal projects/ClickUp tasks.
// Used by PROTO-CLIENT-RETURN to match incoming emails to existing projects.

export const emailProjectLinks = pgTable(
  "email_project_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: varchar("conversation_id", { length: 500 }).notNull(),
    clickupTaskId: varchar("clickup_task_id", { length: 100 }).notNull(),
    projectName: varchar("project_name", { length: 500 }),
    clientName: varchar("client_name", { length: 255 }),
    clientDomain: varchar("client_domain", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_email_project_conversation").on(table.conversationId),
    index("idx_email_project_client_domain").on(table.clientDomain),
  ]
);

// ─── Inbox Items ──────────────────────────────────────────────────────────
// PM dashboard queue — items created by webhooks, crons, and AI team hooks.

export const inboxItems = pgTable(
  "inbox_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 50 }).notNull(), // 'email_classified', 'ai_team_complete', 'qa_gates_pass', 'followup_alert'
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'in_progress', 'done', 'dismissed'
    title: varchar("title", { length: 500 }),
    summary: text("summary"), // structured JSON depending on type
    sourceId: varchar("source_id", { length: 255 }), // messageId, teamExecutionId, etc.
    sourceType: varchar("source_type", { length: 50 }), // 'email', 'ai_team', 'qa', 'cron'
    protocol: varchar("protocol", { length: 50 }), // Arya protocol triggered
    projectId: varchar("project_id", { length: 255 }), // linked project (nullable)
    priority: varchar("priority", { length: 10 }).default("medium"), // 'high', 'medium', 'low'
    pmId: varchar("pm_id", { length: 255 }), // assigned PM (nullable, future multi-PM)
    processedAt: timestamp("processed_at"), // when PM acted on the item
    verificationAttempt: integer("verification_attempt"), // 1-3 for AI reviews, null for human
    aryaReport: jsonb("arya_report"), // LLM verification output, null for human reviews
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_inbox_items_status").on(table.status),
    index("idx_inbox_items_created").on(table.createdAt),
    index("idx_inbox_items_priority").on(table.priority),
  ]
);

// ─── Processed Emails ─────────────────────────────────────────────────────
// Deduplication table for the cron fallback — tracks which Graph messageIds have been processed.

export const processedEmails = pgTable(
  "processed_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: varchar("message_id", { length: 255 }).notNull(),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
    resultCategory: varchar("result_category", { length: 50 }),
    inboxItemId: uuid("inbox_item_id").references(() => inboxItems.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("uq_processed_emails_message_id").on(table.messageId),
  ]
);

// ─── Graph Subscriptions ──────────────────────────────────────────────────
// Tracks active Microsoft Graph webhook subscriptions for auto-renewal.

export const graphSubscriptions = pgTable(
  "graph_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: varchar("subscription_id", { length: 255 }).notNull(),
    resource: varchar("resource", { length: 255 }).notNull(),
    expirationDateTime: timestamp("expiration_date_time").notNull(),
    clientState: varchar("client_state", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    renewedAt: timestamp("renewed_at"),
  },
  (table) => [
    index("idx_graph_subscriptions_expiration").on(table.expirationDateTime),
  ]
);

// ─── Arya Learnings ───────────────────────────────────────────────────────
// Learning journal — captures PM corrections to Arya-generated content.

export const aryaLearnings = pgTable(
  "arya_learnings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: timestamp("date").notNull().defaultNow(),
    pmName: varchar("pm_name", { length: 100 }).notNull(),
    itemType: varchar("item_type", { length: 50 }).notNull(), // 'email_draft', 'brief', 'quote', 'pitch', 'followup', 'ack_receipt'
    itemId: varchar("item_id", { length: 255 }), // ID of the inbox_item or document corrected
    aryaOriginal: text("arya_original").notNull(),
    pmEdited: text("pm_edited").notNull(),
    diffSummary: text("diff_summary"), // generated by Haiku
    category: varchar("category", { length: 50 }).notNull(), // 'ton', 'contenu', 'structure', 'pricing', 'missing_info'
    categoryConfirmed: boolean("category_confirmed").default(false),
    promoted: boolean("promoted").default(false),
    promotedRuleId: uuid("promoted_rule_id"), // FK to arya_rules (nullable)
    projectId: varchar("project_id", { length: 255 }),
    clientDomain: varchar("client_domain", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_arya_learnings_category").on(table.category),
    index("idx_arya_learnings_item_type").on(table.itemType),
    index("idx_arya_learnings_promoted").on(table.promoted),
  ]
);

// ─── Arya Rules ───────────────────────────────────────────────────────────
// Permanent rules promoted from recurring learnings — injected into Arya prompts.

export const aryaRules = pgTable(
  "arya_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleText: text("rule_text").notNull(),
    category: varchar("category", { length: 50 }).notNull(), // 'ton', 'contenu', 'structure', 'pricing', 'missing_info'
    sourceLearningIds: jsonb("source_learning_ids").$type<string[]>().default([]),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deactivatedAt: timestamp("deactivated_at"),
    deactivationReason: text("deactivation_reason"),
  },
  (table) => [
    index("idx_arya_rules_active").on(table.active),
    index("idx_arya_rules_category").on(table.category),
  ]
);

// ─── Client Knowledge ─────────────────────────────────────────────────────
// Structured, atomic knowledge about clients, divisions, and individual contacts.
// Used by Arya to personalise all outputs (briefs, emails, reviews, quotes).

export const clientKnowledge = pgTable(
  "client_knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    division: varchar("division", { length: 255 }),
    contactName: varchar("contact_name", { length: 255 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    codeName: varchar("code_name", { length: 20 }),
    category: varchar("category", { length: 50 }).notNull(), // tone | preference | positive_feedback | improvement | guideline | workflow
    knowledgeText: text("knowledge_text").notNull(),
    source: text("source").notNull(),
    confidence: varchar("confidence", { length: 20 }).notNull().default("observed"), // confirmed | observed | hypothesized
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ck_client_id").on(table.clientId),
    index("idx_ck_contact_email").on(table.contactEmail),
    index("idx_ck_category").on(table.category),
    index("idx_ck_client_division").on(table.clientId, table.division),
  ]
);

// ─── Client Contacts ─────────────────────────────────────────────────────────
// Individual contacts associated with a client (e.g. all people at Sony).
// Populated automatically by the email scanner and manually via back-office.

export const clientContacts = pgTable(
  "client_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: varchar("email", { length: 255 }),
    division: text("division"), // "Sony France", "Sony Pro", "Sony Europe"
    role: text("role"), // "Marketing Director", "Project Manager"
    source: varchar("source", { length: 20 }).notNull().default("auto"), // 'auto' (email scan) or 'manual'
    lastSeenAt: timestamp("last_seen_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_cc_client_id").on(table.clientId),
    index("idx_cc_email").on(table.email),
    uniqueIndex("idx_cc_client_email").on(table.clientId, table.email),
  ]
);

// ─── Team Knowledge ──────────────────────────────────────────────────────────
// Structured knowledge about Sarani team members — skills, preferences, work style.
// Used by Arya to assign the right person and adapt communication.

export const teamKnowledge = pgTable(
  "team_knowledge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamMemberEmail: varchar("team_member_email", { length: 255 }).notNull(),
    teamMemberName: varchar("team_member_name", { length: 255 }).notNull(),
    codeName: varchar("code_name", { length: 20 }),
    role: varchar("role", { length: 50 }).notNull(), // designer | copywriter | video_editor | translator | project_manager | developer | strategist
    category: varchar("category", { length: 50 }).notNull(), // skill | preference | availability | speed | quality_note | language | tool | style
    knowledgeText: text("knowledge_text").notNull(),
    source: varchar("source", { length: 500 }),
    confidence: varchar("confidence", { length: 20 }).default("observed"), // confirmed | observed | hypothesized
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_tk_email").on(table.teamMemberEmail),
    index("idx_tk_role").on(table.role),
    index("idx_tk_category").on(table.category),
  ]
);

// ─── Project Closures ─────────────────────────────────────────────────────
// Tracks project closure events with star scoring.

export const projectClosures = pgTable(
  "project_closures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clickupTaskId: text("clickup_task_id").notNull(),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    projectName: text("project_name").notNull(),
    status: varchar("status", { length: 30 })
      .notNull()
      .default("pending_closure"), // pending_closure | closed | star_pipeline
    closureReason: varchar("closure_reason", { length: 30 }).notNull(), // client_approved | timeout_14d | manual
    starScore: integer("star_score"), // 0-100, null until computed
    starDetails: jsonb("star_details").$type<{
      clientTier: number;
      measurableImpact: number;
      creativeAmbition: number;
      storytelling: number;
      portfolioGap: number;
    }>(),
    starStatus: varchar("star_status", { length: 30 }), // STAR | STRONG_STORY_WEAK_ASSETS | NOTEWORTHY | STANDARD
    closedAt: timestamp("closed_at"),
    closedBy: text("closed_by"), // user ID
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_closures_status").on(table.status),
    index("idx_closures_clickup").on(table.clickupTaskId),
    index("idx_closures_client").on(table.clientId),
    index("idx_closures_star_status").on(table.starStatus),
  ]
);

// ─── Star Pipeline Items ──────────────────────────────────────────────────
// Tracks individual pipeline outputs generated after star scoring.

export const starPipelineItems = pgTable(
  "star_pipeline_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    closureId: uuid("closure_id")
      .notNull()
      .references(() => projectClosures.id, { onDelete: "cascade" }),
    outputType: varchar("output_type", { length: 30 }).notNull(), // case_study | linkedin_post | presentation_slide | seo_signal
    status: varchar("status", { length: 20 })
      .notNull()
      .default("pending"), // pending | generating | review | published | skipped
    content: text("content"), // generated content (markdown or JSON string)
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
    reviewedBy: text("reviewed_by"), // user ID
  },
  (table) => [
    index("idx_pipeline_closure").on(table.closureId),
    index("idx_pipeline_output_type").on(table.outputType),
    index("idx_pipeline_status").on(table.status),
  ]
);

// ─── Arya Verification Log ────────────────────────────────────────────────
// Tracks LLM pre-verification attempts for AI project reviews.

export interface VerificationCriteria {
  briefCoverage: boolean;
  formatCompliance: boolean;
  versionConsistency: boolean;
  completeness: boolean;
  clientReadyQuality: boolean;
}

export const aryaVerificationLog = pgTable(
  "arya_verification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inboxItemId: uuid("inbox_item_id").references(() => inboxItems.id, {
      onDelete: "set null",
    }),
    clickupTaskId: text("clickup_task_id").notNull(),
    attempt: integer("attempt").notNull().default(1),
    criteria: jsonb("criteria").$type<VerificationCriteria>(),
    passed: boolean("passed").notNull().default(false),
    failureReasons: jsonb("failure_reasons").$type<string[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_verification_log_task").on(table.clickupTaskId),
    index("idx_verification_log_inbox").on(table.inboxItemId),
  ]
);

// ─── Type exports ───────────────────────────────────────────────────────────

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type AgentOutput = typeof agentOutputs.$inferSelect;
export type NewAgentOutput = typeof agentOutputs.$inferInsert;
export type ClientGlossaryEntry = typeof clientGlossaryEntries.$inferSelect;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SyncCache = typeof syncCache.$inferSelect;
export type NewSyncCache = typeof syncCache.$inferInsert;
export type SyncLog = typeof syncLogs.$inferSelect;
export type NewSyncLog = typeof syncLogs.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type ProjectTeam = typeof projectTeams.$inferSelect;
export type NewProjectTeam = typeof projectTeams.$inferInsert;
export type TeamStep = typeof teamSteps.$inferSelect;
export type NewTeamStep = typeof teamSteps.$inferInsert;
export type TeamDeliverable = typeof teamDeliverables.$inferSelect;
export type NewTeamDeliverable = typeof teamDeliverables.$inferInsert;
export type CaseStudyCandidate = typeof caseStudyCandidates.$inferSelect;
export type NewCaseStudyCandidate = typeof caseStudyCandidates.$inferInsert;
export type CaseStudyOutput = typeof caseStudyOutputs.$inferSelect;
export type NewCaseStudyOutput = typeof caseStudyOutputs.$inferInsert;
export type ScoringConfig = typeof scoringConfig.$inferSelect;
export type NewScoringConfig = typeof scoringConfig.$inferInsert;
export type LandingPage = typeof landingPages.$inferSelect;
export type NewLandingPage = typeof landingPages.$inferInsert;
export type LandingPageVersion = typeof landingPageVersions.$inferSelect;
export type NewLandingPageVersion = typeof landingPageVersions.$inferInsert;
export type Storyboard = typeof storyboards.$inferSelect;
export type NewStoryboard = typeof storyboards.$inferInsert;
export type StoryboardScene = typeof storyboardScenes.$inferSelect;
export type NewStoryboardScene = typeof storyboardScenes.$inferInsert;
export type StoryboardSceneVersion = typeof storyboardSceneVersions.$inferSelect;
export type NewStoryboardSceneVersion = typeof storyboardSceneVersions.$inferInsert;
export type StoryboardApproval = typeof storyboardApprovals.$inferSelect;
export type NewStoryboardApproval = typeof storyboardApprovals.$inferInsert;
export type ProjectPreview = typeof projectPreviews.$inferSelect;
export type NewProjectPreview = typeof projectPreviews.$inferInsert;
export type VideoPreview = typeof videoPreviews.$inferSelect;
export type NewVideoPreview = typeof videoPreviews.$inferInsert;
export type EmailProjectLink = typeof emailProjectLinks.$inferSelect;
export type NewEmailProjectLink = typeof emailProjectLinks.$inferInsert;
export type InboxItem = typeof inboxItems.$inferSelect;
export type NewInboxItem = typeof inboxItems.$inferInsert;
export type ProcessedEmail = typeof processedEmails.$inferSelect;
export type NewProcessedEmail = typeof processedEmails.$inferInsert;
export type GraphSubscription = typeof graphSubscriptions.$inferSelect;
export type NewGraphSubscription = typeof graphSubscriptions.$inferInsert;
export type AryaLearning = typeof aryaLearnings.$inferSelect;
export type NewAryaLearning = typeof aryaLearnings.$inferInsert;
export type AryaRule = typeof aryaRules.$inferSelect;
export type NewAryaRule = typeof aryaRules.$inferInsert;
export type ClientKnowledge = typeof clientKnowledge.$inferSelect;
export type NewClientKnowledge = typeof clientKnowledge.$inferInsert;
export type ClientContact = typeof clientContacts.$inferSelect;
export type NewClientContact = typeof clientContacts.$inferInsert;
export type TeamKnowledge = typeof teamKnowledge.$inferSelect;
export type NewTeamKnowledge = typeof teamKnowledge.$inferInsert;
export type ProjectClosure = typeof projectClosures.$inferSelect;
export type NewProjectClosure = typeof projectClosures.$inferInsert;
export type StarPipelineItem = typeof starPipelineItems.$inferSelect;
export type NewStarPipelineItem = typeof starPipelineItems.$inferInsert;
export type AryaVerificationLogEntry = typeof aryaVerificationLog.$inferSelect;
export type NewAryaVerificationLogEntry = typeof aryaVerificationLog.$inferInsert;
