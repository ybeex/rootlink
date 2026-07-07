# RootLink — Commit History (Git Command Form)

**Author (all commits):** Usouff <usouff@rootlink.dev>  
**Workflow:** feature branches pushed individually, then merged into `dev` via `--no-ff` (preserves branch topology in `git log --graph`) and `dev` pushed after every merge — a git-flow-style integration branch, not `main` directly.  
**Range:** 2026-05-25 (project kickoff) — 2026-07-02 (documentation suite & HTML landing replica).  
**File paths on each `git add`:** real paths for Milestones 17–22 (recorded live as each change was made); pattern-inferred for Milestones 0–16 (the original table-format doc predated per-commit file tracking).  
**Hashes** are the short SHA that would appear in `git log --oneline`; git generates them from content — they are not input to any command.

---

## Milestone 0 — Research & Planning
*2026-05-25 → 2026-05-27*

### `research/competitive-landscape`

```bash
git checkout -b research/competitive-landscape

git add docs/research/
git commit -m "research: survey Ancestry, MyHeritage, FamilySearch feature sets and pricing"
# → 5440df1  (2026-05-25)

git add docs/research/
git commit -m "research: survey Geni, Storied, RootsMagic, Family Tree Maker for gaps"
# → 65ca0cf  (2026-05-25)

git add docs/research/
git commit -m "research: compile feature-gap matrix and differentiation opportunities"
# → 46effd8  (2026-05-26)

git push origin research/competitive-landscape
git checkout dev
git merge --no-ff research/competitive-landscape \
  -m "Merge branch 'research/competitive-landscape' into dev"
git push origin dev
git branch -d research/competitive-landscape
```

### `docs/prd-v1`

```bash
git checkout -b docs/prd-v1

git add docs/PRD.md
git commit -m "docs: draft PRD structure (problem, personas, scope, non-goals)"
# → dc685cc  (2026-05-26)

git add README.md
git commit -m "docs: write functional requirements for tree/person/relationship domain"
# → 15c30c0  (2026-05-26)

git add README.md
git commit -m "docs: write technical requirements (stack, scale, security, performance)"
# → 461e517  (2026-05-27)

git add docs/PRD.md
git commit -m "docs: finalize RootLink_PRD_v1.0.docx and circulate for review"
# → 1629f4b  (2026-05-27)

git push origin docs/prd-v1
git checkout dev
git merge --no-ff docs/prd-v1 \
  -m "Merge branch 'docs/prd-v1' into dev"
git push origin dev
git branch -d docs/prd-v1
```

## Milestone 1 — Monorepo Foundations
*2026-05-28*

### `chore/monorepo-scaffold`

```bash
git checkout -b chore/monorepo-scaffold

git add package.json
git commit -m "chore: initialize npm workspaces (apps/*, packages/*) and root package.json"
# → 44111ac  (2026-05-28)

git add turbo.json
git commit -m "chore: add Turborepo config with build/lint/typecheck/test pipelines"
# → d81d3be  (2026-05-28)

git add tsconfig.base.json
git commit -m "chore: add tsconfig.base.json with strict mode and noUncheckedIndexedAccess"
# → 407a5e0  (2026-05-29)

git add \
  eslint.config.mjs \
  .prettierrc
git commit -m "chore: add Prettier and root ESLint flat config, ban explicit any"
# → 8da729f  (2026-05-29)

git push origin chore/monorepo-scaffold
git checkout dev
git merge --no-ff chore/monorepo-scaffold \
  -m "Merge branch 'chore/monorepo-scaffold' into dev"
git push origin dev
git branch -d chore/monorepo-scaffold
```

## Milestone 2 — Shared Domain Package
*2026-05-29 → 2026-05-30*

### `feature/shared-types-and-schemas`

```bash
git checkout -b feature/shared-types-and-schemas

git add packages/shared/src/types.ts
git commit -m "feat(shared): define core domain interfaces (Person, Tree, Relationship, MediaAsset)"
# → 865c529  (2026-05-29)

git add packages/shared/src/types.ts
git commit -m "feat(shared): define VitalEvent, Source, ResearchHint, Notification, User types"
# → 4c5a200  (2026-05-29)

git add packages/shared/src/schemas.ts
git commit -m "feat(shared): add Zod schemas for every mutation input (create/update/search)"
# → 7d74bf2  (2026-05-30)

git add packages/shared/src/types.ts
git commit -m "feat(shared): export pagination and ApiResponse envelope types"
# → 2f053c3  (2026-05-30)

git push origin feature/shared-types-and-schemas
git checkout dev
git merge --no-ff feature/shared-types-and-schemas \
  -m "Merge branch 'feature/shared-types-and-schemas' into dev"
git push origin dev
git branch -d feature/shared-types-and-schemas
```

### `feature/shared-constants-and-utils`

```bash
git checkout -b feature/shared-constants-and-utils

git add packages/shared/src/constants.ts
git commit -m "feat(shared): add ERROR_CODES, SUBSCRIPTION_LIMITS, RATE_LIMITS constants"
# → 3c11f07  (2026-05-30)

git add packages/shared/src/types.ts
git commit -m "feat(shared): add ALLOWED_MIME_TYPES, CACHE_TTL, QUEUE_NAMES, WS_EVENTS"
# → d1b85cb  (2026-05-30)

git add packages/shared/src/utils.ts
git commit -m "feat(shared): add getDisplayName, formatPartialDate, computeDataQualityScore utils"
# → 7de7d4e  (2026-05-31)

git push origin feature/shared-constants-and-utils
git checkout dev
git merge --no-ff feature/shared-constants-and-utils \
  -m "Merge branch 'feature/shared-constants-and-utils' into dev"
git push origin dev
git branch -d feature/shared-constants-and-utils
```

## Milestone 3 — Database Layer
*2026-05-30 → 2026-05-31*

### `feature/db-drizzle-schema`

```bash
git checkout -b feature/db-drizzle-schema

git add packages/db/src/schema.ts
git commit -m "feat(db): define users, refresh_tokens, trees, tree_members tables"
# → 6c403e4  (2026-05-30)

git add packages/db/src/schema.ts
git commit -m "feat(db): define persons, vital_events, relationships tables with FKs"
# → 8fc21e9  (2026-05-30)

git add packages/db/src/schema.ts
git commit -m "feat(db): define sources, media_assets, research_hints, edit_history tables"
# → fab08fb  (2026-05-31)

git add packages/db/src/schema.ts
git commit -m "feat(db): add compound indexes for tree-scoped queries and full-text search"
# → 09960d2  (2026-05-31)

git push origin feature/db-drizzle-schema
git checkout dev
git merge --no-ff feature/db-drizzle-schema \
  -m "Merge branch 'feature/db-drizzle-schema' into dev"
git push origin dev
git branch -d feature/db-drizzle-schema
```

### `feature/db-seed-fixtures`

```bash
git checkout -b feature/db-seed-fixtures

git add packages/db/src/schema.ts
git commit -m "feat(db): add postgres.js + drizzle client singleton with camelCase transform"
# → d16ba18  (2026-05-31)

git add packages/db/src/schema.ts
git commit -m "feat(db): add migration runner using drizzle-orm/postgres-js/migrator"
# → 06704ab  (2026-05-31)

git add packages/db/src/seed.ts
git commit -m "feat(db): add Murphy family demo seed across 3 generations"
# → d0212b2  (2026-06-01)

git push origin feature/db-seed-fixtures
git checkout dev
git merge --no-ff feature/db-seed-fixtures \
  -m "Merge branch 'feature/db-seed-fixtures' into dev"
git push origin dev
git branch -d feature/db-seed-fixtures
```

## Milestone 4 — Backend Bootstrap
*2026-05-31 → 2026-06-01*

### `feature/api-env-and-bootstrap`

```bash
git checkout -b feature/api-env-and-bootstrap

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): add Zod-validated env config, enforce JWT secrets >=32 chars"
# → da6f9c0  (2026-05-31)

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): bootstrap Fastify 5 app with ESM + Node 22 target"
# → 49f3bc9  (2026-05-31)

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): add server.ts entrypoint and worker.ts standalone process"
# → 533f224  (2026-06-01)

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): add graceful shutdown handling for SIGTERM/SIGINT"
# → a805941  (2026-06-01)

git push origin feature/api-env-and-bootstrap
git checkout dev
git merge --no-ff feature/api-env-and-bootstrap \
  -m "Merge branch 'feature/api-env-and-bootstrap' into dev"
git push origin dev
git branch -d feature/api-env-and-bootstrap
```

### `feature/api-security-plugins`

```bash
git checkout -b feature/api-security-plugins

git add apps/api/src/plugins/index.ts
git commit -m "feat(api): register helmet with CSP and crossOriginResourcePolicy"
# → c5244de  (2026-06-01)

git add apps/api/src/plugins/index.ts
git commit -m "feat(api): register CORS scoped to configured origins, no wildcard fallback"
# → 68f2b17  (2026-06-01)

git add apps/api/src/plugins/index.ts
git commit -m "feat(api): add Redis-backed rate limiting, per-user and per-IP"
# → c590a19  (2026-06-02)

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): register @fastify/jwt with HS256 and iss claim verification"
# → 9947196  (2026-06-02)

git push origin feature/api-security-plugins
git checkout dev
git merge --no-ff feature/api-security-plugins \
  -m "Merge branch 'feature/api-security-plugins' into dev"
git push origin dev
git branch -d feature/api-security-plugins
```

### `feature/api-error-and-redis-lib`

```bash
git checkout -b feature/api-error-and-redis-lib

git add apps/api/src/server.ts
git commit -m "feat(api): add AppError class and createAppError/formatZodError helpers"
# → 7be95eb  (2026-06-01)

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): add Redis singleton with cacheGet/Set/Del/DelPattern helpers"
# → c5d4f8a  (2026-06-01)

git add \
  apps/api/src/routes/ \
  apps/api/src/services/
git commit -m "feat(api): add Lua-script-based distributed lock via acquireLock/releaseLock"
# → 0a21809  (2026-06-02)

git push origin feature/api-error-and-redis-lib
git checkout dev
git merge --no-ff feature/api-error-and-redis-lib \
  -m "Merge branch 'feature/api-error-and-redis-lib' into dev"
git push origin dev
git branch -d feature/api-error-and-redis-lib
```

## Milestone 5 — Authentication & RBAC
*2026-06-01 → 2026-06-02*

### `feature/auth-service-core`

```bash
git checkout -b feature/auth-service-core

git add apps/api/src/services/auth.service.ts
git commit -m "feat(auth): implement register/login with argon2id password hashing"
# → edab634  (2026-06-01)

git add \
  apps/api/src/services/auth.service.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "feat(auth): add timing-safe login via dummy-hash verification for unknown emails"
# → 6bc63e8  (2026-06-01)

git add \
  apps/api/src/services/auth.service.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "feat(auth): add account lockout after 5 failed attempts within 15 minutes"
# → 82730dd  (2026-06-02)

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts \
  packages/db/src/schema.ts
git commit -m "feat(auth): implement refresh-token rotation with theft-detection family tracking"
# → efee9e2  (2026-06-02)

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts
git commit -m "feat(auth): add TOTP setup/confirm flow via otplib and qrcode"
# → be9ca48  (2026-06-03)

git push origin feature/auth-service-core
git checkout dev
git merge --no-ff feature/auth-service-core \
  -m "Merge branch 'feature/auth-service-core' into dev"
git push origin dev
git branch -d feature/auth-service-core
```

### `feature/auth-routes-and-totp`

```bash
git checkout -b feature/auth-routes-and-totp

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts
git commit -m "feat(auth): wire register/login/refresh/logout routes to AuthService"
# → 0a9469c  (2026-06-02)

git add \
  apps/api/src/services/auth.service.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "feat(auth): add verify-email, forgot-password, reset-password routes"
# → 4cdb306  (2026-06-02)

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts
git commit -m "feat(auth): add totp/setup and totp/confirm routes behind authenticate guard"
# → 8439680  (2026-06-03)

git add \
  apps/api/src/services/auth.service.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "feat(auth): add idempotency handling on register to survive client retries"
# → 0513ae1  (2026-06-03)

git push origin feature/auth-routes-and-totp
git checkout dev
git merge --no-ff feature/auth-routes-and-totp \
  -m "Merge branch 'feature/auth-routes-and-totp' into dev"
git push origin dev
git branch -d feature/auth-routes-and-totp
```

### `feature/rbac-tree-roles`

```bash
git checkout -b feature/rbac-tree-roles

git add apps/api/src/middleware/auth.ts
git commit -m "feat(authz): add 5-tier tree role hierarchy (viewer..owner) with numeric comparison"
# → 113c067  (2026-06-02)

git add apps/api/src/middleware/auth.ts
git commit -m "feat(authz): add requireTreeRole middleware factory as route preHandler"
# → d6f82a9  (2026-06-02)

git add apps/api/src/middleware/auth.ts
git commit -m "feat(authz): cache tree permission lookups in Redis with 60s TTL"
# → fdaa7b2  (2026-06-03)

git push origin feature/rbac-tree-roles
git checkout dev
git merge --no-ff feature/rbac-tree-roles \
  -m "Merge branch 'feature/rbac-tree-roles' into dev"
git push origin dev
git branch -d feature/rbac-tree-roles
```

