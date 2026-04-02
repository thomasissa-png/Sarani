CREATE TABLE "arya_learnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"pm_name" varchar(100) NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"item_id" varchar(255),
	"arya_original" text NOT NULL,
	"pm_edited" text NOT NULL,
	"diff_summary" text,
	"category" varchar(50) NOT NULL,
	"category_confirmed" boolean DEFAULT false,
	"promoted" boolean DEFAULT false,
	"promoted_rule_id" uuid,
	"project_id" varchar(255),
	"client_domain" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "arya_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_text" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"source_learning_ids" jsonb DEFAULT '[]'::jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deactivated_at" timestamp,
	"deactivation_reason" text
);
--> statement-breakpoint
CREATE TABLE "arya_verification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inbox_item_id" uuid,
	"clickup_task_id" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"criteria" jsonb,
	"passed" boolean DEFAULT false NOT NULL,
	"failure_reasons" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_study_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clickup_task_id" text NOT NULL,
	"client_id" uuid,
	"client_name" text NOT NULL,
	"project_name" text,
	"project_type" varchar(50),
	"project_amount" numeric,
	"completed_at" timestamp,
	"sharepoint_asset_count" integer DEFAULT 0,
	"sharepoint_folder_url" text,
	"score_total" integer NOT NULL,
	"score_breakdown" jsonb,
	"score_override" boolean DEFAULT false,
	"score_override_reason" text,
	"status" varchar(20) DEFAULT 'ignored' NOT NULL,
	"excluded_reason" varchar(50),
	"excluded_by" text,
	"last_scanned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_study_candidates_clickup_task_id_unique" UNIQUE("clickup_task_id")
);
--> statement-breakpoint
CREATE TABLE "case_study_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"output_type" varchar(20) NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"content" jsonb NOT NULL,
	"versions" jsonb,
	"published_at" timestamp,
	"published_by" text,
	"case_study_slug" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"division" varchar(255),
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"code_name" varchar(20),
	"category" varchar(50) NOT NULL,
	"knowledge_text" text NOT NULL,
	"source" text NOT NULL,
	"confidence" varchar(20) DEFAULT 'observed' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_project_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar(500) NOT NULL,
	"clickup_task_id" varchar(100) NOT NULL,
	"project_name" varchar(500),
	"client_name" varchar(255),
	"client_domain" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" varchar(255) NOT NULL,
	"resource" varchar(255) NOT NULL,
	"expiration_date_time" timestamp NOT NULL,
	"client_state" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"renewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "inbox_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"title" varchar(500),
	"summary" text,
	"source_id" varchar(255),
	"source_type" varchar(50),
	"protocol" varchar(50),
	"project_id" varchar(255),
	"priority" varchar(10) DEFAULT 'medium',
	"pm_id" varchar(255),
	"processed_at" timestamp,
	"verification_attempt" integer,
	"arya_report" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"landing_page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"sections" jsonb NOT NULL,
	"palette_override" jsonb,
	"visual_assets" jsonb,
	"manual_overrides" jsonb,
	"token_cost" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"brief" text NOT NULL,
	"language" varchar(5) DEFAULT 'EN' NOT NULL,
	"sections" jsonb,
	"manual_overrides" jsonb,
	"logo_url" text,
	"visual_assets" jsonb,
	"palette_override" jsonb,
	"sections_enabled" jsonb DEFAULT '{"features":true,"socialProof":false}'::jsonb,
	"no_index" boolean DEFAULT false NOT NULL,
	"total_token_cost" integer DEFAULT 0,
	"raw_llm_output" text,
	"clickup_task_id" text,
	"share_token" varchar(64),
	"published_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "landing_pages_slug_unique" UNIQUE("slug"),
	CONSTRAINT "landing_pages_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "processed_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(255) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"result_category" varchar(50),
	"inbox_item_id" uuid
);
--> statement-breakpoint
CREATE TABLE "project_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clickup_task_id" text NOT NULL,
	"client_id" uuid,
	"project_name" text NOT NULL,
	"status" varchar(30) DEFAULT 'pending_closure' NOT NULL,
	"closure_reason" varchar(30) NOT NULL,
	"star_score" integer,
	"star_details" jsonb,
	"star_status" varchar(30),
	"closed_at" timestamp,
	"closed_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"client_slug" text NOT NULL,
	"project_slug" text NOT NULL,
	"client_name" text NOT NULL,
	"project_name" text NOT NULL,
	"brief" text,
	"sharepoint_link" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_previews_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"client_id" uuid NOT NULL,
	"template_type" varchar(50),
	"brief" text NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_number" varchar(20) NOT NULL,
	"client_name" text NOT NULL,
	"project_name" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"pdf_url" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"purpose_of_work" text,
	"lang" varchar(5) DEFAULT 'EN' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"estimation_confidence" varchar(10),
	"unpriced_items" jsonb,
	"clickup_task_id" text,
	"contact_email" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "scoring_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weight_client_name" integer DEFAULT 25 NOT NULL,
	"weight_amount" integer DEFAULT 20 NOT NULL,
	"weight_assets" integer DEFAULT 20 NOT NULL,
	"weight_project_type" integer DEFAULT 15 NOT NULL,
	"weight_recency" integer DEFAULT 10 NOT NULL,
	"weight_diversity" integer DEFAULT 10 NOT NULL,
	"tier1_clients" jsonb,
	"tier2_clients" jsonb,
	"project_type_scores" jsonb,
	"auto_generate_threshold" integer DEFAULT 70 NOT NULL,
	"auto_generate_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "star_pipeline_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"closure_id" uuid NOT NULL,
	"output_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"content" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" text
);
--> statement-breakpoint
CREATE TABLE "storyboard_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storyboard_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"feedback" text,
	"client_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storyboard_scene_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scene_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"image_url" text NOT NULL,
	"prompt_used" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storyboard_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storyboard_id" uuid NOT NULL,
	"scene_order" integer NOT NULL,
	"description" text,
	"camera_direction" text,
	"mood" text,
	"image_url" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storyboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid,
	"title" text NOT NULL,
	"script_text" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"share_token" uuid,
	"share_expires_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "storyboards_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "sync_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"source" varchar(20) NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"ttl_seconds" integer DEFAULT 300 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(20) NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity_id" text,
	"payload" jsonb,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"name" text NOT NULL,
	"content" text NOT NULL,
	"format" varchar(20) DEFAULT 'markdown' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"rerun_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_email" varchar(255) NOT NULL,
	"team_member_name" varchar(255) NOT NULL,
	"code_name" varchar(20),
	"role" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"knowledge_text" text NOT NULL,
	"source" varchar(500),
	"confidence" varchar(20) DEFAULT 'observed',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"agent_type" varchar(50) NOT NULL,
	"label" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" text,
	"token_cost" integer,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"clickup_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "video_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storyboard_id" uuid,
	"project_name" varchar(500) NOT NULL,
	"client_name" varchar(255),
	"provider" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scenes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assembled_url" text,
	"share_token" uuid,
	"share_expires_at" timestamp,
	"cost_estimate_cents" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_previews_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "payment_terms_days" integer DEFAULT 45;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "clickup_space_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "sharepoint_folder" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "excel_tracker_filename" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "brand_guidelines_link" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "logo_folder_link" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "font_folder_link" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "arya_verification_log" ADD CONSTRAINT "arya_verification_log_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_candidates" ADD CONSTRAINT "case_study_candidates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_outputs" ADD CONSTRAINT "case_study_outputs_candidate_id_case_study_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."case_study_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_knowledge" ADD CONSTRAINT "client_knowledge_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_page_versions" ADD CONSTRAINT "landing_page_versions_landing_page_id_landing_pages_id_fk" FOREIGN KEY ("landing_page_id") REFERENCES "public"."landing_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD CONSTRAINT "landing_pages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_emails" ADD CONSTRAINT "processed_emails_inbox_item_id_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."inbox_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_closures" ADD CONSTRAINT "project_closures_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_teams" ADD CONSTRAINT "project_teams_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_pipeline_items" ADD CONSTRAINT "star_pipeline_items_closure_id_project_closures_id_fk" FOREIGN KEY ("closure_id") REFERENCES "public"."project_closures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_approvals" ADD CONSTRAINT "storyboard_approvals_storyboard_id_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."storyboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_scene_versions" ADD CONSTRAINT "storyboard_scene_versions_scene_id_storyboard_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."storyboard_scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_scenes" ADD CONSTRAINT "storyboard_scenes_storyboard_id_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."storyboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboards" ADD CONSTRAINT "storyboards_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_deliverables" ADD CONSTRAINT "team_deliverables_step_id_team_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."team_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_steps" ADD CONSTRAINT "team_steps_team_id_project_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."project_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_previews" ADD CONSTRAINT "video_previews_storyboard_id_storyboards_id_fk" FOREIGN KEY ("storyboard_id") REFERENCES "public"."storyboards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_arya_learnings_category" ON "arya_learnings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_arya_learnings_item_type" ON "arya_learnings" USING btree ("item_type");--> statement-breakpoint
