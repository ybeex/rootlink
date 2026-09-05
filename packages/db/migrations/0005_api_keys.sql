-- API Access (Pro tier): apiKeys table. Same selector+hash pattern as
-- refresh_tokens (see 0001_refresh_token_selector.sql) — the full key is
-- only ever known to the client, at creation time.

CREATE TABLE "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "label" varchar(200) NOT NULL,
  "key_prefix" varchar(16) NOT NULL,
  "key_selector" varchar(32) NOT NULL,
  "key_hash" varchar(255) NOT NULL,
  "scopes" jsonb DEFAULT '["read"]'::jsonb NOT NULL,
  "last_used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE UNIQUE INDEX "api_keys_selector_unique" ON "api_keys" USING btree ("key_selector");
--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");