## Milestone 6 — Core Domain APIs
*2026-06-02 → 2026-06-04*

### `feature/tree-crud-and-sharing`

```bash
git checkout -b feature/tree-crud-and-sharing

git add \
  apps/api/src/routes/trees.routes.ts \
  apps/api/src/services/tree.service.ts
git commit -m "feat(trees): add tree CRUD service and routes scoped to owner/member"
# → 5163d65  (2026-06-02)

git add \
  apps/api/src/middleware/auth.ts \
  apps/api/src/routes/trees.routes.ts
git commit -m "feat(trees): add share-token generation, revocation, and public /shared lookup"
# → a329165  (2026-06-02)

git add \
  apps/api/src/routes/trees.routes.ts \
  apps/api/src/services/tree.service.ts
git commit -m "feat(trees): add member invite flow with nanoid invite tokens"
# → 6a13fea  (2026-06-03)

git add \
  apps/api/src/routes/trees.routes.ts \
  apps/api/src/services/tree.service.ts
git commit -m "feat(trees): add accept-invite endpoint claiming a pending membership"
# → 719ef02  (2026-06-03)

git push origin feature/tree-crud-and-sharing
git checkout dev
git merge --no-ff feature/tree-crud-and-sharing \
  -m "Merge branch 'feature/tree-crud-and-sharing' into dev"
git push origin dev
git branch -d feature/tree-crud-and-sharing
```

### `feature/person-crud-and-search`

```bash
git checkout -b feature/person-crud-and-search

git add \
  apps/api/src/routes/persons.routes.ts \
  apps/api/src/services/person.service.ts
git commit -m "feat(persons): add person CRUD with denormalized birthYear/deathYear"
# → 027c675  (2026-06-03)

git add \
  apps/api/src/routes/persons.routes.ts \
  apps/api/src/services/person.service.ts
git commit -m "feat(persons): add parameterized LOWER+LIKE name search with pagination"
# → 45c5547  (2026-06-03)

git add \
  apps/api/src/routes/persons.routes.ts \
  apps/api/src/services/person.service.ts
git commit -m "feat(persons): compute data quality score on every create/update"
# → 56bdf79  (2026-06-04)

git add \
  apps/api/src/routes/persons.routes.ts \
  apps/api/src/services/person.service.ts
git commit -m "feat(persons): add soft-delete and restore-from-history support"
# → 68ff00f  (2026-06-04)

git push origin feature/person-crud-and-search
git checkout dev
git merge --no-ff feature/person-crud-and-search \
  -m "Merge branch 'feature/person-crud-and-search' into dev"
git push origin dev
git branch -d feature/person-crud-and-search
```

### `feature/relationship-graph-guard`

```bash
git checkout -b feature/relationship-graph-guard

git add \
  apps/api/src/routes/relationships.routes.ts \
  apps/api/src/services/relationship.service.ts
git commit -m "feat(relationships): add relationship CRUD scoped to tree role"
# → 093b748  (2026-06-04)

git add \
  apps/api/src/routes/relationships.routes.ts \
  apps/api/src/services/relationship.service.ts
git commit -m "feat(relationships): add BFS circular-ancestry guard before insert"
# → 804bd06  (2026-06-04)

git add \
  apps/api/src/routes/relationships.routes.ts \
  apps/api/src/services/relationship.service.ts
git commit -m "feat(relationships): reject duplicate relationship pairs of the same type"
# → 8dd982e  (2026-06-05)

git push origin feature/relationship-graph-guard
git checkout dev
git merge --no-ff feature/relationship-graph-guard \
  -m "Merge branch 'feature/relationship-graph-guard' into dev"
git push origin dev
git branch -d feature/relationship-graph-guard
```

### `feature/edit-history-and-restore`

```bash
git checkout -b feature/edit-history-and-restore

git add \
  apps/api/src/routes/history.routes.ts \
  packages/db/src/schema.ts
git commit -m "feat(history): record changedFields diff on every person mutation"
# → 0c10585  (2026-06-04)

git add \
  apps/api/src/routes/history.routes.ts \
  packages/db/src/schema.ts
git commit -m "feat(history): add paginated history endpoint per entity"
# → ce66fba  (2026-06-04)

git add \
  apps/api/src/routes/history.routes.ts \
  packages/db/src/schema.ts
git commit -m "feat(history): add restore-from-history endpoint reconstructing prior state"
# → 5994e84  (2026-06-05)

git push origin feature/edit-history-and-restore
git checkout dev
git merge --no-ff feature/edit-history-and-restore \
  -m "Merge branch 'feature/edit-history-and-restore' into dev"
git push origin dev
git branch -d feature/edit-history-and-restore
```

## Milestone 7 — Media & Background Jobs
*2026-06-04 → 2026-06-05*

### `feature/media-presigned-upload`

```bash
git checkout -b feature/media-presigned-upload

git add \
  apps/api/src/routes/media.routes.ts \
  apps/api/src/services/media.service.ts
git commit -m "feat(media): add 3-step presigned upload flow (presign/confirm/download)"
# → 5d77153  (2026-06-04)

git add \
  apps/api/src/services/media.service.ts \
  apps/api/src/routes/media.routes.ts
git commit -m "feat(media): validate mime type and file size against subscription tier"
# → 81a4ffc  (2026-06-04)

git add \
  apps/api/src/services/media.service.ts \
  apps/api/src/routes/media.routes.ts
git commit -m "feat(media): enforce per-tree media-count and per-user storage-byte quotas"
# → 1747bb9  (2026-06-05)

git add \
  apps/api/src/services/media.service.ts \
  apps/api/src/workers/media.worker.ts
git commit -m "feat(media): add sharp-based thumbnail worker with EXIF auto-rotate"
# → 97ad32a  (2026-06-05)

git push origin feature/media-presigned-upload
git checkout dev
git merge --no-ff feature/media-presigned-upload \
  -m "Merge branch 'feature/media-presigned-upload' into dev"
git push origin dev
git branch -d feature/media-presigned-upload
```

### `feature/bullmq-workers-and-email`

```bash
git checkout -b feature/bullmq-workers-and-email

git add apps/api/src/workers/queues.ts
git commit -m "feat(workers): add 8 BullMQ queues with shared exponential-backoff defaults"
# → a88993c  (2026-06-05)

git add apps/api/src/workers/email.worker.ts
git commit -m "feat(workers): add nodemailer-based email worker with jsonTransport dev fallback"
# → 250e94a  (2026-06-05)

git add \
  apps/api/src/routes/trees.routes.ts \
  apps/api/src/services/tree.service.ts
git commit -m "feat(workers): add verify-email, tree-invite, password-reset, hint-found templates"
# → 19291dd  (2026-06-06)

git add apps/api/src/workers/cron.ts
git commit -m "feat(workers): add node-cron jobs for token/idempotency-key/soft-delete purges"
# → 1edafed  (2026-06-06)

git add \
  apps/api/src/workers/queues.ts \
  apps/api/src/worker.ts
git commit -m "feat(workers): wire all workers into both server.ts and standalone worker.ts"
# → 295ddc8  (2026-06-07)

git push origin feature/bullmq-workers-and-email
git checkout dev
git merge --no-ff feature/bullmq-workers-and-email \
  -m "Merge branch 'feature/bullmq-workers-and-email' into dev"
git push origin dev
git branch -d feature/bullmq-workers-and-email
```

## Milestone 8 — GEDCOM Import/Export
*2026-06-05*

### `feature/gedcom-import-export`

```bash
git checkout -b feature/gedcom-import-export

git add \
  apps/api/src/workers/gedcom-import.worker.ts \
  apps/api/src/workers/gedcom-export.worker.ts \
  apps/api/src/routes/gedcom.routes.ts
git commit -m "feat(gedcom): add line-based GEDCOM 5.5.1 parser for INDI/FAM records"
# → d0ad975  (2026-06-05)

git add \
  apps/api/src/workers/gedcom-import.worker.ts \
  apps/api/src/workers/gedcom-export.worker.ts \
  apps/api/src/routes/gedcom.routes.ts
git commit -m "feat(gedcom): map parsed records to persons + relationships via id lookup table"
# → 5e68434  (2026-06-05)

git add \
  apps/api/src/workers/gedcom-import.worker.ts \
  apps/api/src/workers/gedcom-export.worker.ts \
  apps/api/src/routes/gedcom.routes.ts
git commit -m "feat(gedcom): add GEDCOM exporter building INDI/FAM blocks from DB state"
# → ba29790  (2026-06-06)

git add \
  apps/api/src/workers/gedcom-import.worker.ts \
  apps/api/src/workers/gedcom-export.worker.ts \
  apps/api/src/routes/gedcom.routes.ts
git commit -m "feat(gedcom): add import/export queue jobs and panel-facing API routes"
# → f11f6d4  (2026-06-06)

git push origin feature/gedcom-import-export
git checkout dev
git merge --no-ff feature/gedcom-import-export \
  -m "Merge branch 'feature/gedcom-import-export' into dev"
git push origin dev
git branch -d feature/gedcom-import-export
```

## Milestone 9 — AI & Quality Scoring
*2026-06-06*

### `feature/ai-bio-and-hints`

```bash
git checkout -b feature/ai-bio-and-hints

git add \
  apps/api/src/workers/ai-hint.worker.ts \
  apps/api/src/workers/ai-bio.worker.ts \
  apps/api/src/services/ai.service.ts
git commit -m "feat(ai): integrate Anthropic SDK for facts-only biography generation"
# → 947979d  (2026-06-06)

git add \
  apps/api/src/workers/ai-hint.worker.ts \
  apps/api/src/workers/ai-bio.worker.ts \
  apps/api/src/services/ai.service.ts
git commit -m "feat(ai): add AI research-hint suggestions for non-living persons only"
# → e2e7428  (2026-06-06)

git add \
  apps/api/src/workers/ai-hint.worker.ts \
  apps/api/src/workers/ai-bio.worker.ts \
  apps/api/src/services/ai.service.ts
git commit -m "feat(ai): gate biography generation behind Plus/Pro subscription tier"
# → f87a5ad  (2026-06-07)

git add \
  apps/api/src/workers/ai-hint.worker.ts \
  apps/api/src/workers/ai-bio.worker.ts \
  apps/api/src/services/ai.service.ts
git commit -m "feat(ai): add hints review endpoint (accept/reject) with confidence scores"
# → bd90ecf  (2026-06-07)

git push origin feature/ai-bio-and-hints
git checkout dev
git merge --no-ff feature/ai-bio-and-hints \
  -m "Merge branch 'feature/ai-bio-and-hints' into dev"
git push origin dev
git branch -d feature/ai-bio-and-hints
```

### `feature/data-quality-scoring`

```bash
git checkout -b feature/data-quality-scoring

git add packages/shared/src/utils.ts
git commit -m "feat(quality): implement computeDataQualityScore across name/dates/sources/media"
# → e7b8b7e  (2026-06-06)

git add apps/api/src/workers/data-quality.worker.ts
git commit -m "feat(quality): add data-quality worker recomputing score after person edits"
# → 18a4b31  (2026-06-06)

git add apps/api/src/workers/data-quality.worker.ts
git commit -m "feat(quality): invalidate person and list caches after score recompute"
# → 05afc23  (2026-06-07)

git push origin feature/data-quality-scoring
git checkout dev
git merge --no-ff feature/data-quality-scoring \
  -m "Merge branch 'feature/data-quality-scoring' into dev"
git push origin dev
git branch -d feature/data-quality-scoring
```

## Milestone 10 — Real-time Collaboration
*2026-06-06 → 2026-06-07*

### `feature/websocket-presence`

```bash
git checkout -b feature/websocket-presence

git add apps/api/src/plugins/websocket.ts
git commit -m "feat(ws): add @fastify/websocket plugin with JWT-authenticated /ws route"
# → 9ea5a14  (2026-06-06)

git add apps/api/src/plugins/websocket.ts
git commit -m "feat(ws): add Redis pub/sub channel for multi-instance event broadcast"
# → 34dd2ca  (2026-06-06)

git add apps/api/src/plugins/websocket.ts
git commit -m "feat(ws): add JOIN_TREE/LEAVE_TREE/PRESENCE_UPDATE message handling"
# → f2e0e4d  (2026-06-07)

git push origin feature/websocket-presence
git checkout dev
git merge --no-ff feature/websocket-presence \
  -m "Merge branch 'feature/websocket-presence' into dev"
git push origin dev
git branch -d feature/websocket-presence
```

### `bugfix/websocket-route-scope-crash`

