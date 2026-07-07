# Product Requirements Document — RootLink

**Version 2.0 · July 2026 · Refined against the current build**

This is a refinement of `RootLink_PRD_v1.0`, not a rewrite from scratch. Sections 1–3 and 5 (vision, market landscape, personas) are carried forward largely unchanged — they were sound at v1.0 and remain sound. Every feature requirement in Section 6 has been re-graded against what is actually implemented today, using a **Done / Partial / Cut / Deferred** status rather than the original priority-only (P0/P1/P2) scheme, because a requirements document a year into a build is more useful when it tells you what happened, not just what was wanted. Two entirely new sections — Design System (§7) and Admin & Operations (§10) — cover ground that didn't exist as a category in v1.0 because the underlying work hadn't started yet.

---

## 1. Executive Summary

RootLink is a private, collaborative family tree and heritage platform, built to address specific, named gaps in incumbent genealogy software: poor mobile UX, walled-garden paywalls, inadequate real-time collaboration, and an absence of privacy-by-default handling for the living relatives who inevitably appear in any family tree without having consented to it.

**What has changed since v1.0:** the platform shipped as a web application, not native mobile apps (see §9, Cut Scope). It shipped with a narrower AI feature set than originally scoped — deliberately, after an internal reconsideration of what "AI research assistance" should mean (see §6.4). It shipped with a complete custom visual design system that did not exist as a planned requirement in v1.0. It has not yet shipped DNA features, a printed heritage book product, or third-party record-provider integrations (FamilySearch, Findmypast, Fold3) — all of which were scoped in the original roadmap.

The vision statement from v1.0 is unchanged and still accurately describes what the product is trying to be:

> **Vision Statement:** To become the world's most human-centred platform for discovering, preserving, and sharing family heritage — blending rigorous genealogy research with the warmth of personal storytelling.

## 2. Market Landscape & Competitive Analysis

*(Carried forward from v1.0 without material change — the competitive landscape has not shifted enough since the original research to warrant re-analysis. See v1.0 §2 for the full seven-platform feature matrix against Ancestry, MyHeritage, FamilySearch, Geni, Storied, RootsMagic, and Family Tree Maker.)*

The core positioning still holds: incumbents are built on architecture and UI patterns from 2010–2015, none combine strong mobile UX with meaningful real-time collaboration, and none treat a living relative's privacy as a first-class design constraint rather than an account setting the tree owner has to remember to configure.

## 3. Product Vision, Goals & Non-Goals

### 3.1 Product Goals (unchanged from v1.0)
- Make starting a tree fast and low-commitment — no requirement for complete information before beginning.
- Make collaboration a first-class capability, not a bolt-on — the people who actually have the photographs and the memory for dates are rarely the same person maintaining the software.
- Default to protecting people who never consented to being in the tree (living relatives), rather than treating privacy as an opt-in.
- Keep the data portable — a family's record should outlive any single vendor's continued existence.

### 3.2 Non-Goals (updated for v2.0)

The original v1.0 non-goals list is preserved and extended with items that became explicit non-goals *during* the build rather than being anticipated up front:

- Not a DNA testing service (unchanged from v1.0) — and, updated: not yet a DNA *match visualization* platform either, despite that being scoped as a Phase 3 P2 item. No DNA feature of any kind exists in the current build.
- Not a records-search engine competing with Ancestry's document archive depth (unchanged).
- **New non-goal, established during the build:** not an AI system that presents externally-sourced record matches as fact. The original v1.0 AI Research Assistant concept (§6.4) called for "proactive record hints from partner APIs" (FamilySearch, Findmypast, Fold3). During implementation this was deliberately narrowed to hints generated only from patterns in the user's own already-entered data — see §6.4 for the reasoning. Matching against external records to *surface as suggested facts* remains an explicit non-goal until a matching approach can be built that doesn't risk presenting a plausible-but-wrong match as if it were verified.
- **New non-goal:** native mobile apps, for the initial product lifecycle. See §9.

