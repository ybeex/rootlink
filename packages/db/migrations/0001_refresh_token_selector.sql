-- Adds an indexed, plaintext "selector" to refresh_tokens so refresh() can
-- locate the candidate row in O(1) instead of scanning up to 50 rows and
-- hash-comparing each one.
--
-- Tokens issued before this migration have no selector (column is NULL for
-- those rows). AuthService.refresh() detects the new "<selector>.<verifier>"
-- format by checking for a '.' at index 16; tokens without it fall back to
-- the bounded legacy scan (WHERE token_selector IS NULL) until they expire
-- naturally (refresh tokens are valid for 30 days), at which point this
-- fallback path becomes dead code and can be removed in a future migration.
ALTER TABLE "refresh_tokens" ADD COLUMN "token_selector" varchar(32);
--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_selector_unique" ON "refresh_tokens" USING btree ("token_selector");