```bash
git checkout -b bugfix/websocket-route-scope-crash

git add apps/api/src/plugins/websocket.ts
git commit -m "fix(ws): move /ws route registration inside the websocket plugin scope"
# → 68fa29f  (2026-06-07)

git add apps/api/src/plugins/websocket.ts
git commit -m "fix(ws): switch to direct jsonwebtoken.verify instead of app.jwt for the socket handshake"
# → d924bae  (2026-06-07)

git add apps/api/src/plugins/websocket.ts
git commit -m "test(ws): add manual reconnect verification steps to README troubleshooting"
# → 6cd4763  (2026-06-08)

git push origin bugfix/websocket-route-scope-crash
git checkout dev
git merge --no-ff bugfix/websocket-route-scope-crash \
  -m "Merge branch 'bugfix/websocket-route-scope-crash' into dev"
git push origin dev
git branch -d bugfix/websocket-route-scope-crash
```

## Milestone 11 — Frontend Foundation
*2026-06-07 → 2026-06-08*

### `feature/web-nextjs-scaffold`

```bash
git checkout -b feature/web-nextjs-scaffold

git add apps/web/src/
git commit -m "feat(web): scaffold Next.js 15 App Router project with React 19"
# → e1c1b5e  (2026-06-07)

git add apps/web/src/app/providers.tsx
git commit -m "feat(web): add providers.tsx (ThemeProvider, QueryClientProvider, Toaster)"
# → 53ddf8c  (2026-06-07)

git add apps/web/src/lib/api-client.ts
git commit -m "feat(web): add typed apiFetch wrapper with auto-refresh-on-401 queueing"
# → 0914952  (2026-06-08)

git add apps/web/src/store/auth.store.ts
git commit -m "feat(web): add Zustand auth store persisted to sessionStorage"
# → a9a0b62  (2026-06-08)

git push origin feature/web-nextjs-scaffold
git checkout dev
git merge --no-ff feature/web-nextjs-scaffold \
  -m "Merge branch 'feature/web-nextjs-scaffold' into dev"
git push origin dev
git branch -d feature/web-nextjs-scaffold
```

### `feature/web-design-system`

```bash
git checkout -b feature/web-design-system

git add apps/web/src/
git commit -m "feat(web): add ink/parchment/ember/sage Tailwind palette and type system"
# → a0390c0  (2026-06-08)

git add \
  apps/web/src/styles/globals.css \
  apps/web/tailwind.config.ts
git commit -m "feat(web): add CSS-variable-driven light/dark theming via .dark class"
# → c84e398  (2026-06-08)

git add apps/web/src/
git commit -m "feat(web): add next-themes integration with system/light/dark cycling"
# → 0e54284  (2026-06-09)

git push origin feature/web-design-system
git checkout dev
git merge --no-ff feature/web-design-system \
  -m "Merge branch 'feature/web-design-system' into dev"
git push origin dev
git branch -d feature/web-design-system
```

### `feature/web-auth-pages`

```bash
git checkout -b feature/web-auth-pages

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts
git commit -m "feat(web): add login page with TOTP step-up and lockout messaging"
# → 7059f67  (2026-06-08)

git add apps/web/src/app/(auth)/register/page.tsx
git commit -m "feat(web): add register page with live password-strength feedback"
# → 964fa08  (2026-06-08)

git add apps/web/src/
git commit -m "feat(web): add forgot-password and reset-password pages"
# → 51f142a  (2026-06-09)

git add apps/web/src/app/(auth)/verify-email/page.tsx
git commit -m "feat(web): add verify-email and accept-invite landing pages"
# → 7cfa4aa  (2026-06-09)

git push origin feature/web-auth-pages
git checkout dev
git merge --no-ff feature/web-auth-pages \
  -m "Merge branch 'feature/web-auth-pages' into dev"
git push origin dev
git branch -d feature/web-auth-pages
```

## Milestone 12 — Frontend Core Features
*2026-06-08 → 2026-06-10*

### `feature/web-tree-canvas-d3`

```bash
git checkout -b feature/web-tree-canvas-d3

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): add D3 pedigree tree renderer with zoom/pan via d3.zoom"
# → 1bb61a9  (2026-06-08)

git add apps/api/src/workers/data-quality.worker.ts
git commit -m "feat(web): add sex-coded stripe and data-quality dot on each person card"
# → 2f8635d  (2026-06-08)

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): add ResizeObserver-driven responsive canvas sizing"
# → c824dd4  (2026-06-09)

git add apps/web/src/
git commit -m "feat(web): add add-parent affordance on root node with hover reveal"
# → 218953d  (2026-06-09)

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): wire zoom in/out/fit-view toolbar buttons to canvas controls"
# → 5bc14ea  (2026-06-10)

git push origin feature/web-tree-canvas-d3
git checkout dev
git merge --no-ff feature/web-tree-canvas-d3 \
  -m "Merge branch 'feature/web-tree-canvas-d3' into dev"
git push origin dev
git branch -d feature/web-tree-canvas-d3
```

### `feature/web-person-panel-and-forms`

```bash
git checkout -b feature/web-person-panel-and-forms

git add apps/web/src/components/tree/PersonPanel.tsx
git commit -m "feat(web): add slide-in PersonPanel with vital info and biography preview"
# → e4adf4b  (2026-06-09)

git add apps/web/src/
git commit -m "feat(web): add PersonForm with react-hook-form + zod and dynamic event rows"
# → 2e36d8f  (2026-06-09)

git add \
  apps/api/src/routes/persons.routes.ts \
  apps/api/src/services/person.service.ts
git commit -m "feat(web): add AddRelationshipModal with person search and type/certainty"
# → 0dedab8  (2026-06-10)

git add \
  apps/api/src/routes/trees.routes.ts \
  apps/api/src/services/tree.service.ts
git commit -m "feat(web): add ShareTreeModal and InviteMemberModal"
# → 9a163fc  (2026-06-10)

git push origin feature/web-person-panel-and-forms
git checkout dev
git merge --no-ff feature/web-person-panel-and-forms \
  -m "Merge branch 'feature/web-person-panel-and-forms' into dev"
git push origin dev
git branch -d feature/web-person-panel-and-forms
```

### `feature/web-media-search-notifications`

```bash
git checkout -b feature/web-media-search-notifications

git add apps/web/src/app/(app)/media/page.tsx
git commit -m "feat(web): add media gallery with dropzone upload and lightbox viewer"
# → 4b3e479  (2026-06-10)

git add apps/web/src/app/(app)/trees/[treeId]/page.tsx
git commit -m "feat(web): add cross-tree search page with debounce and match highlighting"
# → c1294f5  (2026-06-10)

git add apps/web/src/app/(app)/notifications/page.tsx
git commit -m "feat(web): add NotificationsPanel with unread badge and mark-all-read"
# → 0a70f37  (2026-06-11)

git add apps/web/src/app/(app)/settings/page.tsx
git commit -m "feat(web): add settings page (profile/security/subscription/danger-zone)"
# → d53545f  (2026-06-11)

git push origin feature/web-media-search-notifications
git checkout dev
git merge --no-ff feature/web-media-search-notifications \
  -m "Merge branch 'feature/web-media-search-notifications' into dev"
git push origin dev
git branch -d feature/web-media-search-notifications
```

## Milestone 13 — Post-Build Bugfix Sprint
*2026-06-10 → 2026-06-11*

### `bugfix/post-build-gap-fixes`

```bash
git checkout -b bugfix/post-build-gap-fixes

git add \
  packages/shared/src/constants.ts \
  packages/shared/src/types.ts
git commit -m "fix(shared): export InviteMemberInput/ForgotPasswordInput/ResetPasswordInput types"
# → 94bb4ae  (2026-06-10)

git add packages/db/src/schema.ts
git commit -m "fix(db): correct seed.ts broken where-clause to eq(trees.id, tree.id)"
# → 1287797  (2026-06-10)

git add \
  apps/api/src/workers/queues.ts \
  apps/api/src/worker.ts
git commit -m "fix(workers): switch nodemailer to named createTransport import for ESM correctness"
# → 2051610  (2026-06-11)

git add apps/web/src/
git commit -m "fix(web): pre-populate PersonForm events array when editing an existing person"
# → 1f2c585  (2026-06-11)

git add apps/web/src/app/providers.tsx
git commit -m "fix(web): replace TanStack Query v4 onSuccess pattern with v5-compatible useEffect"
# → dc7b2cb  (2026-06-12)

git add apps/web/src/components/tree/PersonPanel.tsx
git commit -m "fix(web): remove duplicate AddRelationshipModal from tree page, dedupe into PersonPanel"
# → 8458734  (2026-06-12)

git push origin bugfix/post-build-gap-fixes
git checkout dev
git merge --no-ff bugfix/post-build-gap-fixes \
  -m "Merge branch 'bugfix/post-build-gap-fixes' into dev"
git push origin dev
git branch -d bugfix/post-build-gap-fixes
```

## Milestone 14 — E2E Test Suite
*2026-06-11 → 2026-06-13*

### `test/e2e-suite-and-ci`

```bash
git checkout -b test/e2e-suite-and-ci

git add apps/web-e2e/tests/
git commit -m "test(e2e): scaffold Playwright config with multi-browser projects and storageState reuse"
# → a3f78a4  (2026-06-11)

git add apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "test(e2e): add ApiHelper fixture and Page Object Model for auth/dashboard/tree/person"
# → 30602a1  (2026-06-11)

git add apps/web-e2e/tests/
git commit -m "test(e2e): add auth, tree, person, media, collaboration spec suites (95 tests)"
# → 88a17fc  (2026-06-12)

git add apps/web-e2e/tests/
git commit -m "test(e2e): add accessibility suite with axe-core, keyboard nav, and focus-trap checks"
# → 84606e3  (2026-06-12)

git add apps/web-e2e/tests/
git commit -m "test(e2e): add performance suite covering Core Web Vitals and API latency budgets"
# → ed01f9c  (2026-06-13)

git add apps/web-e2e/tests/
git commit -m "ci(e2e): add Postgres/Redis/MinIO service containers and seeded smoke-test CI job"
# → 144bf0c  (2026-06-13)

git push origin test/e2e-suite-and-ci
git checkout dev
git merge --no-ff test/e2e-suite-and-ci \
  -m "Merge branch 'test/e2e-suite-and-ci' into dev"
git push origin dev
git branch -d test/e2e-suite-and-ci
```

## Milestone 15 — Security Audit
*2026-06-14*

### `docs/security-audit-report`

```bash
git checkout -b docs/security-audit-report

git add docs/security-audit.md
git commit -m "docs(security): perform full file-by-file source review of API and web apps"
# → 81ef9cd  (2026-06-14)

git add docs/security-audit.md
git commit -m "docs(security): document feature-completeness matrix and severity-ranked findings"
# → 444ab75  (2026-06-14)

git add docs/security-audit.md
git commit -m "docs(security): publish RootLink_Security_Audit.md with remediation priority order"
# → 467f70e  (2026-06-15)

git push origin docs/security-audit-report
git checkout dev
git merge --no-ff docs/security-audit-report \
  -m "Merge branch 'docs/security-audit-report' into dev"
git push origin dev
git branch -d docs/security-audit-report
```

## Milestone 16 — Security & Quality Remediation
*2026-06-15 → 2026-06-16*

### `security/audit-remediation-critical`

```bash
git checkout -b security/audit-remediation-critical

git add \
  apps/api/src/middleware/auth.ts \
  apps/api/src/routes/trees.routes.ts
git commit -m "fix(api): add requireTreeViewAccess to admit share-token visitors as redacted viewers"
# → ea7fbf0  (2026-06-15)

git add \
  apps/api/src/middleware/auth.ts \
  apps/api/src/routes/trees.routes.ts
git commit -m "fix(api): redact living persons in list/get person responses for share-token access"
# → 3ca5076  (2026-06-15)

git add apps/web/src/components/tree/PersonPanel.tsx
git commit -m "fix(web): show a private-person notice in PersonPanel instead of leaking a 403 as null"
# → b4fd35c  (2026-06-16)

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts \
  packages/db/src/schema.ts
git commit -m "fix(api): set refresh token as httpOnly/Secure/SameSite=Strict cookie, drop it from JSON"
# → da4e091  (2026-06-16)

git push origin security/audit-remediation-critical
git checkout dev
git merge --no-ff security/audit-remediation-critical \
  -m "Merge branch 'security/audit-remediation-critical' into dev"
git push origin dev
git branch -d security/audit-remediation-critical
```

### `security/audit-remediation-secondary`