## 4. User Personas

*(Unchanged from v1.0 — Casual Family Connector, Serious Genealogist, Diaspora Storyteller. All three personas remain valid descriptions of who uses the product; nothing learned during the build has contradicted them.)*

## 5. Feature Requirements — status against the current build

Status legend: ✅ **Done** (built and working) · 🟡 **Partial** (built but incomplete or degraded) · ❌ **Not built** · ✂️ **Cut** (deliberately descoped, will not be built as originally specified) · ⏸ **Deferred** (still intended, not yet started)

### 5.1 Core Tree & Profile Features

| Feature | v1.0 Priority | Status | Notes |
|---|---|---|---|
| Multiple tree views (Pedigree, Fan, Descendants) | P0 | ✅ Done | Hourglass view specifically was descoped; the other three shipped. |
| Person profile with progressive disclosure | P0 | ✅ Done | |
| GEDCOM 5.5.1 / 7.0 import & export | P0 | ✅ Done | Available on every tier including free, as originally intended. |
| Inline edit without modal | P0 | 🟡 Partial | Editing exists via a dedicated form, not true click-to-edit inline; the modal-avoidance goal was not fully met. |
| Relationship calculator / path finder | P1 | ❌ Not built | |
| Timeline view per person/family | P1 | ❌ Not built | |
| Duplicate detection & merge wizard | P1 | ❌ Not built | No duplicate-person detection exists; a user could create two records for the same person with no system-level warning. |
| Data quality score per person | P2 | ✅ Done | Shipped earlier than its original P2/Phase-2 slot — became load-bearing for the dashboard's completeness visualization. |
| Cycle prevention (person cannot be own ancestor) | *(not in v1.0)* | ✅ Done | Added during implementation as a correctness requirement not explicitly named in v1.0. |
| Infinite-canvas smooth pan/zoom at 10,000+ nodes | P0 | 🟡 Partial | Pan/zoom works; has not been load-tested at the specified 10,000-node scale. |

### 5.2 Collaboration & Sharing

