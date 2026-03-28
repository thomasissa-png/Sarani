import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
  index,
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
  };
  features?: Array<{
    iconName: string;
    title: string;
    description: string;
  }>;
  socialProof?: {
    quote: string;
    author: string;
    company: string;
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
