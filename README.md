# RootLink

**A private, collaborative family tree and heritage platform.**

RootLink lets a family build a shared record of who came from whom — with photographs and documents attached to the people they belong to, privacy that defaults to protecting people who never signed up for an account, and a data model that leaves whenever you want it to (GEDCOM in, GEDCOM out, on every plan including free).

This repository is a full-stack TypeScript monorepo: a Fastify 5 API, a Next.js 15 / React 19 web application, a Playwright end-to-end test suite, and three shared internal packages, orchestrated with npm workspaces and Turborepo.

---

## Table of contents

- [Why RootLink exists](#why-rootlink-exists)
- [What's actually built](#whats-actually-built)
- [Architecture](#architecture)
- [Monorepo structure](#monorepo-structure)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [Database](#database)
- [Testing](#testing)
- [Design system](#design-system)
- [Deployment notes](#deployment-notes)
- [Known gaps](#known-gaps)
- [Project documentation](#project-documentation)

---

## Why RootLink exists

Most genealogy software is built around the assumption that one person does all the research alone, and that everyone whose name ends up in the tree implicitly consented to that. Neither assumption holds up in practice. The relative who actually has the photographs and remembers the dates is rarely the one who'll sit down and use genealogy software — and a family tree, almost by definition, contains information about people (particularly living relatives) who never created an account or agreed to anything.

RootLink starts from those two observations. Roles exist so a relative who only wants to browse doesn't need the same access as one actively researching. Edit history exists because two people will eventually disagree about a date, and someone needs to see what changed and undo it cleanly. Privacy defaults toward protecting the people in the tree, not just the account holder — living relatives are automatically hidden from anything shared publicly, without requiring the tree owner to remember to configure it.

## What's actually built

Every item below is real, working code in this repository — not a roadmap.

**Core tree & people**
- Three chart layouts: pedigree (ancestors), radial fan chart, descendants view — rendered with D3, keyboard-navigable, with a screen-reader fallback list
- Life events (birth, death, marriage, immigration, etc.) with dates, places, and certainty levels
- Cycle prevention — a person cannot become their own ancestor
- Full edit history per person/relationship, with restore

**Collaboration**
- Role-based access: viewer, contributor, editor, admin, owner (five levels)
- Real-time presence and live data sync over WebSocket (tree/person/relationship mutations broadcast to connected collaborators, authorization-checked per connection)
- Email invitations with a scoped role attached
- Per-tree privacy levels: public, family, private
- Public share links that automatically redact any person marked "living" — name, dates, photo, biography all withheld — regardless of the tree's own privacy setting

**Media**
- Presigned S3/MinIO uploads with server-side magic-byte content verification (not just trusting client-declared MIME type)
- Automatic thumbnail generation
- Forced-download response headers on non-image assets to prevent inline execution of a misclassified upload
- Retryable background deletion (BullMQ), with a cron-driven backstop that re-enqueues any deletion whose original enqueue may have silently failed

**AI features**
- Biography drafts generated from a person's own recorded facts (not fabricated from outside sources)
- Research hints derived from gaps in the tree's own data (a missing birthplace, an unexplained date gap) — explicitly not matched against external genealogical records, to avoid presenting hallucinated matches as fact

**Data portability**
- GEDCOM import and export on every subscription tier, including free

**Billing**
- Full Stripe integration: checkout sessions, customer portal, webhook-driven subscription lifecycle (upgrade, renewal, cancellation, payment failure notification)
- Three tiers (Free / Plus / Pro) with real, enforced limits on trees, people, storage, and AI usage

**Admin**
- A dedicated `/admin` dashboard (gated by a database-checked `isAdmin` flag, not a JWT claim, so revocation is near-immediate) covering system stats, user management (tier changes, suspension, unlock), tree moderation, and a full audit log
- Bull Board mounted at `/admin/queues` for background-job observability

**Security**
- Argon2id password hashing, JWT access tokens pinned to a single explicit algorithm, rotating refresh tokens with a selector/verifier split for O(1) lookup
- TOTP-based two-factor authentication
- Every tree-scoped route authorizes against a real per-request permission check (`getTreePermission`), not a cached or trusted claim
- Two full audit rounds completed — see [`docs/`](./docs) for the detailed findings and remediation record

**Public-facing**
- A seven-page marketing site (landing, features, pricing, about, terms, privacy, contact) plus a blog and a dedicated public tree-sharing page, all built on a distinct three-mode design language — see [Design system](#design-system)

**Design**
- A complete custom design system ("Rooted Modernity" — deep forest green, warm amber, bone white) replacing all generic/AI-default visual choices: a bespoke 3D logo mark, custom nav and feature icon sets, branded loading states, illustrated empty states, a branded 404, and a global page-transition layer

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│   apps/web       │  HTTP  │    apps/api       │  SQL   │   PostgreSQL     │
│   Next.js 15     │◄──────►│    Fastify 5      │◄──────►│   (via Drizzle)  │
│   React 19       │  WS    │                   │        └─────────────────┘
└─────────────────┘        │                   │
                            │                   │        ┌─────────────────┐
                            │                   │◄──────►│   Redis          │
                            │                   │        │   (cache/queues) │
                            │                   │        └─────────────────┘
                            │                   │
                            │                   │        ┌─────────────────┐
                            │                   │◄──────►│   S3 / MinIO     │
                            │                   │        │   (media)        │
                            └──────────────────┘        └─────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │  BullMQ workers    │  media processing, GEDCOM
                            │  (apps/api/worker) │  import/export, AI hints/bio,
                            └──────────────────┘  email, data quality, cron
```

The API and the background worker process are two entry points into the same `apps/api` codebase (`server.ts` for the HTTP/WebSocket server, `worker.ts` for the standalone queue-processing process) — both can run in the same process for local development, or be deployed as separate services in production.

## Monorepo structure

```
rootlink/
├── apps/
│   ├── api/                 Fastify 5 API + BullMQ workers
│   │   └── src/
│   │       ├── config/       env validation (zod)
│   │       ├── lib/          shared internals (S3 client, idempotency, errors)
│   │       ├── middleware/   auth, tree-role authorization
│   │       ├── plugins/      Fastify plugin registration, WebSocket, Bull Board
│   │       ├── routes/       12 route files (auth, trees, persons, relationships,
│   │       │                  media, sources, hints, gedcom, users, billing, admin, health)
│   │       ├── services/     7 service files (business logic)
│   │       └── workers/      BullMQ job processors + cron
│   │
│   ├── web/                 Next.js 15 / React 19 frontend
│   │   └── src/
│   │       ├── app/          App Router — (marketing), (auth), (app) route groups
│   │       ├── components/   brand/, ui/, tree/, charts/, layout/, marketing/, person/
│   │       ├── hooks/        useTreeWebSocket, etc.
│   │       ├── lib/           api-client, dynamic import registry
│   │       └── store/         Zustand auth store
│   │
│   └── web-e2e/             Playwright E2E suite (9 spec files, ~220 test cases)
│
├── packages/
│   ├── db/                   Drizzle ORM schema (14 tables) + migrations
│   ├── shared/                Cross-app types, Zod schemas, constants, utils
│   ├── config/                Shared tooling config
│   └── ui/                    (reserved for extracted shared UI, currently minimal)
│
├── docs/                      PRD, BRD, design decisions, audit reports (see below)
├── scripts/
├── docker-compose.yml         postgres, redis, minio, pgadmin (local dev)
└── turbo.json
```

## Tech stack

| Layer | Choice |
|---|---|
| API framework | Fastify 5 |
| API language | TypeScript |
| ORM | Drizzle ORM (PostgreSQL) |
| Cache / queues | Redis (ioredis) + BullMQ |
| Object storage | S3-compatible (MinIO locally) |
| Auth | JWT (`@fastify/jwt`) + Argon2id + TOTP (`otplib`) |
| Realtime | `@fastify/websocket` |
| Payments | Stripe |
| AI | Anthropic SDK |
| Job dashboard | Bull Board |
| Frontend framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS + custom CSS design tokens |
| State (client) | Zustand + TanStack Query v5 |
| Animation | Framer Motion |
| Charts | Recharts |
| Tree visualization | D3 |
| Forms | React Hook Form + Zod |
| Toasts | Sonner |
| E2E testing | Playwright |
| Monorepo tooling | npm workspaces + Turborepo |

## Getting started

### Prerequisites
- Node.js 22+
- npm 10+
- Docker (for local Postgres/Redis/MinIO), or your own instances of each

### Setup

```bash
git clone <repository-url> rootlink
cd rootlink
npm install

# Start local infrastructure (Postgres, Redis, MinIO, pgAdmin)
docker compose up -d

# Copy and fill in environment variables
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env — see Environment variables below

# Run database migrations
npm run db:migrate

# (optional) seed sample data
npm run db:seed

# Start every app in dev mode (Turborepo)
npm run dev
```

The API defaults to `http://localhost:4000`, the web app to `http://localhost:3000`.

## Environment variables

The full annotated list lives in [`apps/api/.env.example`](./apps/api/.env.example). Everything below is required unless noted otherwise.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Signs access tokens (HS256, pinned) |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL |
| `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | S3/MinIO credentials |
| `STORAGE_ENDPOINT` | Set for MinIO/local; omit for real AWS S3 |
| `APP_URL` | Used to build redirect/callback URLs (Stripe, email links) |
| `ENABLE_AI_FEATURES`, `ANTHROPIC_API_KEY` | *Optional.* AI features degrade gracefully without these |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PLUS`, `STRIPE_PRICE_ID_PRO` | *Optional.* Billing routes return a clear 503 rather than the app failing to boot if unset |
| `LOG_LEVEL` | `trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal` |
| `SENTRY_DSN` | *Optional* |
| `RATE_LIMIT_TRUST_PROXY` | Set `true` behind a reverse proxy in production |

Billing and AI are both designed to be fully optional at the environment level — the rest of the product runs normally without them configured; only the specific feature's endpoints respond with a clear "not configured" error.

## Available scripts

Run from the repository root (Turborepo fans these out to the relevant workspace):

```bash
npm run dev          # all apps in watch mode
npm run build        # production build, all apps
npm run test         # unit/integration tests, all apps
npm run lint         # ESLint, all apps
npm run typecheck    # tsc --noEmit, all apps
npm run db:migrate   # run pending Drizzle migrations
npm run db:seed      # seed the database with sample data
npm run test:e2e     # full Playwright suite
npm run test:e2e:smoke  # smoke subset only
npm run clean        # remove all node_modules
```

## Database

Schema is defined in [`packages/db/src/schema.ts`](./packages/db/src/schema.ts) using Drizzle ORM — 14 tables covering users, trees, persons, relationships, vital events, media assets, tree members, edit history, refresh tokens, idempotency keys, notifications, and audit logs.

Migrations live in [`packages/db/migrations/`](./packages/db/migrations) as plain numbered SQL files with a `_journal.json` manifest — inspect any migration before running it in production. Notable schema decisions (composite keys, why a column exists) are documented inline as SQL comments in the migration that introduced them.

## Testing

- **E2E**: Playwright, 9 spec files covering auth, tree operations, person CRUD, media, collaboration, accessibility (axe-core), visual regression, performance, and general API smoke tests — roughly 220 individual test cases. Run with `npm run test:e2e`.
- **Type safety**: `npm run typecheck` runs `tsc --noEmit` across every workspace; this is the fastest way to catch a broken import or contract mismatch between `packages/shared` and its consumers.
- **Linting**: ESLint flat config at the root, with an app-specific override in `apps/web/eslint.config.mjs` that includes a custom rule banning the bare `lucide-react` `Image` import (a bug that recurred four times before the lint rule was added — see the bugs & security report).

## Design system

RootLink's visual identity ("Rooted Modernity") is documented in full in [`docs/RootLink_UI_System_Design_Decisions.md`](./docs/RootLink_UI_System_Design_Decisions.md), including the token system, the three contextual visual modes (Grove / Vault / Workbench), the icon system, component patterns, and edge-case handling with code examples. In short: deep forest green + warm amber + bone white, replacing an earlier generic navy/parchment palette; a custom SVG logo whose form literally encodes a pedigree chart; hand-built icon sets rather than a generic icon library for anything brand-facing; and warm, amber-tinted shadows rather than neutral gray throughout.

## Deployment notes

- `apps/api/src/server.ts` and `apps/api/src/worker.ts` are separate entry points sharing one codebase — deploy them as separate services (or processes) in production so a queue backlog can't starve HTTP request handling.
- The `/admin/queues` (Bull Board) route is authorization-gated at the application layer, but consider also restricting it at the infrastructure layer (IP allowlist, VPN) since it exposes job payloads across every tree on the instance.
- Stripe webhooks require the raw request body for signature verification — the route that handles `/v1/billing/webhook` registers its own `addContentTypeParser` returning a raw Buffer; do not put a body-parsing proxy/gateway in front of that specific route.
- See [Environment variables](#environment-variables) for what's safe to leave unconfigured in a staging environment.

## Known gaps

These are real, currently-unimplemented items — listed here rather than left implicit, per the project's own stated preference for honest product surfaces over aspirational ones:

- **DNA matching** — listed on the Pro tier's feature set; no backend implementation exists yet.
- **FamilySearch record matching** — the AI research-hints worker has a stubbed integration point; only the own-data-only hint generation is live.
- **Offline / PWA** — a web app manifest exists but no service worker is registered; offline access is not functional despite being listed as a Plus/Pro feature.
- **API access (Pro tier)** — no public API surface or key-issuance flow exists yet.
- **`audit_logs` write coverage** — the table and admin UI exist and are wired for admin actions and auth events; broader coverage (e.g. every tree mutation) is not yet instrumented.

A full audit against the [PRD](./docs/RootLink_PRD_v2.md) is maintained separately and updated as gaps close.

## Project documentation

All located in [`docs/`](./docs):

- [`RootLink_PRD_v2.md`](./docs/RootLink_PRD_v2.md) — Product Requirements Document (refined)
- [`RootLink_BRD.md`](./docs/RootLink_BRD.md) — Business Requirements Document
- [`RootLink_UI_System_Design_Decisions.md`](./docs/RootLink_UI_System_Design_Decisions.md) — design system, component patterns, edge cases
- [`RootLink_Changelog.md`](./docs/RootLink_Changelog.md) — changelog across every milestone
- [`RootLink_Bugs_And_Security_Fixes.md`](./docs/RootLink_Bugs_And_Security_Fixes.md) — every bug and security finding with before/after code
- [`RootLink_Commit_Branch_History.md`](./docs/RootLink_Commit_Branch_History.md) — full git branch/commit history in literal command form
- [`RootLink_PRD_Audit.md`](./docs/RootLink_PRD_Audit.md) — current build audited against the PRD, section by section

---

*RootLink is a solo-founder project. This README reflects the actual state of the codebase as of the latest commit, not a target state — see [Known gaps](#known-gaps) for what's explicitly not built yet.*