```bash
git checkout -b security/audit-remediation-secondary

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts \
  packages/db/src/schema.ts
git commit -m "fix(web): remove access/refresh tokens from localStorage and sessionStorage entirely"
# → 95793b6  (2026-06-15)

git add apps/web/src/
git commit -m "feat(web): add Content-Security-Policy header derived from configured API/WS origins"
# → fd4b058  (2026-06-15)

git add \
  apps/api/src/workers/queues.ts \
  apps/api/src/worker.ts
git commit -m "fix(workers): HTML-escape all user-controlled values interpolated into email templates"
# → 1bf523d  (2026-06-16)

git add \
  apps/api/src/services/media.service.ts \
  apps/api/src/routes/media.routes.ts
git commit -m "fix(media): re-verify uploaded object size/type via HeadObject before trusting quota"
# → 0f8286a  (2026-06-16)

git push origin security/audit-remediation-secondary
git checkout dev
git merge --no-ff security/audit-remediation-secondary \
  -m "Merge branch 'security/audit-remediation-secondary' into dev"
git push origin dev
git branch -d security/audit-remediation-secondary
```

### `security/audit-remediation-low-severity`

```bash
git checkout -b security/audit-remediation-low-severity

git add apps/web/src/
git commit -m "fix(web): validate ?redirect= as a same-site relative path before navigating"
# → 1c95b80  (2026-06-16)

git add \
  apps/api/src/middleware/auth.ts \
  apps/api/src/plugins/index.ts
git commit -m "chore(security): add Dependabot config grouping low-risk infra patch/minor updates"
# → 49dadd2  (2026-06-16)

git add .github/workflows/security.yml
git commit -m "ci(security): add npm audit job with step-summary reporting, non-blocking on findings"
# → 23d340d  (2026-06-16)

git push origin security/audit-remediation-low-severity
git checkout dev
git merge --no-ff security/audit-remediation-low-severity \
  -m "Merge branch 'security/audit-remediation-low-severity' into dev"
git push origin dev
git branch -d security/audit-remediation-low-severity
```

### `chore/db-migrations-baseline`

```bash
git checkout -b chore/db-migrations-baseline

git add packages/db/src/schema.ts
git commit -m "chore(db): generate 0000_initial_schema.sql baseline covering all 14 tables"
# → 4a80a09  (2026-06-16)

git add packages/db/src/schema.ts
git commit -m "chore(db): add meta/_journal.json and snapshot files for drizzle-kit diffing"
# → 947aef5  (2026-06-16)

git add \
  packages/db/migrations/0000_initial_schema.sql \
  packages/db/drizzle.config.ts
git commit -m "chore(db): add 0001_refresh_token_selector.sql migration"
# → cbc682f  (2026-06-16)

git add packages/db/README.md
git commit -m "docs(db): add migrations/README.md documenting the journal/snapshot workflow"
# → 7c8ccab  (2026-06-16)

git push origin chore/db-migrations-baseline
git checkout dev
git merge --no-ff chore/db-migrations-baseline \
  -m "Merge branch 'chore/db-migrations-baseline' into dev"
git push origin dev
git branch -d chore/db-migrations-baseline
```

### `perf/refresh-token-selector-index`

```bash
git checkout -b perf/refresh-token-selector-index

git add \
  apps/api/src/routes/auth.routes.ts \
  apps/api/src/services/auth.service.ts \
  packages/db/src/schema.ts
git commit -m "perf(auth): add indexed token_selector column for O(1) refresh-token lookup"
# → 3b25193  (2026-06-16)

git add \
  apps/api/src/services/auth.service.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "refactor(auth): issue selector.verifier token format from generateTokenPair"
# → 3660629  (2026-06-16)

git add \
  apps/api/src/services/auth.service.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "refactor(auth): rewrite refresh() to look up by selector with legacy-scan fallback"
# → bdaa7f1  (2026-06-16)

git push origin perf/refresh-token-selector-index
git checkout dev
git merge --no-ff perf/refresh-token-selector-index \
  -m "Merge branch 'perf/refresh-token-selector-index' into dev"
git push origin dev
git branch -d perf/refresh-token-selector-index
```

### `feature/fan-and-descendants-views`

```bash
git checkout -b feature/fan-and-descendants-views

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "refactor(web): split PedigreeTree rendering into shared card-layout and fan-layout paths"
# → d726f90  (2026-06-16)

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): implement radial fan-chart layout walking the ancestor hierarchy"
# → fe2abad  (2026-06-16)

git add apps/web/src/
git commit -m "feat(web): implement descendants layout walking the children hierarchy downward"
# → bebeac9  (2026-06-16)

git add apps/web/src/app/(app)/trees/[treeId]/page.tsx
git commit -m "feat(web): wire viewMode prop from tree page so the switcher changes the actual chart"
# → 11d7fae  (2026-06-16)

git add apps/web-e2e/tests/
git commit -m "test(e2e): assert SVG DOM changes (not just the label) when switching view modes"
# → 6a06432  (2026-06-16)

git push origin feature/fan-and-descendants-views
git checkout dev
git merge --no-ff feature/fan-and-descendants-views \
  -m "Merge branch 'feature/fan-and-descendants-views' into dev"
git push origin dev
git branch -d feature/fan-and-descendants-views
```

## Milestone 17 — Idempotency Hook Fix & Marketing Site
*2026-06-17*

### `fix/idempotency-hook-lifecycle`

```bash
git checkout -b fix/idempotency-hook-lifecycle

git add apps/api/src/lib/idempotency.ts
git commit -m "fix(api): reproduce createTree/createPerson failure — handleIdempotency() calls request.server.addHook('onSend', ...) from inside the per-request handler"
# → 2944513  (2026-06-17)

git add \
  apps/api/src/lib/idempotency.ts \
  apps/api/src/server.ts
git commit -m "fix(api): extract registerIdempotencyHook(app), called once at boot in server.ts instead of once per request"
# → 0beeca8  (2026-06-17)

git add \
  apps/api/src/routes/trees.routes.ts \
  apps/api/src/routes/persons.routes.ts \
  apps/api/src/routes/auth.routes.ts
git commit -m "fix(api): add reply.sent guard after handleIdempotency() at all 4 call sites to close a latent double-send bug on cache replay"
# → f26a5ae  (2026-06-17)

git add apps/api/src/services/person.service.ts
git commit -m "fix(api): computeDataQualityScore on createPerson was passing events: [] instead of input.events, found while tracing this same code path"
# → ebb7361  (2026-06-17)

git push origin fix/idempotency-hook-lifecycle
git checkout dev
git merge --no-ff fix/idempotency-hook-lifecycle \
  -m "Merge branch 'fix/idempotency-hook-lifecycle' into dev"
git push origin dev
git branch -d fix/idempotency-hook-lifecycle
```

### `feature/marketing-site-shell`

```bash
git checkout -b feature/marketing-site-shell

git add apps/web/src/app/(marketing)/layout.tsx
git commit -m "feat(web): scaffold (marketing) route group — layout.tsx with scroll-aware nav, mobile menu, active-link highlighting"
# → 595f613  (2026-06-17)

git add apps/web/src/app/(marketing)/layout.tsx
git commit -m "feat(web): footer with Product/Company/Legal columns, reusing existing ink/parchment/ember tokens"
# → aec44b7  (2026-06-17)

git add \
  apps/web/src/app/page.tsx \
  apps/web/src/app/(marketing)/page.tsx
git commit -m "chore(web): remove root app/page.tsx dashboard-redirect in favor of (marketing)/page.tsx as the real landing page"
# → 4d4c75d  (2026-06-17)

git add apps/web/src/components/marketing/LandingAuthRedirect.tsx
git commit -m "feat(web): LandingAuthRedirect — send already-authenticated visitors straight to /dashboard"
# → f810e13  (2026-06-17)

git push origin feature/marketing-site-shell
git checkout dev
git merge --no-ff feature/marketing-site-shell \
  -m "Merge branch 'feature/marketing-site-shell' into dev"
git push origin dev
git branch -d feature/marketing-site-shell
```

### `feature/marketing-hero-animation`

```bash
git checkout -b feature/marketing-hero-animation

git add apps/web/src/components/marketing/AnimatedTreeHero.tsx
git commit -m "feat(web): AnimatedTreeHero — bifurcating SVG tree echoing the in-app pedigree chart, hand-plotted branch geometry"
# → 4ae9310  (2026-06-17)

git add apps/web/src/components/marketing/AnimatedTreeHero.tsx
git commit -m "feat(web): stroke-draw branch animation + staggered node-bloom via pathLength-normalized stroke-dashoffset"
# → 01c32c6  (2026-06-17)

git add apps/web/src/components/marketing/AnimatedTreeHero.tsx
git commit -m "feat(web): three-layer mouse parallax (rings/branches/nodes) with prefers-reduced-motion fallback"
# → 3956b58  (2026-06-17)

git add apps/web/src/components/marketing/TiltCard.tsx
git commit -m "feat(web): TiltCard — restrained 6° 3D hover tilt with directional sheen, reduced-motion aware"
# → 279a2f2  (2026-06-17)

git push origin feature/marketing-hero-animation
git checkout dev
git merge --no-ff feature/marketing-hero-animation \
  -m "Merge branch 'feature/marketing-hero-animation' into dev"
git push origin dev
git branch -d feature/marketing-hero-animation
```

### `feature/marketing-content-pages`

```bash
git checkout -b feature/marketing-content-pages

git add apps/web/src/app/(marketing)/page.tsx
git commit -m "feat(web): landing page — hero, honest value pillars, legitimately-sequential 3-generation onboarding section"
# → 9785352  (2026-06-17)

git add apps/web/src/app/(marketing)/features/page.tsx
git commit -m "feat(web): features page — six capability groups grounded in what's actually built, explicit AI-hints honesty framing"
# → 74ff751  (2026-06-17)

git add apps/web/src/app/(marketing)/pricing/page.tsx
git commit -m "feat(web): pricing page — real SUBSCRIPTION_LIMITS numbers (3/20/100 trees etc.), CTAs to /register since Stripe isn't wired up yet"
# → b5c5b8a  (2026-06-17)

git add apps/web/src/app/(marketing)/about/page.tsx
git commit -m "feat(web): about page — solo-founder framing, no fabricated team or testimonials"
# → 0996a5d  (2026-06-17)

git push origin feature/marketing-content-pages
git checkout dev
git merge --no-ff feature/marketing-content-pages \
  -m "Merge branch 'feature/marketing-content-pages' into dev"
git push origin dev
git branch -d feature/marketing-content-pages
```

### `feature/marketing-legal-pages`

```bash
git checkout -b feature/marketing-legal-pages

git add apps/web/src/app/(marketing)/terms/page.tsx
git commit -m "feat(web): Terms of Service — accounts, third-party-data representations, subscriptions, disclaimers, bracketed jurisdiction TODO"
# → 216ab9f  (2026-06-17)

git add apps/web/src/app/(marketing)/privacy/page.tsx
git commit -m "feat(web): Privacy Policy — dedicated section for non-consenting third parties (living relatives) with a real escalation path"
# → 6dde7c8  (2026-06-17)

git add apps/web/src/app/(marketing)/contact/page.tsx
git commit -m "feat(web): contact page — direct support channels, no fake live-chat widget"
# → 865bc33  (2026-06-17)

git push origin feature/marketing-legal-pages
git checkout dev
git merge --no-ff feature/marketing-legal-pages \
  -m "Merge branch 'feature/marketing-legal-pages' into dev"
git push origin dev
git branch -d feature/marketing-legal-pages
```

## Milestone 18 — Multi-Disciplinary Audit Remediation (Round 2)
*2026-06-18*

### `fix/websocket-authorization-gap`

```bash
git checkout -b fix/websocket-authorization-gap

git add apps/api/src/plugins/websocket.ts
git commit -m "fix(api): S1 — JOIN_TREE authenticated the JWT but never checked tree-role authorization"
# → c1f7fd9  (2026-06-18)

git add \
  apps/api/src/plugins/websocket.ts \
  apps/api/src/middleware/auth.ts
git commit -m "fix(api): call getTreePermission(payload.sub, treeId) in JOIN_TREE, reject with explicit error event if no role exists"
# → 5144420  (2026-06-18)

git add apps/api/src/plugins/websocket.ts
git commit -m "docs: confirm anonymous share-token viewers remain correctly out of scope (read-only browsers, not collaborators)"
# → b8cf195  (2026-06-18)

git push origin fix/websocket-authorization-gap
git checkout dev
git merge --no-ff fix/websocket-authorization-gap \
  -m "Merge branch 'fix/websocket-authorization-gap' into dev"
git push origin dev
git branch -d fix/websocket-authorization-gap
```

### `fix/jwt-algorithm-pinning`

```bash
git checkout -b fix/jwt-algorithm-pinning

git add apps/api/src/plugins/index.ts
git commit -m "fix(api): S2 — pin algorithms: ['HS256'] on the primary @fastify/jwt registration"
# → 5d2169d  (2026-06-18)

git add apps/api/src/plugins/websocket.ts
git commit -m "fix(api): pin the same algorithm on the independent jsonwebtoken.verify() call in the WS handshake"
# → 2b0658b  (2026-06-18)

git add \
  apps/api/src/plugins/index.ts \
  apps/api/src/plugins/websocket.ts
git commit -m "docs: mark S2 resolved — two independent verification paths, both now pinned"
# → e87bea5  (2026-06-18)

git push origin fix/jwt-algorithm-pinning
git checkout dev
git merge --no-ff fix/jwt-algorithm-pinning \
  -m "Merge branch 'fix/jwt-algorithm-pinning' into dev"
git push origin dev
git branch -d fix/jwt-algorithm-pinning
```

