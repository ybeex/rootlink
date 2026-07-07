# Business Requirements Document — RootLink

**Version 1.0 · July 2026**

This document defines RootLink's business case, objectives, constraints, and rules — the things a business stakeholder, investor, or future hire would need to understand that a product requirements document doesn't cover. For feature-level detail, see [`RootLink_PRD_v2.md`](./RootLink_PRD_v2.md). For the underlying market research this document draws on, see PRD §2.

---

## 1. Business Context

### 1.1 The problem, stated as a business opportunity

Family history software is a mature category (Ancestry, MyHeritage, and FamilySearch have collectively operated for decades) with a structural gap that none of the incumbents have closed: they are built around a single-researcher usage pattern and treat the privacy of non-users named in a tree as an afterthought rather than a design constraint. This is not a feature gap that can be closed with a point release — it requires the product to be architected differently from the ground up, which is expensive for an incumbent with an existing user base and data model to preserve, and comparatively cheap for a new entrant building from scratch.

RootLink exists to occupy that gap: a genealogy product built collaboration-first and privacy-first, rather than retrofitting either onto a single-user architecture.

### 1.2 Business model

Freemium SaaS, three tiers (Free / Plus / Pro), billed via Stripe. Free tier is deliberately usable, not a crippled trial — enough trees, people, and storage to build a real starter family record — because the product's own growth thesis depends on a tree being useful enough that a second and third family member willingly join it, which a hobbled free tier would work against.

## 2. Business Objectives

Listed in priority order. These are business-level goals — see PRD §11 for the product-level metrics that would indicate progress against them, which are currently marked "deferred until there is real usage data" because the product has not yet had a public launch with production traffic.

1. **Establish product-market fit** with a defensible, differentiated position (privacy-by-default, real collaboration) before any paid user-acquisition spend.
2. **Reach a sustainable free-to-paid conversion rate** sufficient to justify continued solo-founder or small-team investment, without a specific number committed to until real cohort data exists.
3. **Avoid a trust-destroying incident** — a data breach, a living relative's information exposed against their will, or a billed feature that doesn't work — given that a heritage product's entire value proposition rests on being trusted with a family's most personal records. See §6, Business Risk.
4. **Keep the cost structure sustainable at solo-founder scale** — infrastructure and API costs must remain proportionate to a pre-revenue or early-revenue business, not assume venture-scale burn.

## 3. Stakeholders

| Stakeholder | Interest |
|---|---|
| Founder (Usouff) | Product direction, all current engineering and business decisions, financial risk |
| Free-tier users | A genuinely usable product at no cost; their data handled responsibly even though they generate no direct revenue |
| Paying subscribers (Plus/Pro) | Feature value proportionate to price; billing accuracy; support responsiveness |
| Non-user data subjects (living relatives named in a tree by someone else) | The most under-served stakeholder class in the entire genealogy category — see §5.3. They have no account and no direct relationship with RootLink, but their personal data is processed by it. |
| Future employees/contractors | Not yet applicable — the project is currently solo-founder-operated. Documentation (this suite) exists partly to make future onboarding possible without requiring the founder to be the sole source of institutional knowledge. |
| Legal/compliance counsel | Not yet engaged. The Terms of Service and Privacy Policy both carry an explicit notice that they are unreviewed templates — see §7.2. This is a known, named gap, not an oversight. |

## 4. Business Scope

- **Geography:** no geographic restriction is currently enforced at signup; the Privacy Policy references GDPR/UK-GDPR obligations as applicable to EU/UK residents, implying an assumption of a global or at-least-Western user base. No data residency commitments (e.g., EU data staying in EU infrastructure) currently exist.
- **Market segment:** individual and family users (PRD personas: Casual Family Connector, Serious Genealogist, Diaspora Storyteller). No institutional/enterprise tier (libraries, genealogical societies, funeral homes) is in scope.
- **Out of scope for the business, not just the product:** RootLink does not and will not host or resell third-party historical records (birth/death/census record archives) — this is both a product non-goal (PRD §3.2) and a deliberate business-scope decision, since entering that market would mean competing directly with Ancestry's core data-licensing business rather than the collaboration/privacy gap RootLink is positioned against.

