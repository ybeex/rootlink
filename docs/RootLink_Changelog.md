# Changelog

All notable changes to RootLink are documented here, organized by milestone (build). Format loosely follows [Keep a Changelog](https://keepachangelog.com/) — entries are grouped as **Added**, **Changed**, **Fixed**, **Security**, or **Removed** within each version. Dates reflect when work on that milestone occurred, not a formal release calendar (RootLink is a continuously-developed solo project, not released on a fixed cadence).

Versions are numbered by milestone for traceability back to the [commit/branch history](./RootLink_Commit_Branch_History.md), which contains the literal git commands for every change listed here.

---

## [v0.22.0] — Documentation Suite & HTML Landing Replica — 2026-07-02

### Added
- Standalone, single-file HTML replica of the marketing landing page, including a vanilla-JS/CSS recreation of the animated hero tree draw-in sequence and scroll-reveal — no build step required to view.
- Full documentation suite: rewritten README, this changelog, a consolidated bugs & security report, a refined PRD, a new BRD, a UI/system design decisions document, and a PRD-vs-build audit.
- Commit/branch history extended from 56 to 89 branches (216 to 323 commits), and transformed from a `main`-merge git workflow to a `dev`-push, git-flow-style workflow.

### Fixed
- `recharts` was imported by two chart-wrapper components but never declared in `apps/web/package.json` — a phantom dependency of the same class as the `react-hot-toast` issue found in v0.21.0. Fixed.
- Removed a stray, empty `{src` directory artifact left over from an earlier shell brace-expansion error.

---

## [v0.21.0] — Design Consistency & Correctness Pass — 2026-06-30

### Added
- `PageTransition` component (Framer Motion `AnimatePresence` keyed on route) inserted into all four shell layouts (app, admin, marketing, auth) — each wraps only its own content slot so persistent chrome never re-animates on navigation.
- Regenerated brand assets from the actual 3D logo mark: multi-resolution `favicon.ico` (16/32/48/64px), `favicon.svg`, `apple-touch-icon.png`, PWA `icon-192`/`icon-512`, and a new 1200×630 Open Graph share image.

### Changed
- Rebuilt the admin dashboard's visual layer to match "Rooted Modernity": Grove dark sidebar, custom nav icons, every table/card moved onto the shared `.card` token class.
- Root layout metadata: title/description copy corrected from a stale "Discover Your Heritage" tagline to the site's actual "kept whole" copy; `manifest.json` and `viewport.themeColor` updated from the old navy/parchment hex values to the new bone/grove palette.

### Fixed
- **Brand inconsistency**: 8 pages (5 more than originally scoped) were still rendering the generic `lucide-react` `TreePine` icon instead of the new `RootLinkIcon` — all corrected, plus two icon-map entries in the notifications panel.
- **Silent no-op toasts**: `react-hot-toast` was used in 4 files but never declared as a dependency, and no `<Toaster>` for that library was ever mounted — every `toast.success()`/`toast.error()` call in those files was doing nothing. Migrated to `sonner`, the library actually in use everywhere else.
- **Non-functional page transitions**: the CSS `animate-page-in` class used previously only fires once on initial mount, never on client-side route changes — meaning navigation was never actually animating despite the class being present. Replaced with the real `PageTransition` component.
- **Systemic broken import paths**: discovered and fixed 26 broken relative-import references across 15 files (20 static `from '...'` imports, 6 dynamic `import('...')` calls) — files nested inside Next.js route-group directories (e.g. `(app)/`, `(auth)/`) had import paths one directory level too shallow, since a parenthesized group name doesn't visually read as a real nesting level but does count as one to Node's path resolution. Every one of these would have failed at build time. Includes a dead dynamic-import registry entry (`DynAddPersonForm`) that referenced a component under a name that never existed.

### Security
- No new findings this milestone; this was a correctness and consistency pass following the design overhaul.

---

## [v0.20.0] — Design System Overhaul ("Rooted Modernity") — 2026-06-25

### Added
- Complete design token rewrite: deep forest green / warm amber / bone white palette, replacing the earlier generic navy/parchment system. Warm, amber-tinted shadow scale throughout (no neutral gray shadows).
- 3D button system (`.btn-primary`, `.btn-amber`, `.btn-ghost`) with a real bottom-edge shadow that collapses on `:active` for a physical press effect.
- New 3D brand logo (`RootLinkIcon`/`RootLinkLogo`) — an isometric 3-face trunk lit from the upper-left, with an amber center "you" node and forest outer nodes; the mark is literally a miniature pedigree chart, not a decorative tree glyph.
- Two-tier custom icon system: compact `NavIcon`s (18–24px) replacing generic `lucide-react` icons in brand-facing chrome, and larger isometric `FeatureIcon`s (48–64px) for marketing sections.
- `BranchLoader` — an animated pedigree branch that draws itself, replacing generic spinners app-wide — plus `SkeletonCard`/`SkeletonRow` shimmer placeholders.
- `EmptyState` component with 6 illustrated variants (trees/people/media/search/notifications/audit), each with warm, non-bureaucratic copy and one clear action.
- `HeroTree` — the landing page's signature element, an animated pedigree chart drawn in real time in white/amber against a dark background.
- Full landing page rebuild around a 3-mode visual language: **Grove** (dark, hero/onboarding/CTA), **Vault** (warm bone, archival/reading contexts), **Workbench** (clean white, editing/data-dense contexts).
- Collapsible app sidebar (220px ↔ 64px icon rail) with custom nav icons and an amber active-state indicator.
- Recharts-powered dashboard: 30-day growth area chart and a profile-completeness donut, both behind dynamic-import boundaries.
- New blog section (listing + post pages) with a magazine editorial layout and 6 seeded articles.
- 4-step onboarding flow with a live mini-tree preview that grows a node as each step completes.
- Redesigned `not-found.tsx` (a branch reaching into empty space) and `error.tsx` (a tilted logo, "the branch snapped").
- Redesigned public shared-tree page with a Grove header, Vault canvas, and Grove CTA footer.
- Central dynamic-import registry (`lib/dynamic.ts`) for every heavy client-only dependency (D3, recharts, animation-heavy components).

### Changed
- Every major surface in the app — dashboard, sidebar, public tree page, marketing site — re-themed under the new design language.

### Performance
- D3 tree canvas, recharts, and the landing page's hero animation all moved behind `dynamic()` with `ssr: false`, removing them from the initial JS bundle on pages that don't immediately need them.

---

## [v0.19.0] — Super Admin Dashboard — 2026-06-19

### Added
- `admin.service.ts` — system-wide stats aggregation, paginated user/tree management with search and filters, and audit-log queries.
- `writeAuditLog()` — the `audit_logs` table existed in the schema since the initial build but was never written to until this milestone; now records admin actions and auth events.
- `/v1/admin/*` route group (stats, users, users/:id, trees, audit-logs), gated by a single `requireAdmin()` hook that re-checks the database per request rather than trusting a JWT claim — so revoking admin access takes effect on the next request, not after a token expires.
- Dedicated `/admin` route group in the frontend: overview (stats + charts), users (list + detail, with inline tier/suspend/unlock controls), trees (list + soft-delete), and audit log (filterable, paginated).
- `isAdmin` and `totalStorageUsedBytes` added to the shared `User` type so the frontend can read them from `/v1/users/me`.

### Changed
- App sidebar now conditionally renders an Admin link when `user.isAdmin` is true.

---

## [v0.18.0] — Multi-Disciplinary Audit Remediation (Round 2) — 2026-06-18

A second audit (bug/product/UX/security) produced 12 findings; all 12 closed in this milestone. See the [bugs & security report](./RootLink_Bugs_And_Security_Fixes.md) for full before/after detail on each.

### Security
- **(High)** WebSocket `JOIN_TREE` authenticated the JWT but never authorized the connection against the requested tree — any registered user could join any tree's live room. Fixed by adding a `getTreePermission` check to the handshake, mirroring every REST route's existing authorization.
- **(Medium)** JWT verification didn't pin an explicit signing algorithm on either of its two independent verification paths. Both now pinned to `HS256`.
- **(Medium)** Upload validation only cross-checked client-controlled headers against each other, never the actual file bytes. Added magic-byte content verification via `file-type`, plus forced-download response headers on non-image assets.

### Added
- Real-time data sync: `publishTreeEvent` now fires on every person/relationship/tree mutation — the WebSocket layer previously synced only presence, never actual tree data, despite the frontend already listening for it.
- Full Stripe billing integration: checkout sessions, customer portal, and a webhook handler covering the subscription lifecycle.
- Bull Board mounted at `/admin/queues` for background-job observability.
- Keyboard navigation, ARIA labeling, and a screen-reader-only fallback list for the tree canvas (previously not keyboard-accessible at all).

### Fixed
- Idempotency keys used a single global primary key instead of a composite `(userId, key)` key, risking a silent cross-user collision.
- S3 media deletion was fire-and-forget with no retry; a single transient failure orphaned the object permanently once the cron hard-delete ran. Now routed through a retryable BullMQ queue with a cron-driven backstop.
- The `Image`/`ImageIcon` `lucide-react` collision recurred a fourth time in two more files; fixed, and an ESLint rule added to prevent a fifth recurrence.
- Touch targets on the tree canvas were both undersized and hover-gated (invisible on touch devices, which have no hover event). Enlarged and made always-partially-visible.
- A zoom-control destructuring bug left an `action` variable undefined, which would throw a `ReferenceError` at render — found and fixed while addressing the touch-target issue in the same file.

---

## [v0.17.0] — Idempotency Hook Fix & Marketing Site — 2026-06-17

### Fixed
- **(Critical)** `createTree` and `createPerson` failed on every call. Root cause: `handleIdempotency()` registered a brand-new Fastify `onSend` hook from inside the per-request handler instead of once at boot — both a guaranteed memory leak and, because hook registration after `listen()` falls outside Fastify's supported lifecycle, the direct cause of the failure. Fixed by extracting `registerIdempotencyHook()`, called once in `server.ts`. A related latent double-send bug (a cached-response replay not stopping the handler from continuing) was closed at the same four call sites.
- A person's initial data-quality score was computed against an always-empty `events` array instead of what was actually submitted at creation.

### Added
- Full seven-page marketing site: landing, features, pricing, about, terms, privacy, contact — plus a signature animated-tree hero component and a restrained 3D tilt-card component for feature highlights.

---

## [v0.16.0] — Security & Quality Remediation — 2026-06-15 → 2026-06-16

The first full security audit's 10 findings remediated in this milestone; see the [bugs & security report](./RootLink_Bugs_And_Security_Fixes.md) for details on the critical/secondary/low-severity groupings.

### Added
- Fan chart and descendants-view tree layouts (previously only pedigree existed).
- A refresh-token selector/verifier split with a dedicated index, changing lookup from a bounded linear scan to O(1).
- A baseline migrations folder (the schema previously had no formal migration history).

### Security
- Full remediation of all 10 findings from the first security audit, spanning critical, secondary, and low-severity groupings.

---

## [v0.15.0] — Security Audit — 2026-06-14

### Added
- First full security audit delivered as a standalone report — 10 findings across authentication, authorization, data handling, and infrastructure, prioritized by severity.

---

## [v0.14.0] — E2E Test Suite — 2026-06-11 → 2026-06-13

### Added
- Full Playwright end-to-end suite: auth, tree operations, person CRUD, media, collaboration, accessibility (axe-core), visual regression, performance, and general API smoke coverage — roughly 220 individual test cases across 9 spec files.
- CI wiring for the suite.

---

## [v0.13.0] — Post-Build Bugfix Sprint — 2026-06-10 → 2026-06-11

### Fixed
- A batch of gaps found after the initial frontend build was substantially complete — the specific items are cataloged in the [bugs & security report](./RootLink_Bugs_And_Security_Fixes.md).

---

## [v0.12.0] — Frontend Core Features — 2026-06-08 → 2026-06-10

### Added
- D3-based tree canvas (pedigree layout).
- Person detail panel and add/edit person forms.
- Media gallery, global search, and the notifications panel.

---

## [v0.11.0] — Frontend Foundation — 2026-06-07 → 2026-06-08

### Added
- Next.js 15 App Router scaffold.
- Initial design system (tokens, typography, base components) — later fully replaced in v0.20.0.
- Auth pages: login, register, forgot/reset password, email verification.

---

## [v0.10.0] — Real-time Collaboration — 2026-06-06 → 2026-06-07

### Added
- WebSocket presence — collaborators viewing the same tree become visible to each other in real time.

### Fixed
- A crash caused by registering the WebSocket route inside an encapsulated Fastify plugin scope instead of at the top level.

---

## [v0.9.0] — AI & Quality Scoring — 2026-06-06

### Added
- AI-generated biography drafts and research hints, both derived strictly from a person's own recorded data.
- Automated data-quality scoring per person.

---

## [v0.8.0] — GEDCOM Import/Export — 2026-06-05

### Added
- GEDCOM file import and export, available on every subscription tier including free.

---

## [v0.7.0] — Media & Background Jobs — 2026-06-04 → 2026-06-05

### Added
- Presigned S3/MinIO upload flow with thumbnail generation.
- BullMQ worker infrastructure and the email-notification worker.

---

## [v0.6.0] — Core Domain APIs — 2026-06-02 → 2026-06-04

### Added
- Tree CRUD and sharing endpoints.
- Person CRUD and search.
- Relationship graph with a cycle-prevention guard (a person cannot become their own ancestor).
- Edit history with restore, across persons and relationships.

---

## [v0.5.0] — Authentication & RBAC — 2026-06-01 → 2026-06-02

### Added
- Core auth service: registration, login, Argon2id password hashing.
- TOTP-based two-factor authentication.
- Five-level tree-scoped role-based access control (viewer, contributor, editor, admin, owner).

---

## [v0.4.0] — Backend Bootstrap — 2026-05-31 → 2026-06-01

### Added
- Fastify 5 server bootstrap with zod-validated environment configuration.
- Security plugins (CORS, rate limiting, helmet-equivalent headers).
- Shared error-handling and Redis client libraries.

---

## [v0.3.0] — Database Layer — 2026-05-30 → 2026-05-31

### Added
- Full Drizzle ORM schema — the tables that would eventually number 14.
- Seed fixtures for local development.

---

## [v0.2.0] — Shared Domain Package — 2026-05-29 → 2026-05-30

### Added
- `packages/shared` — cross-app TypeScript types, Zod validation schemas, constants, and utility functions consumed by both the API and the web app.

---

## [v0.1.0] — Monorepo Foundations — 2026-05-28

### Added
- npm workspaces + Turborepo monorepo scaffold.

---

## [v0.0.0] — Research & Planning — 2026-05-25 → 2026-05-27

### Added
- Competitive landscape research across existing genealogy platforms.
- First PRD draft.

---

[Unreleased]: This document reflects every milestone completed to date. See [`RootLink_PRD_Audit.md`](./RootLink_PRD_Audit.md) for what remains open against the product requirements.