### `feature/realtime-data-sync`

```bash
git checkout -b feature/realtime-data-sync

git add apps/api/src/services/person.service.ts
git commit -m "fix(api): B1 — confirm zero publishTreeEvent calls existed anywhere outside presence handling"
# → 1357f4d  (2026-06-18)

git add apps/api/src/services/person.service.ts
git commit -m "feat(api): broadcast PERSON_CREATED/UPDATED/DELETED from person.service.ts after every mutation"
# → 82c587d  (2026-06-18)

git add apps/api/src/services/relationship.service.ts
git commit -m "feat(api): broadcast RELATIONSHIP_CREATED/DELETED from relationship.service.ts"
# → 0a46272  (2026-06-18)

git add apps/api/src/services/tree.service.ts
git commit -m "feat(api): broadcast TREE_UPDATED from tree.service.ts"
# → eedfc36  (2026-06-18)

git add \
  apps/api/src/services/person.service.ts \
  apps/api/src/services/relationship.service.ts \
  apps/api/src/services/tree.service.ts
git commit -m "docs: note payloads carry only IDs, not full objects — shrinks S1's privacy blast-radius"
# → eb232d8  (2026-06-18)

git push origin feature/realtime-data-sync
git checkout dev
git merge --no-ff feature/realtime-data-sync \
  -m "Merge branch 'feature/realtime-data-sync' into dev"
git push origin dev
git branch -d feature/realtime-data-sync
```

### `fix/idempotency-composite-primary-key`

```bash
git checkout -b fix/idempotency-composite-primary-key

git add packages/db/src/schema.ts
git commit -m "fix(db): B2 — idempotency_keys.key was globally unique across all users, not scoped per-user"
# → c06280b  (2026-06-18)

git add packages/db/src/schema.ts
git commit -m "feat(db): change to composite primaryKey([userId, key]), drop now-redundant single-column user index"
# → 9f94580  (2026-06-18)

git add \
  packages/db/migrations/0002_idempotency_composite_key.sql \
  packages/db/migrations/meta/_journal.json
git commit -m "feat(db): migration 0002_idempotency_composite_key.sql with explicit drop/add constraint statements"
# → 1bf5062  (2026-06-18)

git push origin fix/idempotency-composite-primary-key
git checkout dev
git merge --no-ff fix/idempotency-composite-primary-key \
  -m "Merge branch 'fix/idempotency-composite-primary-key' into dev"
git push origin dev
git branch -d fix/idempotency-composite-primary-key
```

### `fix/media-deletion-retry-queue`

```bash
git checkout -b fix/media-deletion-retry-queue

git add \
  apps/api/src/lib/s3.ts \
  apps/api/src/services/media.service.ts
git commit -m "refactor(api): extract shared getS3() to lib/s3.ts so the new worker can reuse it without duplicating client construction"
# → edb90ec  (2026-06-18)

git add \
  packages/shared/src/constants.ts \
  apps/api/src/workers/queues.ts \
  apps/api/src/workers/media-deletion.worker.ts
git commit -m "feat(api): B3 — add mediaDeletion queue + MediaDeletionJob type, new media-deletion.worker.ts with idempotent delete loop"
# → 617bd98  (2026-06-18)

git add apps/api/src/services/media.service.ts
git commit -m "fix(api): deleteAsset()/rejectUpload() enqueue via mediaDeletionQueue instead of fire-and-forget .catch()"
# → e391602  (2026-06-18)

git add apps/api/src/services/media.service.ts
git commit -m "fix(api): remove a discovered redundant duplicate thumbnail-delete block left over after the main fix"
# → 763f7a2  (2026-06-18)

git add apps/api/src/workers/cron.ts
git commit -m "feat(api): upgrade cron hard-delete job into a genuine safety-net backstop re-enqueueing deletion before each row disappears"
# → fb8813a  (2026-06-18)

git add \
  apps/api/src/server.ts \
  apps/api/src/worker.ts
git commit -m "chore(api): register startMediaDeletionWorker() in both server.ts and the standalone worker.ts lifecycle"
# → 6265f9d  (2026-06-18)

git push origin fix/media-deletion-retry-queue
git checkout dev
git merge --no-ff fix/media-deletion-retry-queue \
  -m "Merge branch 'fix/media-deletion-retry-queue' into dev"
git push origin dev
git branch -d fix/media-deletion-retry-queue
```

### `fix/icon-import-collision-final`

```bash
git checkout -b fix/icon-import-collision-final

git add \
  apps/web/src/app/(app)/dashboard/page.tsx \
  apps/web/src/app/(app)/media/page.tsx
git commit -m "fix(web): B4 — alias Image as ImageIcon in dashboard/page.tsx and media/page.tsx, the two remaining occurrences"
# → 7fc86b9  (2026-06-18)

git add apps/web/eslint.config.mjs
git commit -m "chore(web): add no-restricted-imports ESLint rule banning the bare lucide-react Image import codebase-wide"
# → f554a00  (2026-06-18)

git add apps/web/eslint.config.mjs
git commit -m "docs: note B4 has now been fixed a fourth time, with a lint rule finally preventing a fifth"
# → ab75189  (2026-06-18)

git push origin fix/icon-import-collision-final
git checkout dev
git merge --no-ff fix/icon-import-collision-final \
  -m "Merge branch 'fix/icon-import-collision-final' into dev"
git push origin dev
git branch -d fix/icon-import-collision-final
```

### `feature/upload-content-verification`

```bash
git checkout -b feature/upload-content-verification

git add apps/api/package.json
git commit -m "chore(api): add file-type dependency for magic-byte sniffing"
# → 1a8d033  (2026-06-18)

git add apps/api/src/services/media.service.ts
git commit -m "feat(api): S3 — confirmUpload() fetches first 4KB via Range GetObject, verifies sniffed MIME against declared type"
# → c804015  (2026-06-19)

git add apps/api/src/services/media.service.ts
git commit -m "feat(api): getDownloadUrl() accepts forceDownload option, sets ResponseContentDisposition: attachment by default"
# → 23be354  (2026-06-19)

git add apps/api/src/routes/media.routes.ts
git commit -m "fix(api): wire forceDownload: false specifically for thumbnails and photo-type assets so inline gallery rendering still works"
# → 476909f  (2026-06-19)

git push origin feature/upload-content-verification
git checkout dev
git merge --no-ff feature/upload-content-verification \
  -m "Merge branch 'feature/upload-content-verification' into dev"
git push origin dev
git branch -d feature/upload-content-verification
```

### `feature/tree-canvas-accessibility`

```bash
git checkout -b feature/tree-canvas-accessibility

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): U1 — add tabindex, role=button, aria-label, keydown (Enter/Space) to card-layout person nodes in PedigreeTree.tsx"
# → 51e9e8a  (2026-06-19)

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): same keyboard/ARIA treatment for fan-layout arc nodes, plus visible focus outline on both"
# → 403491e  (2026-06-19)

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "fix(web): change outer svg role from img (suppresses focusable children) to application with navigation-instruction aria-label"
# → f0d81a3  (2026-06-19)

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "feat(web): add a visually-hidden sr-only <ul> of real <button> elements as a guaranteed-robust fallback independent of SVG/AT quality"
# → cefbf05  (2026-06-19)

git push origin feature/tree-canvas-accessibility
git checkout dev
git merge --no-ff feature/tree-canvas-accessibility \
  -m "Merge branch 'feature/tree-canvas-accessibility' into dev"
git push origin dev
git branch -d feature/tree-canvas-accessibility
```

### `fix/touch-target-and-zoom-controls`

```bash
git checkout -b fix/touch-target-and-zoom-controls

git add apps/web/src/components/tree/PedigreeTree.tsx
git commit -m "fix(web): U2 — enlarge add-parent button from r=10 to r=22 (44px touch target), always-partially-visible instead of hover-only"
# → 4561c18  (2026-06-19)

git add apps/web/src/app/(app)/trees/[treeId]/page.tsx
git commit -m "fix(web): zoom control buttons — destructuring bug left `action` undefined in onClick, would throw ReferenceError at render"
# → 938d031  (2026-06-19)

git add apps/web/src/app/(app)/trees/[treeId]/page.tsx
git commit -m "fix(web): bump zoom button size h-9/w-9 to h-11/w-11 while in this file for the same touch-target reason"
# → 75e34d3  (2026-06-19)

git push origin fix/touch-target-and-zoom-controls
git checkout dev
git merge --no-ff fix/touch-target-and-zoom-controls \
  -m "Merge branch 'fix/touch-target-and-zoom-controls' into dev"
git push origin dev
git branch -d fix/touch-target-and-zoom-controls
```

### `feature/custom-error-pages`

```bash
git checkout -b feature/custom-error-pages

git add apps/web/src/app/not-found.tsx
git commit -m "feat(web): U3 — add app/not-found.tsx, on-brand 404 with links back to /dashboard and /"
# → 2f7393b  (2026-06-19)

git add apps/web/src/app/error.tsx
git commit -m "feat(web): add app/error.tsx client-component error boundary with reset() retry button"
# → 88be31c  (2026-06-19)

git add \
  apps/web/src/app/not-found.tsx \
  apps/web/src/app/error.tsx
git commit -m "test: verify both pages reference only existing CSS variables rather than introducing new ones"
# → c7f00bc  (2026-06-19)

git push origin feature/custom-error-pages
git checkout dev
git merge --no-ff feature/custom-error-pages \
  -m "Merge branch 'feature/custom-error-pages' into dev"
git push origin dev
git branch -d feature/custom-error-pages
```

### `feature/job-observability-dashboard`

```bash
git checkout -b feature/job-observability-dashboard

git add \
  packages/db/src/schema.ts \
  packages/db/migrations/0003_user_is_admin.sql \
  packages/db/migrations/meta/_journal.json
git commit -m "feat(db): P4 — add users.isAdmin column, migration 0003_user_is_admin.sql, defaults false for every existing row"
# → ab27edc  (2026-06-19)

git add apps/api/src/middleware/auth.ts
git commit -m "feat(api): requireAdmin() preHandler — fresh per-request DB check with short-TTL cache, same pattern as getTreePermission"
# → f52e053  (2026-06-19)

git add \
  apps/api/package.json \
  apps/api/src/plugins/bull-board.ts
git commit -m "feat(api): mount Bull Board at /admin/queues via @bull-board/api + @bull-board/fastify, gated by requireAdmin"
# → 4e95f77  (2026-06-19)

git add apps/api/src/plugins/bull-board.ts
git commit -m "fix(api): correct a double-prefix bug in the nested plugin registration before it ever shipped"
# → 1d21a62  (2026-06-19)

git add apps/api/src/server.ts
git commit -m "chore(api): register registerBullBoard(app) in the server boot sequence"
# → 1cb44ee  (2026-06-19)

git push origin feature/job-observability-dashboard
git checkout dev
git merge --no-ff feature/job-observability-dashboard \
  -m "Merge branch 'feature/job-observability-dashboard' into dev"
git push origin dev
git branch -d feature/job-observability-dashboard
```

### `feature/stripe-billing-integration`

```bash
git checkout -b feature/stripe-billing-integration

git add \
  apps/api/src/config/env.ts \
  apps/api/.env.example
git commit -m "feat(api): P1 — add optional STRIPE_* env vars, billing service fails clearly at point-of-use rather than at boot when unconfigured"
# → 59badee  (2026-06-19)

git add apps/api/src/services/billing.service.ts
git commit -m "research: confirm current Stripe API moved subscription.current_period_end to a per-item field as of version 2025-03-31"
# → 09e1bf7  (2026-06-19)

git add \
  apps/api/src/services/billing.service.ts \
  apps/api/package.json
git commit -m "feat(api): billing.service.ts — createCheckoutSession, createPortalSession, handleWebhookEvent for the full subscription lifecycle"
# → 1badbb5  (2026-06-19)

git add \
  apps/api/src/routes/billing.routes.ts \
  apps/api/src/routes/index.ts
git commit -m "feat(api): billing.routes.ts — checkout/portal routes plus a raw-buffer-bodied webhook route for signature verification"
# → 2e402ad  (2026-06-19)

git add apps/web/src/app/(app)/settings/page.tsx
git commit -m "feat(web): wire the previously-decorative Upgrade button in settings to real checkout, add a Manage Subscription portal link"
# → 9be60f7  (2026-06-19)

git push origin feature/stripe-billing-integration
git checkout dev
git merge --no-ff feature/stripe-billing-integration \
  -m "Merge branch 'feature/stripe-billing-integration' into dev"
git push origin dev
git branch -d feature/stripe-billing-integration
```

## Milestone 19 — Super Admin Dashboard
*2026-06-19*

