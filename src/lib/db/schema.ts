import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  jsonb,
  index,
  varchar,
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

// ─── Type exports ───────────────────────────────────────────────────────────

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type AgentOutput = typeof agentOutputs.$inferSelect;
export type NewAgentOutput = typeof agentOutputs.$inferInsert;
export type ClientGlossaryEntry = typeof clientGlossaryEntries.$inferSelect;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