## 5. Business Rules

These are rules the *business* enforces, independent of how any given feature happens to be implemented — a business rule should survive a full rewrite of the underlying code.

### 5.1 Subscription & billing rules
- A subscription's tier limits (tree count, people-per-tree, storage, AI usage) are enforced at the point of the action that would exceed them, not retroactively — a user who downgrades is not forced to delete data to come under a lower limit; a tier downgrade caps *future* creation, not existing content. *(Verify this is actually how the current enforcement behaves — see the PRD audit for confirmation against code.)*
- Cancellation takes effect at the end of the current paid billing period; no prorated refund is issued for the unused remainder, consistent with the Terms of Service.
- A failed payment does not result in immediate service loss — Stripe's own dunning/retry schedule runs first, with the user notified by email, before any downgrade occurs.

### 5.2 Data retention & deletion rules
- On account deletion, a user's trees and content are removed from active systems within 30 days (per the Privacy Policy). Backups age out on their own independent retention schedule and are not separately searchable or restorable on request.
- Media files are removed from object storage at the point the containing item is deleted, not batched with the 30-day account-level window — a stricter rule than the account-deletion window because media is the highest-sensitivity content type (photographs of real people, including living ones).

### 5.3 The living-relative rule *(the business's central differentiating rule)*
- Any person marked "living" in a tree is automatically excluded — name, dates, photograph, biography — from anything shared outside the tree's actual invited membership, regardless of the tree owner's own privacy setting for the tree as a whole. This rule cannot be overridden by the tree owner. This is the single business rule most directly tied to RootLink's competitive positioning (§1.1) and should be treated as non-negotiable in any future feature work — a feature that would require weakening this rule to ship should be redesigned, not shipped with an exception carved in.
- A living person named in someone else's tree — who has no RootLink account and no direct relationship with the business — has a standing right under the Privacy Policy to contact RootLink directly and request correction or removal of their information, independent of the tree owner's cooperation. Operationally, at current (solo-founder, no support team) scale, this means the founder personally handles any such request; this does not scale past a certain volume and should be revisited (staffing or tooling) before it becomes a bottleneck.

### 5.4 Administrative authority rules
- Suspending a user account prevents login but does not delete their data — a business rule kept intentionally reversible, since suspension is a moderation action, not a punitive data-destruction action.
- Admin access is granted by direct database modification, not through any self-service or in-app promotion flow — a deliberate business rule limiting who can ever hold admin authority to whoever already has direct database access, i.e., currently the founder alone.

## 6. Business Risk Assessment

Distinct from the technical/security risk register in the bugs & security report — these are risks to the *business*, not to the running system.

| Risk | Likelihood | Impact | Notes |
|---|---|---|---|
| Key-person dependency — solo founder is the sole holder of product knowledge, admin access, and (per §5.4) the only person who can grant further admin access | High (structural, not speculative) | Severe | No mitigation currently in place beyond the documentation suite this BRD is part of. Should be an early priority if any co-founder or early hire is brought on. |
| Selling tier features that don't exist (DNA matching, offline access — see PRD §9) | Certain, if marketed before resolved | Moderate-to-severe depending on scale at time of discovery | A refund/goodwill-credit policy for affected subscribers should be decided in advance, not improvised after a complaint. |
| Legal exposure from unreviewed Terms of Service / Privacy Policy | Unknown until reviewed | Potentially severe, especially given the product's handling of non-user (living relative) personal data under GDPR-adjacent obligations | This is the single highest-priority business-side gap identified in this document. See §7.2. |
| Minors' data — a tree may include living minors added by an adult relative | Certain (this will happen; genealogy trees include children) | Moderate | The Privacy Policy addresses this at a product-copy level (children's data handled under the same living-person protections). Whether this satisfies COPPA or equivalent regimes in every relevant jurisdiction has not been confirmed by counsel. |
| Competitive response from incumbents (Ancestry, MyHeritage) | Low near-term (RootLink's current scale doesn't yet warrant a response) | Low near-term, rising with scale | Consistent with PRD §12's competitive risk; revisit as user numbers grow. |
| Infrastructure cost scaling faster than revenue (storage and AI API costs both scale with usage, not just with paying-user count, since free-tier usage still consumes storage/compute) | Moderate | Moderate | No current cost-per-user tracking exists; recommend instrumenting this before any paid acquisition spend, so the free tier's cost is a known, bounded number rather than an assumption. |