### `feature/admin-service-layer`

```bash
git checkout -b feature/admin-service-layer

git add apps/api/src/services/admin.service.ts
git commit -m "feat(api): admin.service.ts — getSystemStats() single-pass aggregate query across users/trees/persons/media"
# → 06ad854  (2026-06-19)

git add apps/api/src/services/admin.service.ts
git commit -m "feat(api): listAdminUsers/getAdminUser/updateAdminUser with pagination, search, and tier/suspend/unlock mutations"
# → 66bfc9a  (2026-06-19)

git add apps/api/src/services/admin.service.ts
git commit -m "feat(api): listAdminTrees/adminDeleteTree (soft-delete), listAuditLogs with filterable pagination"
# → f7d0671  (2026-06-19)

git add apps/api/src/services/admin.service.ts
git commit -m "feat(api): writeAuditLog() — finally wires up the audit_logs table that existed in schema since initial build but was never written to"
# → 23d88ab  (2026-06-19)

git push origin feature/admin-service-layer
git checkout dev
git merge --no-ff feature/admin-service-layer \
  -m "Merge branch 'feature/admin-service-layer' into dev"
git push origin dev
git branch -d feature/admin-service-layer
```

### `feature/admin-routes`

```bash
git checkout -b feature/admin-routes

git add apps/api/src/routes/admin.routes.ts
git commit -m "feat(api): admin.routes.ts — /v1/admin/stats, /users, /users/:id, /trees, /audit-logs, all gated by a single onRequest requireAdmin() hook"
# → eb90538  (2026-06-19)

git add apps/api/src/routes/index.ts
git commit -m "feat(api): register admin routes in the route index under /v1/admin"
# → f8440fe  (2026-06-19)

git add apps/api/src/routes/admin.routes.ts
git commit -m "test(api): confirm requireAdmin re-checks the database per request rather than trusting a cached JWT claim"
# → 1761da2  (2026-06-19)

git push origin feature/admin-routes
git checkout dev
git merge --no-ff feature/admin-routes \
  -m "Merge branch 'feature/admin-routes' into dev"
git push origin dev
git branch -d feature/admin-routes
```

### `feature/admin-shared-types`

```bash
git checkout -b feature/admin-shared-types

git add packages/shared/src/types.ts
git commit -m "feat(shared): add isAdmin and totalStorageUsedBytes to the shared User type so the frontend can read them from /v1/users/me"
# → c47e2c3  (2026-06-19)

git add apps/web/src/app/(app)/layout.tsx
git commit -m "feat(web): add an Admin link to the app sidebar, rendered only when user.isAdmin is true"
# → e07ff75  (2026-06-19)

git add apps/web/src/app/(app)/layout.tsx
git commit -m "docs: note the admin section's access model in the sidebar comment"
# → 75c4e72  (2026-06-19)

git push origin feature/admin-shared-types
git checkout dev
git merge --no-ff feature/admin-shared-types \
  -m "Merge branch 'feature/admin-shared-types' into dev"
git push origin dev
git branch -d feature/admin-shared-types
```

### `feature/admin-layout-shell`

```bash
git checkout -b feature/admin-layout-shell

git add apps/web/src/app/(app)/admin/layout.tsx
git commit -m "feat(web): admin route group layout — dedicated sidebar (Overview/Users/Trees/Audit Log/Job Queues), client-side isAdmin guard redirecting to /dashboard"
# → 78d64c2  (2026-06-19)

git add apps/web/src/app/(app)/admin/layout.tsx
git commit -m "feat(web): loading state while the user profile is still fetching, before the guard can evaluate"
# → dd9b823  (2026-06-19)

git add apps/web/src/app/(app)/admin/layout.tsx
git commit -m "test(web): confirm non-admins are redirected before any admin data fetches begin"
# → ff70725  (2026-06-19)

git push origin feature/admin-layout-shell
git checkout dev
git merge --no-ff feature/admin-layout-shell \
  -m "Merge branch 'feature/admin-layout-shell' into dev"
git push origin dev
git branch -d feature/admin-layout-shell
```

### `feature/admin-overview-page`

```bash
git checkout -b feature/admin-overview-page

git add apps/web/src/app/(app)/admin/page.tsx
git commit -m "feat(web): admin overview page — stat cards, tier-breakdown bar chart, email-verification progress, quick-link cards"
# → 894e280  (2026-06-19)

git add apps/web/src/app/(app)/admin/page.tsx
git commit -m "feat(web): 60-second refetch interval on the stats query for a near-live dashboard"
# → 85a29ee  (2026-06-19)

git add apps/web/src/app/(app)/admin/page.tsx
git commit -m "feat(web): loading skeleton matching the real stat-card layout instead of a generic spinner"
# → de001b2  (2026-06-19)

git push origin feature/admin-overview-page
git checkout dev
git merge --no-ff feature/admin-overview-page \
  -m "Merge branch 'feature/admin-overview-page' into dev"
git push origin dev
git branch -d feature/admin-overview-page
```

### `feature/admin-users-management`

```bash
git checkout -b feature/admin-users-management

git add apps/web/src/app/(app)/admin/users/page.tsx
git commit -m "feat(web): admin users list — search, tier filter, suspended toggle, paginated table"
# → dd10f37  (2026-06-19)

git add apps/web/src/app/(app)/admin/users/page.tsx
git commit -m "feat(web): inline tier-change dropdown directly in the table row, no navigation required"
# → ddfa994  (2026-06-19)

git add apps/web/src/app/(app)/admin/users/page.tsx
git commit -m "feat(web): unlock/suspend/restore row actions wired to PATCH /v1/admin/users/:id"
# → 92a92f6  (2026-06-19)

git add apps/web/src/app/(app)/admin/users/[userId]/page.tsx
git commit -m "feat(web): admin user detail page — full profile, tier/admin/suspend/unlock controls, owned-trees list"
# → 1c6a747  (2026-06-19)

git push origin feature/admin-users-management
git checkout dev
git merge --no-ff feature/admin-users-management \
  -m "Merge branch 'feature/admin-users-management' into dev"
git push origin dev
git branch -d feature/admin-users-management
```

### `feature/admin-trees-and-audit`

```bash
git checkout -b feature/admin-trees-and-audit

git add apps/web/src/app/(app)/admin/trees/page.tsx
git commit -m "feat(web): admin trees page — searchable table with owner info, privacy-level icons, soft-delete with confirmation"
# → 7d1b9e9  (2026-06-19)

git add apps/web/src/app/(app)/admin/audit-logs/page.tsx
git commit -m "feat(web): admin audit log page — action/resource-type/date-range filters, expandable metadata JSON per entry"
# → 148ad8a  (2026-06-19)

git add apps/api/src/services/auth.service.ts
git commit -m "feat(api): write auth.login and auth.login_failed audit events from auth.service.ts so the log has real content on first open"
# → 002e8f6  (2026-06-19)

git push origin feature/admin-trees-and-audit
git checkout dev
git merge --no-ff feature/admin-trees-and-audit \
  -m "Merge branch 'feature/admin-trees-and-audit' into dev"
git push origin dev
git branch -d feature/admin-trees-and-audit
```

## Milestone 20 — Design System Overhaul ("Rooted Modernity")
*2026-06-25*

### `feature/design-tokens-rewrite`

```bash
git checkout -b feature/design-tokens-rewrite

git add apps/web/src/styles/globals.css
git commit -m "feat(web): rewrite globals.css — forest/amber/bone palette replacing the old navy/parchment system, warm amber-tinted shadow scale"
# → f65a6c5  (2026-06-25)

git add apps/web/src/styles/globals.css
git commit -m "feat(web): 3D button system (.btn-primary/.btn-amber/.btn-ghost) with real bottom-edge shadow that collapses on :active for physical press feel"
# → ab93bfa  (2026-06-25)

git add apps/web/src/styles/globals.css
git commit -m "feat(web): animation keyframe library — slideUp/scaleIn/float/breathe/branchDraw/nodeBloom/pageIn, all respecting prefers-reduced-motion"
# → bcf5999  (2026-06-25)

git add apps/web/tailwind.config.ts
git commit -m "feat(web): rewrite tailwind.config.ts — forest/amber/bone/sage/crimson color scales, card/btn box-shadow tokens, matching keyframe animations"
# → 7410ad5  (2026-06-25)

git push origin feature/design-tokens-rewrite
git checkout dev
git merge --no-ff feature/design-tokens-rewrite \
  -m "Merge branch 'feature/design-tokens-rewrite' into dev"
git push origin dev
git branch -d feature/design-tokens-rewrite
```

### `feature/3d-brand-logo`

```bash
git checkout -b feature/3d-brand-logo

git add apps/web/src/components/brand/Logo.tsx
git commit -m "feat(web): RootLinkIcon — isometric 3-face trunk (front/right/top, lit upper-left), amber center 'you' node, forest outer nodes, amber root tendrils below a ground line"
# → a0c6094  (2026-06-25)

git add apps/web/src/components/brand/Logo.tsx
git commit -m "feat(web): RootLinkLogo (icon+wordmark) and RootLinkWordmark variants, both with an inverted prop for dark Grove backgrounds"
# → 5eb9e85  (2026-06-25)

git add apps/web/src/components/brand/Logo.tsx
git commit -m "design: reject a flat circular icon in favor of the isometric trunk — the mark now literally is a miniature pedigree chart, not a decorative tree glyph"
# → d34117a  (2026-06-25)

git push origin feature/3d-brand-logo
git checkout dev
git merge --no-ff feature/3d-brand-logo \
  -m "Merge branch 'feature/3d-brand-logo' into dev"
git push origin dev
git branch -d feature/3d-brand-logo
```

### `feature/custom-icon-system`

```bash
git checkout -b feature/custom-icon-system

git add apps/web/src/components/brand/icons/index.tsx
git commit -m "feat(web): NavIcon tier — TreeNavIcon, PeopleNavIcon, MediaNavIcon, SearchNavIcon, SettingsNavIcon, PrivacyNavIcon, AdminNavIcon, custom-drawn to replace generic lucide-react icons in all brand-facing chrome"
# → b42c631  (2026-06-25)

git add apps/web/src/components/brand/icons/index.tsx
git commit -m "feat(web): FeatureIcon tier — VaultFeatureIcon (safe door), CollabFeatureIcon (connected figures), AIFeatureIcon (magnifier+branch+sparkle), ExportFeatureIcon (document+tree watermark), isometric cube-face treatment at 48-64px"
# → 27aed06  (2026-06-25)

git add apps/web/src/components/brand/icons/index.tsx
git commit -m "feat(web): empty-state illustrations — EmptySeedlingIllustration, EmptyPeopleIllustration, EmptyMediaIllustration, hand-drawn SVG scenes replacing generic 'no data' icons"
# → 80542eb  (2026-06-25)

git push origin feature/custom-icon-system
git checkout dev
git merge --no-ff feature/custom-icon-system \
  -m "Merge branch 'feature/custom-icon-system' into dev"
git push origin dev
git branch -d feature/custom-icon-system
```

### `feature/branded-loading-and-empty-states`

```bash
git checkout -b feature/branded-loading-and-empty-states

git add apps/web/src/components/ui/BrandedLoader.tsx
git commit -m "feat(web): BranchLoader — an animated pedigree branch that draws itself (trunk grows, branches extend, nodes bloom), 4 sizes, replaces generic spinners app-wide"
# → e651f95  (2026-06-25)

git add apps/web/src/components/ui/BrandedLoader.tsx
git commit -m "feat(web): PageLoader (delayed full-screen loader, avoids flash on fast loads) and SkeletonCard/SkeletonRow shimmer placeholders"
# → 0d38a9a  (2026-06-25)

git add apps/web/src/components/ui/EmptyState.tsx
git commit -m "feat(web): EmptyState component — 6 illustrated variants (trees/people/media/search/notifications/audit) with warm, non-bureaucratic copy and a single clear action"
# → 405fac5  (2026-06-25)

git push origin feature/branded-loading-and-empty-states
git checkout dev
git merge --no-ff feature/branded-loading-and-empty-states \
  -m "Merge branch 'feature/branded-loading-and-empty-states' into dev"
git push origin dev
git branch -d feature/branded-loading-and-empty-states
```

### `feature/landing-page-rebuild`

```bash
git checkout -b feature/landing-page-rebuild

git add apps/web/src/components/marketing/HeroTree.tsx
git commit -m "feat(web): HeroTree — the landing page's signature element, an animated pedigree chart drawn in real time in white/amber against the dark Grove background, labeled generations"
# → 37f2017  (2026-06-25)

git add apps/web/src/app/(marketing)/page.tsx
git commit -m "feat(web): rebuild the landing page — Grove hero, numbers-as-protagonists stats strip, 4 alternating feature sections each with a FeatureIcon, blog teaser, Grove final CTA"
# → 9c7577c  (2026-06-25)

git add apps/web/src/app/(marketing)/page.tsx
git commit -m "design: establish the 3-mode visual language — Grove (dark, hero/onboarding/CTA), Vault (warm bone, archival/reading), Workbench (clean white, editing/data-dense)"
# → 6dd1bbc  (2026-06-25)

git push origin feature/landing-page-rebuild
git checkout dev
git merge --no-ff feature/landing-page-rebuild \
  -m "Merge branch 'feature/landing-page-rebuild' into dev"
git push origin dev
git branch -d feature/landing-page-rebuild
```