CREATE INDEX "idx_arya_learnings_promoted" ON "arya_learnings" USING btree ("promoted");--> statement-breakpoint
CREATE INDEX "idx_arya_rules_active" ON "arya_rules" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_arya_rules_category" ON "arya_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_verification_log_task" ON "arya_verification_log" USING btree ("clickup_task_id");--> statement-breakpoint
CREATE INDEX "idx_verification_log_inbox" ON "arya_verification_log" USING btree ("inbox_item_id");--> statement-breakpoint
CREATE INDEX "idx_candidates_status" ON "case_study_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_candidates_score" ON "case_study_candidates" USING btree ("score_total");--> statement-breakpoint
CREATE INDEX "idx_candidates_client" ON "case_study_candidates" USING btree ("client_name");--> statement-breakpoint
CREATE INDEX "idx_outputs_candidate" ON "case_study_outputs" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "idx_outputs_type" ON "case_study_outputs" USING btree ("output_type");--> statement-breakpoint
CREATE INDEX "idx_ck_client_id" ON "client_knowledge" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_ck_contact_email" ON "client_knowledge" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "idx_ck_category" ON "client_knowledge" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_ck_client_division" ON "client_knowledge" USING btree ("client_id","division");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_project_conversation" ON "email_project_links" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_email_project_client_domain" ON "email_project_links" USING btree ("client_domain");--> statement-breakpoint
CREATE INDEX "idx_graph_subscriptions_expiration" ON "graph_subscriptions" USING btree ("expiration_date_time");--> statement-breakpoint
CREATE INDEX "idx_inbox_items_status" ON "inbox_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_inbox_items_created" ON "inbox_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_inbox_items_priority" ON "inbox_items" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_lp_versions_page" ON "landing_page_versions" USING btree ("landing_page_id");--> statement-breakpoint
CREATE INDEX "idx_landing_pages_client" ON "landing_pages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_landing_pages_status" ON "landing_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_landing_pages_slug" ON "landing_pages" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_processed_emails_message_id" ON "processed_emails" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_closures_status" ON "project_closures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_closures_clickup" ON "project_closures" USING btree ("clickup_task_id");--> statement-breakpoint
CREATE INDEX "idx_closures_client" ON "project_closures" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_closures_star_status" ON "project_closures" USING btree ("star_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_client_project_slug" ON "project_previews" USING btree ("client_slug","project_slug");--> statement-breakpoint
CREATE INDEX "idx_project_previews_project_id" ON "project_previews" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_teams_client" ON "project_teams" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_project_teams_status" ON "project_teams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quotes_client_name" ON "quotes" USING btree ("client_name");--> statement-breakpoint
CREATE INDEX "idx_quotes_created_by" ON "quotes" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_pipeline_closure" ON "star_pipeline_items" USING btree ("closure_id");--> statement-breakpoint
CREATE INDEX "idx_pipeline_output_type" ON "star_pipeline_items" USING btree ("output_type");--> statement-breakpoint
CREATE INDEX "idx_pipeline_status" ON "star_pipeline_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_storyboard_approvals_storyboard" ON "storyboard_approvals" USING btree ("storyboard_id");--> statement-breakpoint
CREATE INDEX "idx_scene_versions_scene" ON "storyboard_scene_versions" USING btree ("scene_id");--> statement-breakpoint
CREATE INDEX "idx_storyboard_scenes_storyboard" ON "storyboard_scenes" USING btree ("storyboard_id");--> statement-breakpoint
CREATE INDEX "idx_storyboards_client_id" ON "storyboards" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_storyboards_share_token" ON "storyboards" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "idx_storyboards_status" ON "storyboards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_cache_source" ON "sync_cache" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_source" ON "sync_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_sync_logs_created_at" ON "sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_team_deliverables_step" ON "team_deliverables" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_tk_email" ON "team_knowledge" USING btree ("team_member_email");--> statement-breakpoint
CREATE INDEX "idx_tk_role" ON "team_knowledge" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_tk_category" ON "team_knowledge" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_team_steps_team" ON "team_steps" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_video_previews_storyboard" ON "video_previews" USING btree ("storyboard_id");--> statement-breakpoint
CREATE INDEX "idx_video_previews_share" ON "video_previews" USING btree ("share_token");