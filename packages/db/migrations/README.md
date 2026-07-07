# Database Migrations

This directory is read by `drizzle-orm/postgres-js/migrator` (via `npm run db:migrate`,
called from `packages/db/src/migrate.ts`) and applied in order against `DATABASE_URL`.

## Files

| File | Purpose |
|---|---|
| `meta/_journal.json` | Ordered list of migration tags. The runtime migrator reads this to know which `.sql` files to apply and in what order. **Required.** |
| `0000_initial_schema.sql` | Baseline schema — all 14 tables, 9 enums, every FK and index defined in `src/schema.ts`, plus the `persons_search_vector_gin_idx` GIN index (applied as raw SQL since Drizzle's table builder doesn't yet support generated `tsvector` columns). |
| `0001_refresh_token_selector.sql` | Adds `refresh_tokens.token_selector` (indexed, unique) — enables O(1) refresh-token lookup. See `AuthService.refresh()`. |
| `meta/0000_snapshot.json`, `meta/0001_snapshot.json` | Schema snapshots used by `drizzle-kit generate` to diff future changes against. Generated programmatically from `schema.ts` (see `/scripts/gen_snapshots.py` in the project history) rather than via the `drizzle-kit` CLI, since this environment has no network access to install it. |

## Running migrations

```bash
# From packages/db
npm run db:migrate
```

This is also run automatically by `scripts/setup.sh` and in CI before the
API/worker processes start (see `.github/workflows/ci.yml`).

## Adding a new migration

Once dependencies are installed (`npm install` with network access):

```bash
cd packages/db
npx drizzle-kit generate --name <description>
```

`drizzle-kit` will diff `src/schema.ts` against `meta/0001_snapshot.json`,
generate `0002_<description>.sql`, write `meta/0002_snapshot.json`, and append
an entry to `meta/_journal.json`. If `drizzle-kit` reports the snapshot is out
of sync with the hand-authored `0000`/`0001` SQL above, regenerate the baseline
with `npx drizzle-kit generate --custom` and reconcile manually — the
hand-written SQL in `0000`/`0001` is the source of truth for what has actually
been applied to existing databases, and must never be edited once any
environment has run it.

## Verifying against a running database

```bash
# Confirm migrations table matches the journal
psql "$DATABASE_URL" -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id;"
```