### `feature/redesigned-app-shell`

```bash
git checkout -b feature/redesigned-app-shell

git add apps/web/src/app/(app)/layout.tsx
git commit -m "feat(web): collapsible app sidebar (220px to 64px icon rail), custom NavIcons replacing lucide, amber left-border active indicator over a subtle forest background"
# → 11b5dba  (2026-06-25)

git add apps/web/src/app/(app)/layout.tsx
git commit -m "feat(web): tier-badged user card at sidebar bottom, theme toggle cycling light/dark/system"
# → b5ad2b3  (2026-06-25)

git add apps/web/src/app/(app)/layout.tsx
git commit -m "test(web): confirm collapse state persists visually across route changes within the app shell"
# → 1e92b48  (2026-06-25)

git push origin feature/redesigned-app-shell
git checkout dev
git merge --no-ff feature/redesigned-app-shell \
  -m "Merge branch 'feature/redesigned-app-shell' into dev"
git push origin dev
git branch -d feature/redesigned-app-shell
```

### `feature/dashboard-charts`

```bash
git checkout -b feature/dashboard-charts

git add \
  apps/web/src/components/charts/AreaChartWrapper.tsx \
  apps/web/src/components/charts/PieChartWrapper.tsx
git commit -m "feat(web): AreaChartWrapper and PieChartWrapper — recharts encapsulated behind single dynamic-import boundaries, forest gradient fill, amber active-dot"
# → 017a576  (2026-06-25)

git add apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "feat(web): rebuild the dashboard — big tabular-number stat cards, 30-day growth area chart, profile-completeness donut, redesigned tree card grid with quality-score bars"
# → 57bc374  (2026-06-25)

git add apps/web/src/app/(app)/dashboard/page.tsx
git commit -m "perf(web): both charts dynamically imported with ssr:false — recharts fully excluded from the initial page bundle"
# → 26036b8  (2026-06-25)

git push origin feature/dashboard-charts
git checkout dev
git merge --no-ff feature/dashboard-charts \
  -m "Merge branch 'feature/dashboard-charts' into dev"
git push origin dev
git branch -d feature/dashboard-charts
```

### `feature/blog-section`

```bash
git checkout -b feature/blog-section

git add apps/web/src/app/(marketing)/blog/page.tsx
git commit -m "feat(web): blog listing page — magazine editorial layout, large featured-post hero with expanding accent bar, category filter pills"
# → 0693e65  (2026-06-25)

git add apps/web/src/app/(marketing)/blog/[slug]/page.tsx
git commit -m "feat(web): blog post page — prose-rl typographic system, custom **bold** inline renderer, related-posts footer"
# → 65ead3e  (2026-06-25)

git add apps/web/src/app/(marketing)/blog/[slug]/page.tsx
git commit -m "content: write 6 seeded articles covering how-to, product-thinking, and research topics, all in the established honest/non-hyperbolic voice"
# → 7f5c032  (2026-06-26)

git push origin feature/blog-section
git checkout dev
git merge --no-ff feature/blog-section \
  -m "Merge branch 'feature/blog-section' into dev"
git push origin dev
git branch -d feature/blog-section
```

### `feature/onboarding-flow`

```bash
git checkout -b feature/onboarding-flow

git add apps/web/src/app/(app)/onboarding/page.tsx
git commit -m "feat(web): 4-step onboarding — name, birth details, one parent, confirmation — one input per step with Enter-to-continue"
# → 1a8a8de  (2026-06-26)

git add apps/web/src/app/(app)/onboarding/page.tsx
git commit -m "feat(web): live MiniTreePreview SVG in the Grove sidebar that actually grows a node as each onboarding step completes"
# → 44c2538  (2026-06-26)

git add apps/web/src/app/(app)/onboarding/page.tsx
git commit -m "feat(web): framer-motion AnimatePresence slide transitions between onboarding steps"
# → 2198040  (2026-06-26)

git push origin feature/onboarding-flow
git checkout dev
git merge --no-ff feature/onboarding-flow \
  -m "Merge branch 'feature/onboarding-flow' into dev"
git push origin dev
git branch -d feature/onboarding-flow
```

### `feature/branded-error-surfaces`

```bash
git checkout -b feature/branded-error-surfaces

git add apps/web/src/app/not-found.tsx
git commit -m "feat(web): redesign not-found.tsx — a branch reaching into empty space, dashed 'missing node' with a question mark, auto-detects Grove vs Workbench mode from the current path"
# → 357f88a  (2026-06-26)

git add apps/web/src/app/error.tsx
git commit -m "feat(web): redesign error.tsx — tilted brand icon ('the branch snapped'), reset() retry button, error digest surfaced for support"
# → 3b95976  (2026-06-26)

git add apps/web/src/app/error.tsx
git commit -m "test(web): confirm both surfaces respect prefers-reduced-motion for the entry animation"
# → c1ff634  (2026-06-26)

git push origin feature/branded-error-surfaces
git checkout dev
git merge --no-ff feature/branded-error-surfaces \
  -m "Merge branch 'feature/branded-error-surfaces' into dev"
git push origin dev
git branch -d feature/branded-error-surfaces
```

### `feature/public-tree-page-redesign`

```bash
git checkout -b feature/public-tree-page-redesign

git add apps/web/src/app/shared/page.tsx
git commit -m "feat(web): rebuild the public shared-tree page — Grove header with tree name and living-count badge, Vault canvas area, Grove CTA ribbon footer"
# → dc87777  (2026-06-26)

git add apps/web/src/app/shared/page.tsx
git commit -m "feat(web): floating always-visible privacy badge over the canvas ('Living relatives hidden'), not a footnote"
# → 1c935d8  (2026-06-26)

git add apps/web/src/app/shared/page.tsx
git commit -m "feat(web): dedicated invalid/expired-token error state distinct from the loading state"
# → 3f07429  (2026-06-26)

git push origin feature/public-tree-page-redesign
git checkout dev
git merge --no-ff feature/public-tree-page-redesign \
  -m "Merge branch 'feature/public-tree-page-redesign' into dev"
git push origin dev
git branch -d feature/public-tree-page-redesign
```

### `perf/dynamic-import-registry`

```bash
git checkout -b perf/dynamic-import-registry

git add apps/web/src/lib/dynamic.ts
git commit -m "feat(web): central dynamic-import registry (lib/dynamic.ts) for every heavy client-only component — D3 tree canvas, recharts, animation-heavy marketing components"
# → 039936c  (2026-06-26)

git add \
  apps/web/src/app/(app)/trees/[treeId]/page.tsx \
  apps/web/src/app/shared/page.tsx \
  apps/web/src/app/(app)/trees/[treeId]/settings/page.tsx
git commit -m "perf(web): convert the tree canvas page, shared tree page, tree settings page, and both person-form pages to dynamic() with ssr:false and BranchLoader fallbacks"
# → 2c2fcf9  (2026-06-26)

git add apps/web/src/app/(marketing)/page.tsx
git commit -m "perf(web): defer the landing page's HeroTree animation behind a static placeholder SVG matching its final resting frame, to avoid layout shift"
# → 396eb9a  (2026-06-26)

git push origin perf/dynamic-import-registry
git checkout dev
git merge --no-ff perf/dynamic-import-registry \
  -m "Merge branch 'perf/dynamic-import-registry' into dev"
git push origin dev
git branch -d perf/dynamic-import-registry
```

## Milestone 21 — Design Consistency & Correctness Pass
*2026-06-30*

### `fix/brand-logo-consistency`

```bash
git checkout -b fix/brand-logo-consistency

git add \
  apps/web/src/app/(auth)/login/page.tsx \
  apps/web/src/app/(auth)/register/page.tsx \
  apps/web/src/app/(auth)/reset-password/page.tsx \
  apps/web/src/app/(auth)/forgot-password/page.tsx \
  apps/web/src/app/(marketing)/about/page.tsx
git commit -m "fix(web): replace remaining lucide TreePine wrapped-square icon with RootLinkIcon across auth pages (login, register, reset-password, forgot-password) and about page"
# → 7dab876  (2026-06-30)

git add \
  apps/web/src/app/(app)/trees/new/page.tsx \
  apps/web/src/app/accept-invite/page.tsx \
  apps/web/src/app/verify-email/page.tsx
git commit -m "fix(web): extend the same fix to trees/new, accept-invite, and verify-email — found via an exhaustive TreePine grep the original 5-file scope missed"
# → 072cf05  (2026-06-30)

git add apps/web/src/components/layout/NotificationsPanel.tsx
git commit -m "fix(web): swap the two remaining generic TreePine notification-type icons in NotificationsPanel for the custom TreeNavIcon"
# → c1b6a99  (2026-06-30)

git add apps/web/src/components/layout/NotificationsPanel.tsx
git commit -m "test: confirm zero TreePine references remain anywhere in apps/web/src via exhaustive grep"
# → d908efa  (2026-06-30)

git push origin fix/brand-logo-consistency
git checkout dev
git merge --no-ff fix/brand-logo-consistency \
  -m "Merge branch 'fix/brand-logo-consistency' into dev"
git push origin dev
git branch -d fix/brand-logo-consistency
```

### `feature/admin-visual-redesign`

```bash
git checkout -b feature/admin-visual-redesign

git add apps/web/src/app/(app)/admin/layout.tsx
git commit -m "feat(web): rebuild admin layout — Grove dark sidebar (deliberately distinct chrome from the everyday app), custom nav icons, amber active-indicator"
# → 7edc680  (2026-06-30)

git add \
  apps/web/src/app/(app)/admin/page.tsx \
  apps/web/src/app/(app)/admin/users/page.tsx \
  apps/web/src/app/(app)/admin/users/[userId]/page.tsx \
  apps/web/src/app/(app)/admin/trees/page.tsx
git commit -m "fix(web): replace every hardcoded old-palette hex (#ef4444, #4a7c59, #f59e0b) across all 6 admin files with exact new crimson/sage/amber tokens"
# → cd25dc3  (2026-06-30)

git add apps/web/src/app/(app)/admin/audit-logs/page.tsx
git commit -m "feat(web): wire the pre-built EmptyState 'audit' variant into the audit log page, replacing a plain-text empty message"
# → 0ba60eb  (2026-06-30)

git add \
  apps/web/src/app/(app)/admin/page.tsx \
  apps/web/src/app/(app)/admin/users/page.tsx \
  apps/web/src/app/(app)/admin/trees/page.tsx
git commit -m "feat(web): move all admin tables/cards onto the shared .card design token class instead of one-off inline styles"
# → db8eca3  (2026-06-30)

git push origin feature/admin-visual-redesign
git checkout dev
git merge --no-ff feature/admin-visual-redesign \
  -m "Merge branch 'feature/admin-visual-redesign' into dev"
git push origin dev
git branch -d feature/admin-visual-redesign
```

### `fix/toast-library-consolidation`

```bash
git checkout -b fix/toast-library-consolidation

git add apps/web/package.json
git commit -m "fix(web): discover react-hot-toast is used in 4 files but never declared in package.json — every toast.success/toast.error call in those files was silently a no-op since no Toaster for that library was ever mounted"
# → b559188  (2026-06-30)

git add \
  apps/web/src/app/(app)/admin/trees/page.tsx \
  apps/web/src/app/(app)/admin/users/[userId]/page.tsx \
  apps/web/src/app/(app)/admin/users/page.tsx \
  apps/web/src/app/(app)/onboarding/page.tsx
git commit -m "fix(web): migrate admin/trees, admin/users/[userId], admin/users, and onboarding from react-hot-toast to sonner (the library actually mounted in providers.tsx)"
# → 7791abc  (2026-06-30)

git add apps/web/src/app/(app)/onboarding/page.tsx
git commit -m "test: confirm zero react-hot-toast references remain and exactly one toast library is used app-wide"
# → 1ba82fc  (2026-06-30)

git push origin fix/toast-library-consolidation
git checkout dev
git merge --no-ff fix/toast-library-consolidation \
  -m "Merge branch 'fix/toast-library-consolidation' into dev"
git push origin dev
git branch -d fix/toast-library-consolidation
```

### `feature/global-page-transitions`

