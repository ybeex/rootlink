CREATE TYPE "public"."privacy_level" AS ENUM('public', 'family', 'private');
--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'other', 'unknown');
--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'plus', 'pro');
--> statement-breakpoint
CREATE TYPE "public"."certainty" AS ENUM('confirmed', 'probable', 'possible', 'disputed');
--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('photo', 'document', 'audio', 'video');
--> statement-breakpoint
CREATE TYPE "public"."tree_role" AS ENUM('viewer', 'contributor', 'editor', 'admin', 'owner');
--> statement-breakpoint
CREATE TYPE "public"."hint_status" AS ENUM('pending', 'accepted', 'rejected', 'snoozed');
--> statement-breakpoint
CREATE TYPE "public"."edit_action" AS ENUM('create', 'update', 'delete', 'merge', 'restore');
--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('tree_invite', 'edit_made', 'hint_found', 'birthday_reminder', 'anniversary_reminder', 'conflict_detected', 'bio_ready');
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"avatar_url" varchar(2000),
	"subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"subscription_expires_at" timestamp with time zone,
	"stripe_customer_id" varchar(100),
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret" varchar(100),
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"email_verify_token" varchar(255),
	"email_verify_expires_at" timestamp with time zone,
	"password_reset_token" varchar(255),
	"password_reset_expires_at" timestamp with time zone,
	"total_storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"family" varchar(64) NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"privacy_level" "privacy_level" DEFAULT 'family' NOT NULL,
	"owner_id" uuid NOT NULL,
	"cover_media_id" uuid,
	"person_count" integer DEFAULT 0 NOT NULL,
	"media_count" integer DEFAULT 0 NOT NULL,
	"gedcom_exported_at" timestamp with time zone,
	"share_token" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tree_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "tree_role" NOT NULL,
	"invited_by_user_id" uuid,
	"invite_token" varchar(64),
	"invite_email" varchar(255),
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"first_name" varchar(200),
	"middle_name" varchar(200),
	"last_name" varchar(200),
	"maiden_name" varchar(200),
	"suffix" varchar(50),
	"preferred_name" varchar(200),
	"sex" "sex" DEFAULT 'unknown' NOT NULL,
	"is_living" boolean DEFAULT true NOT NULL,
	"privacy_level" "privacy_level" DEFAULT 'family' NOT NULL,
	"profile_media_id" uuid,
	"biography" text,
	"biography_generated_at" timestamp with time zone,
	"notes" text,
	"gedcom_id" varchar(100),
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_quality_score" integer DEFAULT 0 NOT NULL,
	"birth_year" integer,
	"death_year" integer,
	"search_vector" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"last_edited_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vital_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"tree_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"date_year" integer,
	"date_month" integer,
	"date_day" integer,
	"date_circa" boolean DEFAULT false NOT NULL,
	"date_before_year" integer,
	"date_after_year" integer,
	"end_date_year" integer,
	"place_display_name" varchar(500),
	"place_city" varchar(200),
	"place_state" varchar(200),
	"place_country" varchar(200),
	"place_country_code" varchar(2),
	"place_latitude" real,
	"place_longitude" real,
	"description" text,
	"certainty" "certainty" DEFAULT 'probable' NOT NULL,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"from_person_id" uuid NOT NULL,
	"to_person_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"start_date_year" integer,
	"end_date_year" integer,
	"certainty" "certainty" DEFAULT 'confirmed' NOT NULL,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"repository" varchar(500),
	"repository_url" varchar(2000),
	"media_id" uuid,
	"transcription" text,
	"notes" text,
	"confidence" "certainty" DEFAULT 'probable' NOT NULL,
	"published_year" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"type" "media_type" NOT NULL,
	"filename" varchar(500) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"storage_key" varchar(1000) NOT NULL,
	"thumbnail_key" varchar(1000),
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"caption" text,
	"date_taken_year" integer,
	"date_taken_month" integer,
	"date_taken_day" integer,
	"tagged_person_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_enhanced" boolean DEFAULT false NOT NULL,
	"processing_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "research_hints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"tree_id" uuid NOT NULL,
	"provider" varchar(100) NOT NULL,
	"external_record_id" varchar(500) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"record_url" varchar(2000),
	"confidence" real NOT NULL,
	"status" "hint_status" DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edit_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "edit_action" NOT NULL,
	"changed_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"performed_by" uuid NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"idempotency_key" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(64),
	"ip_address" varchar(45),
	"user_agent" text,
	"request_id" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trees" ADD CONSTRAINT "trees_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tree_members" ADD CONSTRAINT "tree_members_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tree_members" ADD CONSTRAINT "tree_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tree_members" ADD CONSTRAINT "tree_members_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "vital_events" ADD CONSTRAINT "vital_events_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_person_id_persons_id_fk" FOREIGN KEY ("from_person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_person_id_persons_id_fk" FOREIGN KEY ("to_person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "research_hints" ADD CONSTRAINT "research_hints_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "research_hints" ADD CONSTRAINT "research_hints_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "research_hints" ADD CONSTRAINT "research_hints_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_tree_id_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."trees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "edit_history" ADD CONSTRAINT "edit_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");
--> statement-breakpoint
CREATE INDEX "users_subscription_tier_idx" ON "users" USING btree ("subscription_tier");
--> statement-breakpoint
CREATE INDEX "users_stripe_customer_idx" ON "users" USING btree ("stripe_customer_id");
--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deleted_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_unique" ON "refresh_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" USING btree ("family");
--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "trees_owner_idx" ON "trees" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX "trees_privacy_idx" ON "trees" USING btree ("privacy_level");
--> statement-breakpoint
CREATE UNIQUE INDEX "trees_share_token_idx" ON "trees" USING btree ("share_token");
--> statement-breakpoint
CREATE INDEX "trees_deleted_at_idx" ON "trees" USING btree ("deleted_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "tree_members_unique" ON "tree_members" USING btree ("tree_id","user_id");
--> statement-breakpoint
CREATE INDEX "tree_members_tree_idx" ON "tree_members" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "tree_members_user_idx" ON "tree_members" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "tree_members_invite_token_idx" ON "tree_members" USING btree ("invite_token");
--> statement-breakpoint
CREATE INDEX "persons_tree_idx" ON "persons" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "persons_last_name_idx" ON "persons" USING btree ("last_name");
--> statement-breakpoint
CREATE INDEX "persons_birth_year_idx" ON "persons" USING btree ("birth_year");
--> statement-breakpoint
CREATE INDEX "persons_death_year_idx" ON "persons" USING btree ("death_year");
--> statement-breakpoint
CREATE INDEX "persons_quality_idx" ON "persons" USING btree ("data_quality_score");
--> statement-breakpoint
CREATE INDEX "persons_gedcom_idx" ON "persons" USING btree ("tree_id","gedcom_id");
--> statement-breakpoint
CREATE INDEX "persons_deleted_at_idx" ON "persons" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "persons_tree_living_idx" ON "persons" USING btree ("tree_id","is_living");
--> statement-breakpoint
CREATE INDEX "vital_events_person_idx" ON "vital_events" USING btree ("person_id");
--> statement-breakpoint
CREATE INDEX "vital_events_tree_idx" ON "vital_events" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "vital_events_type_idx" ON "vital_events" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "vital_events_year_idx" ON "vital_events" USING btree ("date_year");
--> statement-breakpoint
CREATE INDEX "vital_events_place_country_idx" ON "vital_events" USING btree ("place_country_code");
--> statement-breakpoint
CREATE INDEX "relationships_tree_idx" ON "relationships" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "relationships_from_idx" ON "relationships" USING btree ("from_person_id");
--> statement-breakpoint
CREATE INDEX "relationships_to_idx" ON "relationships" USING btree ("to_person_id");
--> statement-breakpoint
CREATE INDEX "relationships_type_idx" ON "relationships" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "relationships_pair_idx" ON "relationships" USING btree ("from_person_id","to_person_id");
--> statement-breakpoint
CREATE INDEX "sources_tree_idx" ON "sources" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "sources_type_idx" ON "sources" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "sources_created_by_idx" ON "sources" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX "media_tree_idx" ON "media_assets" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "media_uploaded_by_idx" ON "media_assets" USING btree ("uploaded_by");
--> statement-breakpoint
CREATE INDEX "media_type_idx" ON "media_assets" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "media_processing_idx" ON "media_assets" USING btree ("processing_status");
--> statement-breakpoint
CREATE UNIQUE INDEX "media_storage_key_idx" ON "media_assets" USING btree ("storage_key");
--> statement-breakpoint
CREATE INDEX "media_deleted_at_idx" ON "media_assets" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "hints_person_idx" ON "research_hints" USING btree ("person_id");
--> statement-breakpoint
CREATE INDEX "hints_tree_idx" ON "research_hints" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "hints_status_idx" ON "research_hints" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX "hints_provider_record_idx" ON "research_hints" USING btree ("person_id","provider","external_record_id");
--> statement-breakpoint
CREATE INDEX "edit_history_tree_idx" ON "edit_history" USING btree ("tree_id");
--> statement-breakpoint
CREATE INDEX "edit_history_entity_idx" ON "edit_history" USING btree ("entity_type","entity_id");
--> statement-breakpoint
CREATE INDEX "edit_history_performed_by_idx" ON "edit_history" USING btree ("performed_by");
--> statement-breakpoint
CREATE INDEX "edit_history_performed_at_idx" ON "edit_history" USING btree ("performed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "edit_history_idempotency_idx" ON "edit_history" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read");
--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");
--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");
--> statement-breakpoint
CREATE INDEX "idempotency_keys_user_idx" ON "idempotency_keys" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_idx" ON "idempotency_keys" USING btree ("expires_at");
--> statement-breakpoint
-- GIN index for full-text person search across name fields.
-- Applied as raw SQL since Drizzle's pgTable builder does not yet support
-- generated tsvector columns or GIN index types directly.
CREATE INDEX "persons_search_vector_gin_idx" ON "persons" USING gin (to_tsvector('simple', coalesce("search_vector", '')));