## 7. Constraints

### 7.1 Organizational constraints
- Solo-founder operated. Every business rule, security decision, and product tradeoff in this suite of documents currently traces back to one person's judgment, with no second reviewer. This is a real constraint on risk tolerance — decisions that a larger organization might route through legal/security/product review are currently made unilaterally, which is faster but has no built-in check.

### 7.2 Legal/compliance constraints
- **The Terms of Service and Privacy Policy are explicitly unreviewed by counsel** — both documents carry a visible notice to this effect. This is the most important standing constraint in this entire document: no aggressive marketing push, no institutional partnership, and no expansion into a jurisdiction with stricter data-protection law than the current assumed baseline should proceed without resolving this first.
- No data processing agreement (DPA) template exists for any future institutional customer, since none is currently in scope (§4).

### 7.3 Financial constraints
- No committed marketing or paid-acquisition budget is assumed by this document. Business objective #1 (§2) — reaching product-market fit before paid acquisition spend — is itself partly a response to this constraint, not purely a strategic preference.

## 8. Assumptions

- That a meaningfully-usable free tier drives organic, referral-based growth (a family member invites other family members into an existing tree) rather than requiring paid acquisition to reach initial scale. This is unverified — no production usage data yet exists to confirm or refute it.
- That the three-tier Stripe-based pricing model, carried over from the original PRD's monetization plan minus the heritage-book and premium-records revenue lines (see PRD §6), is sufficient on its own to reach sustainability without those additional revenue lines. Also unverified.
- That GDPR/UK-GDPR is the correct regulatory baseline to design against by default, given no confirmed primary target market. If the actual early user base skews toward a different regulatory environment (e.g., predominantly US-based with no EU users), this assumption should be revisited alongside the broader legal review in §7.2.

## 9. Business Success Criteria

Distinct from the product KPIs in PRD §11 (which measure whether people use the product well) — these measure whether the *business* is healthy:

- **Legal compliance status resolved** — Terms of Service and Privacy Policy reviewed by qualified counsel, and any changes required by that review implemented. Currently the single most overdue item in this document.
- **Cost-per-free-user known and bounded** — before any paid acquisition spend, the business should know what a free-tier account costs to host (storage + compute + any AI usage) so the free tier's economics are a deliberate choice, not an unknown liability.
- **Zero living-relative privacy incidents** — given §5.3's status as the business's core differentiator, a single well-publicized failure here would be disproportionately damaging to the exact positioning RootLink is built around, not merely embarrassing.
- **Tier-feature integrity restored** — the DNA-matching and offline-access gaps (PRD §9) resolved one way or the other (built, or removed from what's sold) before they're allowed to sit indefinitely as a business-level honesty risk.

## 10. Governance & Change Control

Given the solo-founder constraint (§7.1), formal governance is minimal by necessity. The practice adopted for this documentation suite — and recommended as a durable habit even after any future hire — is:

- Any change to a business rule in §5, particularly the living-relative rule (§5.3), should be treated as requiring the same deliberateness as a legal document change, not an ordinary product iteration, given its centrality to the business's positioning.
- This document and the PRD should be re-reviewed together at the same cadence, since a product change with no corresponding business-rule implication is rare in a company this size — most product decisions here *are* business decisions.

---

*Next review trigger: resolution of the legal review in §7.2, or the onboarding of any second decision-maker (co-founder, senior hire), whichever comes first.*