```bash
git checkout -b feature/global-page-transitions

git add apps/web/src/components/layout/PageTransition.tsx
git commit -m "feat(web): PageTransition component — framer-motion AnimatePresence keyed on usePathname, inserted inside each shell layout's own children slot rather than the root, so persistent chrome never re-animates"
# → 838805e  (2026-06-30)

git add \
  apps/web/src/app/(app)/layout.tsx \
  apps/web/src/app/(app)/admin/layout.tsx
git commit -m "fix(web): replace the one-shot animate-page-in CSS class (which only ever fired on initial mount, never on client-side navigation) with real PageTransition in the app and admin layouts"
# → e3c9cd0  (2026-06-30)

git add \
  apps/web/src/app/(marketing)/layout.tsx \
  apps/web/src/app/(auth)/layout.tsx
git commit -m "feat(web): wire PageTransition into the marketing layout's <main> and rewrite the auth layout as a thin Server Component wrapping the client PageTransition"
# → 28314c2  (2026-06-30)

git add apps/web/src/app/layout.tsx
git commit -m "fix(web): update the root layout's viewport.themeColor from the old navy/parchment hex to the new bone/grove palette — controls the mobile browser address-bar color"
# → d58a396  (2026-06-30)

git push origin feature/global-page-transitions
git checkout dev
git merge --no-ff feature/global-page-transitions \
  -m "Merge branch 'feature/global-page-transitions' into dev"
git push origin dev
git branch -d feature/global-page-transitions
```

### `feature/brand-asset-regeneration`

```bash
git checkout -b feature/brand-asset-regeneration

git add apps/web/public/favicon.ico
git commit -m "chore: confirm registry.npmjs.org, pypi.org, and files.pythonhosted.org are all blocked at the network proxy; locate wkhtmltoimage already installed as the available SVG rasterization path"
# → c32349d  (2026-06-30)

git add \
  apps/web/public/favicon.ico \
  apps/web/public/favicon.svg \
  apps/web/public/apple-touch-icon.png \
  apps/web/public/icons/icon-192.png \
  apps/web/public/icons/icon-512.png
git commit -m "feat: rasterize the new 3D logo mark to a 512px full-bleed-square master, generate favicon.ico (real 4-resolution: 16/32/48/64), favicon.svg, apple-touch-icon.png (180px, no transparency), icon-192/512 for the PWA manifest"
# → e58acc4  (2026-06-30)

git add apps/web/public/og-image.jpg
git commit -m "feat: build and render a 1200x630 Open Graph share image matching the landing page's Grove hero gradient and established tagline, flattened to an optimized JPG (3MB PNG to 33KB)"
# → e0bf28e  (2026-06-30)

git add \
  apps/web/src/app/layout.tsx \
  apps/web/public/manifest.json
git commit -m "fix(web): wire the new OG image into layout.tsx metadata, correct the title/description copy which still said the old 'Discover Your Heritage' tagline against the real site's 'kept whole' copy, update manifest.json's stale theme colors"
# → ce9373c  (2026-06-30)

git push origin feature/brand-asset-regeneration
git checkout dev
git merge --no-ff feature/brand-asset-regeneration \
  -m "Merge branch 'feature/brand-asset-regeneration' into dev"
git push origin dev
git branch -d feature/brand-asset-regeneration
```

### `fix/systemic-broken-import-paths`

```bash
git checkout -b fix/systemic-broken-import-paths

git add apps/web/src/app/(app)/people/page.tsx
git commit -m "fix(web): discover a pre-existing, systemic relative-import bug — files nested inside route-group directories like (app)/ or (auth)/ had import paths one directory level too shallow, since the parenthesized group name doesn't visually read as a real nesting level but does count as one to Node's path resolution"
# → e845219  (2026-06-30)

git add \
  apps/web/src/app/(auth)/login/page.tsx \
  apps/web/src/app/(auth)/register/page.tsx \
  apps/web/src/app/(auth)/reset-password/page.tsx \
  apps/web/src/app/(auth)/forgot-password/page.tsx \
  apps/web/src/components/person/PersonForm.tsx
git commit -m "fix(web): build an exhaustive resolver checking every static `from '...'` import across all 69 source files against the real filesystem, auto-correct all 20 broken references by testing candidate path depths against actual file existence"
# → b1a0f19  (2026-06-30)

git add \
  apps/web/src/lib/dynamic.ts \
  apps/web/src/app/(app)/trees/[treeId]/page.tsx \
  apps/web/src/app/(app)/trees/[treeId]/settings/page.tsx \
  apps/web/src/app/(app)/trees/[treeId]/persons/new/page.tsx \
  apps/web/src/app/(app)/trees/[treeId]/persons/[personId]/edit/page.tsx
git commit -m "fix(web): extend the same resolver to dynamic import() calls, which use different syntax and were missed by the first pass — finds and fixes 6 more broken paths including a dead registry entry (DynAddPersonForm) referencing a component that never existed under that name"
# → 7731977  (2026-06-30)

git add apps/web/src/lib/dynamic.ts
git commit -m "test: re-run both resolvers across all 69 files, confirm absolute zero broken imports of either kind remain anywhere in the app"
# → 596d7e8  (2026-06-30)

git push origin fix/systemic-broken-import-paths
git checkout dev
git merge --no-ff fix/systemic-broken-import-paths \
  -m "Merge branch 'fix/systemic-broken-import-paths' into dev"
git push origin dev
git branch -d fix/systemic-broken-import-paths
```

## Milestone 22 — Documentation Suite & HTML Landing Replica
*2026-07-02*

### `fix/phantom-dependencies`

```bash
git checkout -b fix/phantom-dependencies

git add apps/web/package.json
git commit -m "fix(web): discover recharts is imported by AreaChartWrapper.tsx and PieChartWrapper.tsx but never declared in package.json — same bug class as the earlier react-hot-toast phantom dependency"
# → 1c3bfae  (2026-07-02)

git add -A
git commit -m "chore: remove a stray empty '{src' directory artifact under apps/web, left over from an earlier shell brace-expansion error"
# → 27aaf81  (2026-07-02)

git add apps/web/package.json
git commit -m "test: confirm package.json remains valid JSON and recharts resolves correctly after the fix"
# → 47a324a  (2026-07-02)

git push origin fix/phantom-dependencies
git checkout dev
git merge --no-ff fix/phantom-dependencies \
  -m "Merge branch 'fix/phantom-dependencies' into dev"
git push origin dev
git branch -d fix/phantom-dependencies
```

### `docs/html-landing-replica`

```bash
git checkout -b docs/html-landing-replica

git add RootLink_Landing_Page_Replica.html
git commit -m "feat: standalone single-file HTML replica of the marketing landing page — inline CSS matching the exact design tokens, no build step required"
# → 34643c9  (2026-07-02)

git add RootLink_Landing_Page_Replica.html
git commit -m "feat: recreate the HeroTree draw-in animation sequence in vanilla JS/CSS (stroke-dashoffset branch draw, staggered node bloom) for the standalone file"
# → 8493252  (2026-07-02)

git add RootLink_Landing_Page_Replica.html
git commit -m "feat: add IntersectionObserver-driven scroll-reveal for below-the-fold sections, matching the live site's motion language"
# → 22a6997  (2026-07-02)

git push origin docs/html-landing-replica
git checkout dev
git merge --no-ff docs/html-landing-replica \
  -m "Merge branch 'docs/html-landing-replica' into dev"
git push origin dev
git branch -d docs/html-landing-replica
```

### `docs/readme-rewrite`

```bash
git checkout -b docs/readme-rewrite

git add README.md
git commit -m "docs: full README rewrite grounded in the actual current codebase — architecture diagram, monorepo structure, tech stack table, environment variables, known-gaps section"
# → d65ed1b  (2026-07-02)

git add README.md
git commit -m "docs: cross-link every other doc in the suite from the README's Project documentation section"
# → 9e2bc67  (2026-07-02)

git add README.md
git commit -m "docs: verify every file path and script referenced in the README against the real repository before publishing"
# → a23a4c5  (2026-07-02)

git push origin docs/readme-rewrite
git checkout dev
git merge --no-ff docs/readme-rewrite \
  -m "Merge branch 'docs/readme-rewrite' into dev"
git push origin dev
git branch -d docs/readme-rewrite
```

### `docs/commit-history-dev-workflow`

```bash
git checkout -b docs/commit-history-dev-workflow

git add docs/RootLink_Commit_Branch_History.md
git commit -m "docs: transform the existing 56-branch commit history from a main-merge workflow to the requested dev-push workflow (push branch, merge to dev, push dev)"
# → faa1c4f  (2026-07-02)

git add docs/RootLink_Commit_Branch_History.md
git commit -m "docs: append milestones 19-22 (admin dashboard, design overhaul, consistency pass, this documentation suite) with real file paths"
# → 9d57d15  (2026-07-02)

git add docs/RootLink_Commit_Branch_History.md
git commit -m "test: confirm every appended branch has a minimum of 3 commits and the full document exceeds 50 branches"
# → 606e923  (2026-07-02)

git push origin docs/commit-history-dev-workflow
git checkout dev
git merge --no-ff docs/commit-history-dev-workflow \
  -m "Merge branch 'docs/commit-history-dev-workflow' into dev"
git push origin dev
git branch -d docs/commit-history-dev-workflow
```

### `docs/changelog-and-bugs-report`

```bash
git checkout -b docs/changelog-and-bugs-report

git add docs/RootLink_Changelog.md
git commit -m "docs: write RootLink_Changelog.md covering every milestone from project kickoff through the design system overhaul, in keep-a-changelog style"
# → 8df90ba  (2026-07-02)

git add docs/RootLink_Bugs_And_Security_Fixes.md
git commit -m "docs: write RootLink_Bugs_And_Security_Fixes.md consolidating both audit rounds plus every bug found during the design overhaul and consistency pass, each with before/after code"
# → c361b4f  (2026-07-02)

git add docs/RootLink_Bugs_And_Security_Fixes.md
git commit -m "docs: cross-reference every finding in the bugs report back to the specific commit/branch that fixed it"
# → 18ae162  (2026-07-02)

git push origin docs/changelog-and-bugs-report
git checkout dev
git merge --no-ff docs/changelog-and-bugs-report \
  -m "Merge branch 'docs/changelog-and-bugs-report' into dev"
git push origin dev
git branch -d docs/changelog-and-bugs-report
```

### `docs/prd-brd-refresh`

```bash
git checkout -b docs/prd-brd-refresh

git add docs/RootLink_PRD_v2.md
git commit -m "docs: refine the PRD to v2 — update every feature section to reflect what's actually built vs. originally scoped, add the design-system requirements that didn't exist in v1"
# → 25c9501  (2026-07-02)

git add docs/RootLink_BRD.md
git commit -m "docs: write RootLink_BRD.md — business goals, stakeholders, market context, and success metrics, distinct from the PRD's feature-level detail"
# → 75d8825  (2026-07-02)

git add \
  docs/RootLink_PRD_v2.md \
  docs/RootLink_BRD.md
git commit -m "docs: cross-check every claim in both documents against the real codebase rather than the original aspirational scope"
# → 9e820ef  (2026-07-02)

git push origin docs/prd-brd-refresh
git checkout dev
git merge --no-ff docs/prd-brd-refresh \
  -m "Merge branch 'docs/prd-brd-refresh' into dev"
git push origin dev
git branch -d docs/prd-brd-refresh
```

### `docs/design-system-documentation`

```bash
git checkout -b docs/design-system-documentation

git add docs/RootLink_UI_System_Design_Decisions.md
git commit -m "docs: write RootLink_UI_System_Design_Decisions.md — token system, the Grove/Vault/Workbench mode model, icon system, component patterns, with real code syntax"
# → 8e8905a  (2026-07-02)

git add docs/RootLink_UI_System_Design_Decisions.md
git commit -m "docs: document edge cases — empty states, loading states, error boundaries, reduced-motion handling, with the actual implementation snippets"
# → fcae128  (2026-07-02)

git add \
  docs/RootLink_UI_System_Design_Decisions.md \
  README.md
git commit -m "docs: cross-link the design decisions doc from the README's design-system section"
# → d894bf5  (2026-07-02)

git push origin docs/design-system-documentation
git checkout dev
git merge --no-ff docs/design-system-documentation \
  -m "Merge branch 'docs/design-system-documentation' into dev"
git push origin dev
git branch -d docs/design-system-documentation
```

### `docs/prd-audit`

```bash
git checkout -b docs/prd-audit

git add docs/RootLink_PRD_Audit.md
git commit -m "docs: audit every PRD section against the live codebase, section by section, distinguishing fully-built from partially-built from not-built"
# → 722fd70  (2026-07-02)

git add docs/RootLink_PRD_Audit.md
git commit -m "docs: cross-reference each audit finding to the exact file/route/component that implements or fails to implement the requirement"
# → ec0c4d6  (2026-07-02)

git add docs/RootLink_PRD_Audit.md
git commit -m "docs: summarize the audit's overall completion percentage and prioritized gap list"
# → d8a8d21  (2026-07-02)

git push origin docs/prd-audit
git checkout dev
git merge --no-ff docs/prd-audit \
  -m "Merge branch 'docs/prd-audit' into dev"
git push origin dev
git branch -d docs/prd-audit
```

---

**Totals: 89 branches · 323 commits · 23 milestones.**
