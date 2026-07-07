-- Changes idempotency_keys' primary key from a single global column ("key"
-- alone) to a composite key on (user_id, key).
--
-- Previously "key" was the sole primary key, meaning it was unique across
-- ALL users, not just within one user's requests. The application-level
-- lookup was always correctly scoped by (key, userId), so this was never a
-- cross-user data leak — but if two different users' clients ever produced
-- the same key value (a non-random key generator, a client bug), the
-- second user's INSERT would silently fail against the primary-key
-- conflict (the existing onConflictDoNothing() swallows it), leaving that
-- user's idempotency protection never actually stored. A retry from that
-- user's client would then go unrecognized as a duplicate and execute
-- twice, defeating the feature for them. See
-- RootLink_MultiDisciplinary_Audit.md, Finding B2.
--
-- The old single-column index on user_id alone is dropped because the new
-- composite primary key's leading column (user_id) already serves the same
-- queries via B-tree prefix matching — keeping both would be redundant.
ALTER TABLE "idempotency_keys" DROP CONSTRAINT IF EXISTS "idempotency_keys_pkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "idempotency_keys_user_idx";
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_key_pk" PRIMARY KEY ("user_id", "key");
