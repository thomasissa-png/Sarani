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
