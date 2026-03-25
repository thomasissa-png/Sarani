CREATE TABLE "agent_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"agent_type" varchar(20) NOT NULL,
	"input_payload" jsonb,
	"output_content" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"clickup_task_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "client_glossary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"source_term" text NOT NULL,
	"target_term" text NOT NULL,
	"language_pair" varchar(10) NOT NULL,
	"validated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"industry" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'prospect' NOT NULL,
	"primary_language" varchar(5) NOT NULL,
	"secondary_languages" jsonb,
	"primary_contact_name" text,
	"primary_contact_email" text,
	"clickup_project_id" text,
	"primary_color" varchar(7),
	"secondary_colors" text,
	"font_name" text,
	"brand_tone" text,
	"brand_guidelines_notes" text,
	"translation_memory" text,
	"prohibited_terms" text,
	"legal_entity_name" text,
	"legal_country" varchar(5),
	"vat_number" varchar(50),
	"signed_framework_agreement" boolean DEFAULT false,
	"preferred_contract_template" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"template_content" text,
	"variables" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_outputs" ADD CONSTRAINT "agent_outputs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_glossary_entries" ADD CONSTRAINT "client_glossary_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_outputs_client_id" ON "agent_outputs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_agent_outputs_agent_type" ON "agent_outputs" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "idx_glossary_client_id" ON "client_glossary_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_clients_status" ON "clients" USING btree ("status");