| Feature | v1.0 Priority | Status | Notes |
|---|---|---|---|
| Role-based permissions | P0 | ✅ Done | Five roles shipped (viewer, contributor, editor, admin, owner) — more granular than v1.0's four-role spec. |
| Edit history with rollback | P0 | ✅ Done | Per-person and per-relationship, with restore. |
| Shareable read-only link, no signup required | P0 | ✅ Done | With the added, non-originally-specified guarantee that living persons are auto-redacted regardless of the tree's privacy level — see §5.4. |
| Invite via email | P0 | 🟡 Partial | Email invite shipped; SMS and QR-code invite paths did not. |
| Real-time co-editing with presence indicators | P1 | ✅ Done | Presence shipped early; **actual data sync** (seeing a collaborator's edit appear live) was found to be entirely missing in a later audit — the WebSocket layer synced presence only, for a period of the build — and was fixed in Milestone 18. Both now work. |
| Conflict resolution queue (approve/reject pending edits) | P1 | ❌ Not built | Edit history + rollback exists as the actual conflict-handling mechanism instead; no separate approval queue was built. |
| Family group chat | P1 | ❌ Not built | |

### 5.3 AI & Research Features

| Feature | v1.0 Priority | Status | Notes |
|---|---|---|---|
| AI Research Assistant — record hints from partner APIs | P1 | 🟡 Partial (redesigned) | Rebuilt to generate hints only from patterns already present in the user's own tree data (a missing birthplace, an unexplained date gap) rather than matching against external records. See the reasoning in the [changelog, v0.17.0 entry](./RootLink_Changelog.md) and the [bugs report](./RootLink_Bugs_And_Security_Fixes.md). External-record matching (FamilySearch, Findmypast, Fold3) remains genuinely unbuilt — the worker has a stubbed integration point and nothing behind it. |
| AI Biography Generator | P1 | ✅ Done | Drafts a biography from a person's own recorded facts; explicitly labeled as a draft, not a verified account. |
| Automated relationship suggestions (Smart Match) | P1 | ❌ Not built | |
| Document OCR / transcription | P1 | ❌ Not built | |
| AI photo enhancement (colorization, upscaling) | P2 | ❌ Not built | |
| DNA triangulation dashboard | P2 | ❌ Not built | See §9 — currently a listed Pro-tier feature with no implementation, a real product-integrity gap that needs resolving one way or the other before it's charged for. |
| Migration route map | P2 | ❌ Not built | |

### 5.4 Media & Storytelling

| Feature | v1.0 Priority | Status | Notes |
|---|---|---|---|
| Per-person media gallery (photos, documents, audio, video) | P0 | 🟡 Partial | Photos and documents (PDF) are fully supported with thumbnailing; audio/video upload was not built. |
| Life Story builder (guided narrative editor) | P1 | ❌ Not built | The AI Biography Generator (§5.3) partially substitutes for this. |
| Voice memory capture | P1 | ❌ Not built | |
| Family Capsule (time-locked vault) | P2 | ❌ Not built | |
| Printable heritage book | P1 | ❌ Not built | No print-product pipeline exists; this was also a named revenue feature in v1.0's monetization plan (§8) that has not materialized. |
| Anniversary/birthday reminders | P1 | ❌ Not built | |
| Social sharing cards | P2 | ❌ Not built | |

### 5.5 Privacy & Security

| Feature | v1.0 Priority | Status | Notes |
|---|---|---|---|
| Living-person auto-redaction in shared/public views | P0 | ✅ Done | This became the single most load-bearing privacy requirement in the actual build — see the dedicated Privacy Policy section it necessitated, and Finding #1 in the [bugs report](./RootLink_Bugs_And_Security_Fixes.md), which is where it was found to be *missing* in an early audit and subsequently fixed. |
| Granular privacy per person (Public/Family/Private) | P0 | 🟡 Partial | Privacy level is set per-*tree*, not independently per-person as v1.0 specified. A person cannot currently be marked more restrictive than their tree's overall setting, other than the living-person redaction above. |
| Two-factor authentication | P0 | ✅ Done | TOTP-based; SMS 2FA (also specified in v1.0) was not built. |
| GDPR/CCPA-compliant export and deletion | P0 | ✅ Done | GEDCOM export satisfies portability; account deletion removes trees and content within a defined window (see Privacy Policy). |
| Audit log of data access and exports | P1 | 🟡 Partial | The `audit_logs` table and admin-facing viewer both exist (Milestone 19) and capture admin actions and authentication events. It does **not** yet log routine data *access* (e.g., a collaborator viewing a person's profile) — only mutations and auth events. Read-access auditing remains unbuilt. |
| End-to-end encryption for sensitive media | P1 | ❌ Not built | |

### 5.6 Mobile

| Feature | v1.0 Priority | Status | Notes |
|---|---|---|---|
| Native iOS/Android apps with feature parity | P0 | ✂️ **Cut** | See §9. RootLink is a responsive web application; no native app of any kind exists or is currently planned. |
| Offline mode | P1 | ❌ Not built | A PWA manifest exists but no service worker is registered — offline access does not function despite being a listed Plus/Pro tier feature. This is a product-integrity gap (see §9) similar to the DNA situation: a feature is being sold that doesn't exist. |
| Camera-first media intake | P1 | ✂️ Cut (as a native feature) | Standard web file/camera input works via the browser; no dedicated scan-and-deskew pipeline was built. |
| Push notifications | P0 | ❌ Not built | In-app notifications exist (the notification panel); push notifications to a device do not. |

## 6. Billing & Monetization *(substantially revised from v1.0 §9)*

v1.0's monetization plan centered on a freemium model with premium records access, AI features, and a printed heritage book as the three named revenue levers. The actual build implements a simpler, fully-realized three-tier subscription model (Free / Plus / Pro) via Stripe, with limits on tree count, people-per-tree, storage, and AI usage — **not** the originally-specified "premium records access" (there is no records marketplace) or heritage book (not built).

- ✅ Full Stripe integration: checkout, customer portal, webhook-driven lifecycle (upgrade, renewal, cancellation, failed-payment notification).
- ✅ Three tiers with real, enforced limits.
- ❌ Printed heritage book revenue line — not built.
- ❌ Premium record-access marketplace — not applicable; RootLink does not host third-party historical records at all, by design (see §3.2's AI non-goal).
- ⚠️ **Known integrity gap:** DNA matching and offline/PWA access are both listed among Pro/Plus tier features on the pricing page, and neither is implemented. This should be resolved — either build the feature or remove it from what's being sold — before it's treated as settled.

## 7. Design System Requirements *(new in v2.0 — did not exist as a section in v1.0)*

v1.0 specified UX principles (§7 in the original) but did not anticipate a fully custom, named design system, because that work had not yet been conceived. It exists now, and is a real product requirement going forward: any new surface added to RootLink is expected to conform to it, not introduce a new one-off visual treatment.

Full detail lives in [`RootLink_UI_System_Design_Decisions.md`](./RootLink_UI_System_Design_Decisions.md). Summary requirements:

- **Palette:** deep forest green / warm amber / bone white ("Rooted Modernity"), replacing an earlier generic navy/parchment system. No new surface should introduce a color outside this token system without a documented reason.
- **Three contextual visual modes:** Grove (dark, for hero/onboarding/high-emotion moments), Vault (warm bone, for archival/reading contexts), Workbench (clean white, for data-dense editing contexts). A new page should be assigned to one of these three modes deliberately, not left to default.
- **Brand mark:** a custom 3D logo whose form is literally a miniature pedigree chart, not a decorative icon. No generic icon library glyph should be used as a stand-in for the brand mark under any circumstance.
- **Icon system:** two custom tiers (compact nav icons, larger isometric feature icons) intended to fully replace generic icon-library glyphs in brand-facing chrome. Utility/functional icons (e.g., a generic close button) may still use the underlying icon library where no brand meaning is being conveyed.
- **Motion:** every animated transition must respect `prefers-reduced-motion`. Loading states use the branded `BranchLoader`, not a generic spinner. Empty states use an illustrated `EmptyState` variant, not a bare "no data" message.
- **Accessibility floor:** the tree canvas (the product's primary and most complex interactive surface) must remain keyboard-navigable with a screen-reader-accessible fallback at all times — this was a real, fixed defect (Milestone 18) and is now a standing requirement, not just a one-time fix.

## 8. Technical Architecture *(revised from v1.0 §8 to reflect actual stack)*

v1.0 recommended a technical direction without committing to specific frameworks. The actual stack:

- **API:** Fastify 5, TypeScript, Drizzle ORM over PostgreSQL, Redis for caching and BullMQ job queues, S3-compatible object storage.
- **Realtime:** native WebSocket via `@fastify/websocket`, not a CRDT/Operational-Transform library as v1.0's collaboration section implied might be needed — the actual conflict model is edit-history-with-rollback (§5.2), not live conflict-free merging, so a simpler transport sufficed.
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS with a custom token layer, D3 for tree visualization, Recharts for dashboard charts, Framer Motion for animation.
- **AI:** Anthropic API, used only for biography drafting and own-data hint generation (§5.3) — no third-party genealogy-record API integration exists.
- **Payments:** Stripe.
- Full data model: see [`packages/db/src/schema.ts`](../packages/db/src/schema.ts) — 14 tables.

## 9. Cut & Deferred Scope — an honest accounting

Rather than let deviations from v1.0 stay implicit, they're listed here directly:

**Cut (will not be built as originally specified):**
- Native iOS/Android apps. RootLink is a responsive web application. Revisiting this would be a new scoping exercise, not a resumption of the original plan.
- Camera-first document scanning pipeline (deskew/enhance) as a dedicated native feature.
- SMS-based invitations and SMS 2FA.

**Product-integrity gaps requiring a decision, not just more engineering time:**
- DNA matching is listed as a Pro-tier feature and does not exist. Either build it or remove it from what's sold.
- Offline/PWA access is listed as a Plus/Pro-tier feature; no service worker is registered, so it does not function. Same resolution needed.
- API access is listed as a Pro-tier feature; no public API surface or key-issuance flow exists.

**Deferred (still intended, genuinely not started):**
- FamilySearch/Findmypast/Fold3 record-matching integration (contingent on solving the hallucination-risk problem described in §3.2 and §5.3).
- Relationship path finder, duplicate detection/merge wizard, timeline view.
- Printed heritage book product.
- Read-access audit logging (distinct from the mutation/auth logging that does exist).
- Per-person (rather than per-tree) granular privacy levels.

## 10. Admin & Operations Requirements *(new in v2.0)*

Not present in v1.0 because no admin surface was scoped at that stage. Now a real, shipped requirement set:

- A dedicated admin dashboard, access-gated by a database-checked flag (not a JWT claim, so revocation takes effect on the next request rather than after a token's natural expiry).
- System-wide statistics: user counts, tier breakdown, tree/person/media counts, storage usage.
- User management: search, tier changes, suspension/restoration, account unlock.
- Tree moderation: search, soft-deletion.
- An audit log covering admin actions and authentication events (see the read-access gap noted in §9).
- Background-job observability via a dedicated queue dashboard.

## 11. Success Metrics & KPIs *(revised from v1.0 §11)*

v1.0's metrics (50,000 users by month 6, $150K MRR by month 12, etc.) were written before any user acquisition had occurred and assumed a native-mobile-inclusive launch that didn't happen; they are not usable as-is. Revised to metrics that are actually measurable against the current build and don't assume a launch motion that hasn't been decided yet:

**Product health (measurable today)**
- Time-to-first-tree-render from signup: retained as a target, unchanged at < 3 minutes — this remains achievable and worth tracking once there's real signup traffic.
- Percentage of trees with ≥ 3 people added within the first session (a proxy for the original "D7 tree completion" metric, tightened to first-session since onboarding now actively walks a user to their first two tree nodes).
- Living-person redaction correctness: 100% — any regression here is a P0 incident, not a metric to trend.

**Deferred until there is real usage data:**
- Acquisition, retention, and revenue targets from v1.0 (registered users, D30/D90 retention, MRR, ARPU) require actual production traffic to be meaningful and are not restated here with invented numbers. They should be re-established once the product has been live with real users for a defined observation window, not carried forward from a pre-launch planning document.

## 12. Risks & Mitigations *(revised from v1.0 §12)*

Two new risks not present in v1.0, both surfaced by actual building rather than planning:

- **Risk:** selling tier features (DNA, offline access) that don't exist yet erodes trust the moment a paying customer discovers the gap. *Mitigation:* resolve the §9 product-integrity gaps before any paid-tier marketing push; in the interim, be conservative about how prominently unbuilt features are marketed.
- **Risk:** a design system this custom (bespoke logo, hand-drawn icon sets, a 3-mode visual language) is more expensive to extend consistently than adopting a component library would have been — every new surface needs deliberate design attention rather than being able to compose from existing generic parts. *Mitigation:* the [design decisions document](./RootLink_UI_System_Design_Decisions.md) exists specifically to make that extension cost lower by giving any future contributor (human or AI) the actual patterns to follow rather than requiring them to reverse-engineer the system from finished screens.

Risks from v1.0 that remain valid and unchanged: incumbent platforms responding competitively, data-loss/trust incidents being disproportionately damaging for a heritage product, and the difficulty of achieving viral/referral-driven growth without a mobile app to distribute through app-store discovery.

---

*This document should be re-refined at the next major milestone boundary. See [`RootLink_PRD_Audit.md`](./RootLink_PRD_Audit.md) for the current point-in-time audit this refinement is based on.*
