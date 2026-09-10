-- Connected external accounts (FamilySearch OAuth, continuation plan §5
-- item 6). One row per user per provider; tokens stored encrypted (see
-- apps/api/src/lib/crypto.ts) since they must be reversible to actually
-- call the provider's API, unlike the argon2-hashed secrets this project
-- generates itself (refresh_tokens, api_keys).

CREATE TABLE "connected_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" varchar(50) NOT NULL,
  "provider_user_id" varchar(200),
  "access_token_encrypted" text NOT NULL,
  "refresh_token_encrypted" text,
  "expires_at" timestamp with time zone NOT NULL,
  "connected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE UNIQUE INDEX "connected_accounts_user_provider_unique" ON "connected_accounts" USING btree ("user_id", "provider");
--> statement-breakpoint
CREATE INDEX "connected_accounts_user_idx" ON "connected_accounts" USING btree ("user_id");
