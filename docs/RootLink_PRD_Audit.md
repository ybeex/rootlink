# RootLink — PRD Audit

**The current build, verified line-by-line against [`RootLink_PRD_v2.md`](./RootLink_PRD_v2.md).**

This is not a restatement of the PRD's own status tables. Every claim below was independently checked against the live codebase — file contents, actual route registrations, actual schema columns — specifically to catch places where the PRD's self-assessment might be wrong, imprecise, or have missed something. It found three such cases, including one genuinely new, previously-undocumented bug (§2.1). Where the PRD's claim held up under verification, that's noted briefly; where it didn't, the correction is explained in full with the exact code that proves it.

---

## 0. Headline result

**Of the ~70 individually-tracked requirements across the PRD's feature sections, roughly 40% are fully built, 20% are partially built, and 40% are not built, cut, or deferred** — consistent with the PRD's own honest framing of itself as a document that tracks a real, imperfect build rather than a completed one. The three most important findings from this audit are:

1. **A real, unflagged bug**: `createPerson` does not enforce the per-tree person-count subscription limit at all, despite fetching the exact data it would need to (§2.1). This is more serious than anything in the PRD's own "known gaps" list, because it's not a missing feature — it's a paid-tier boundary silently not working.
2. **The PRD undersells GEDCOM import's actual data-integrity behavior**: it doesn't just lack duplicate detection (as stated) — it explicitly creates duplicate person records on every re-import, by the frontend's own admission in its upload-dialog copy (§2.1).
3. **The PRD oversells two things and undersells one**: person-level privacy is schema-present but functionally inert (§2.3); audio/video media upload is more built than "not built" — files upload successfully and are stored, they simply never receive a thumbnail (§2.2).

---

## 1. Core Tree & Profile Features (PRD §5.1)

| Requirement | PRD claim | Audit finding |
|---|---|---|
| Three tree views (Pedigree/Fan/Descendants) | ✅ Done | **Confirmed.** `PedigreeTree.tsx` branches on `viewMode` for `'pedigree'`, `'fan'`, and `'descendants'` (lines 118, 142, 546, 549). |
| Cycle prevention | ✅ Done | **Confirmed.** `relationship.service.ts` contains an explicit ancestor-cycle guard with the comment "Returns true if making `parentId` a parent of `childId` would create a cycle" (line 160). |
| Duplicate detection & merge wizard | ❌ Not built | **Confirmed, and worse than stated.** No duplicate-*person* detection exists anywhere in the codebase — the only "duplicate" handling found is (a) a relationship.service.ts guard against duplicate *relationship* records (a different, narrower thing), and (b) `GedcomPanel.tsx`'s own upload dialog, which tells the user outright: *"Existing persons will not be overwritten — duplicates are created."* This means re-importing a GEDCOM file, or importing two files describing overlapping family branches, will produce duplicate person records with no system-offered way to merge them. This should be treated as a data-integrity risk, not just a missing convenience feature. |
| Data quality score | ✅ Done | **Confirmed.** `computeDataQualityScore` exists in `packages/shared/src/utils.ts` and is invoked on person creation. |
| Infinite-canvas performance at 10,000+ nodes | 🟡 Partial (untested at scale) | **Cannot be verified by static audit** — this requires a load test, not a code read. Flagged as still open. |

## 2. Newly-verified corrections to the PRD's own claims

### 2.1 Critical: `createPerson` does not enforce the per-tree person limit

**This is not in the PRD's gap list and should be added to it.** `tree.service.ts`'s `createTree` implements the tier-limit check correctly and completely:

```typescript
// apps/api/src/services/tree.service.ts — createTree (correct pattern)
const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS]
  ?? SUBSCRIPTION_LIMITS.free;

const [{ treeCount }] = await db
  .select({ treeCount: count() })
  .from(trees)
  .where(and(eq(trees.ownerId, userId), isNull(trees.deletedAt)));

if (Number(treeCount) >= limits.maxTrees) {
  throw createAppError('TREE_LIMIT_REACHED', `Your plan allows a maximum of ${limits.maxTrees} trees. Upgrade to create more.`, 403);
}
```

`person.service.ts`'s `createPerson` has a comment declaring the same intent, fetches half the data needed, and never finishes the check:

```typescript
// apps/api/src/services/person.service.ts — createPerson (incomplete)
async createPerson(treeId: string, userId: string, input: CreatePersonInput, idempotencyKey?: string) {
  const { db } = getDb();

  // Check tree person limit
  const [treeRow] = await db
    .select({ personCount: trees.personCount, ownerId: trees.ownerId })
    .from(trees)
    .where(eq(trees.id, treeId))
    .limit(1);

  if (!treeRow) throw createAppError('TREE_NOT_FOUND', 'Tree not found', 404);

  // ... proceeds directly to INSERT — no comparison against SUBSCRIPTION_LIMITS,
  // no fetch of the owner's subscription tier, no limit error ever thrown
```

`personCount` and `ownerId` are fetched — exactly the two pieces of information `createTree`'s pattern would need (tier lookup via `ownerId` → `users.subscriptionTier`, then compare `personCount` against `limits.maxPersonsPerTree`) — and then neither is used for anything resembling a limit check. **Practical impact: a free-tier account, capped at 500 people per tree on the pricing page, can currently add an unbounded number of people to a single tree.** This directly undermines the business model described in PRD §6/BRD §5.1. Recommended fix pattern is the exact structure already proven correct in `createTree`.

### 2.2 Media: audio/video is more built than the PRD states

The PRD (§5.4) states audio/video upload "was not built." Verification found this imprecise:

```typescript
// packages/shared/src/constants.ts — ALLOWED_MIME_TYPES includes audio and video keys
```

The upload flow (presign → PUT → confirm) accepts and stores audio/video files; `media.service.ts`'s type handling does not reject them. What's actually missing is thumbnail/preview generation, which the processing worker explicitly gates to photos only:

```typescript
// apps/api/src/workers/media.worker.ts
if (type === 'photo' && PHOTO_MIME_TYPES.has(s3Obj.ContentType ?? '')) {
  // ...sharp-based thumbnail generation...
}
// no corresponding branch exists for 'audio' or 'video'
```

**Corrected status: 🟡 Partial, not ❌ Not built.** Audio and video files can be uploaded, stored, and downloaded; they simply have no thumbnail, waveform, or preview of any kind, unlike photos and documents. Whether this is an acceptable partial state or worth completing (at minimum, a generic file-type icon in place of a thumbnail, which is a much smaller lift than a real audio/video preview pipeline) is a product decision, not further audit work.

### 2.3 Privacy: person-level `privacyLevel` exists in the schema but is functionally inert

The PRD (§5.5) states granular per-person privacy "was not built... privacy level is set per-tree." Verification found the schema is actually more built than that, but the extra capability does nothing:

- `persons` table has its own `privacyLevel` column, separate from the `trees` table's.
- It is written on person creation (`input.privacyLevel` is persisted).
- It is never read by `redactLivingPerson` (the actual function that decides what a viewer sees) — that function checks only `person.isLiving`. It is never read by the tree-level access-control middleware either, which uses `trees.privacyLevel` exclusively.

**Corrected status: the column is not "not built" — it is built, stored, and completely unused.** This is arguably a worse state than not having the column at all: a user (or a future engineer reading the schema) could reasonably assume setting a person's privacy level does something, when it currently changes no visible behavior whatsoever. Recommend either wiring it into `redactLivingPerson` and the access-control check, or removing the column and its write path so the schema doesn't imply a capability that doesn't exist.

## 3. Collaboration & Sharing (PRD §5.2)

All PRD claims in this section were spot-checked and held up under verification:
- Five-role enum confirmed exactly as stated: `type TreeRole = 'viewer' | 'contributor' | 'editor' | 'admin' | 'owner'` (`packages/shared/src/types.ts`, line 141).
- Real-time data sync (the Milestone 18 fix) confirmed present — `publishTreeEvent` calls exist in `person.service.ts`, `relationship.service.ts`, and `tree.service.ts`, gated by the `getTreePermission` authorization check added in the same milestone.
- Conflict-resolution queue confirmed absent — no approval-queue table, route, or UI component exists; edit-history-with-rollback is the sole conflict-handling mechanism, as the PRD states.

## 4. AI & Research Features (PRD §5.3)

- **DNA:** the PRD states zero DNA implementation exists. An initial broad grep for "dna" returned hits in eight files, which on inspection were uniformly false positives — the substring "dna" appears inside `preferredName` (`...preferre-d-n-a-me...`) when lowercased and searched without a word boundary. **Confirmed: genuinely zero DNA-related code exists anywhere in the API or web app**, beyond the `canAccessDna` boolean flag in `SUBSCRIPTION_LIMITS` that nothing ever checks.
- **External record matching (FamilySearch/Findmypast/Fold3):** confirmed absent — no references to any of the three named providers exist in `apps/api/src`.
- **AI biography generation:** confirmed present and functioning as described, drafting from a person's own recorded facts via the Anthropic SDK.

## 5. Billing (PRD §6)

- Stripe checkout, portal, and webhook handling all confirmed present in `billing.service.ts` with the subscription-lifecycle branches (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) the PRD describes.
- Downgrade behavior: on cancellation or a lapsed subscription, `subscriptionTier` is set to `'free'` going forward — this correctly matches the PRD/BRD's stated rule that a downgrade caps future creation rather than retroactively deleting existing content, since no delete-cascade or content-pruning logic accompanies the tier change.
- **However:** given §2.1's finding, the free tier's per-tree person cap that a downgraded user would be expected to respect going forward is not actually enforced for *any* tier, free or paid — so today, a downgrade's practical effect on person-count behavior is moot, because the cap was never functioning to begin with.

## 6. Design System (PRD §7)

Spot-checked against the actual source rather than re-verified in exhaustive detail here, since [`RootLink_UI_System_Design_Decisions.md`](./RootLink_UI_System_Design_Decisions.md) already documents this section with real code references throughout. No discrepancies found between that document's claims and the PRD's design-system summary.

## 7. Cut & Deferred Scope (PRD §9)

- Native mobile apps: confirmed absent — no `apps/ios`, `apps/android`, or React Native/Expo configuration exists anywhere in the monorepo.
- Offline/PWA: confirmed absent — `apps/web/public/manifest.json` exists; no `sw.js` or any `serviceWorker.register(...)` call exists anywhere in `apps/web/src`.
- API access (Pro tier): confirmed absent — no public-facing API-key issuance flow, no `/v1/public` or equivalent route namespace exists; every route requires the same session-based JWT auth as the main app.

## 8. Admin & Operations (PRD §10)

- Database-checked (not JWT-claim-based) admin gating confirmed: `requireAdmin()` in `middleware/auth.ts` performs a fresh `SELECT isAdmin FROM users WHERE id = ...` per request (with a short-TTL cache), not a JWT payload check.
- Audit logging confirmed to cover admin mutations and auth events only, as the PRD states in its "read-access gap" note — no route in `apps/api/src/routes` calls `writeAuditLog` outside of `admin.service.ts` and `auth.service.ts`'s login/login_failed paths. Routine data access (viewing a person's profile, viewing a tree) is not logged, confirming the PRD's own caveat.

---

## 9. Prioritized gap list

Ordered by a combination of severity and how directly each undermines something the business is actively charging for:

1. **Fix the `createPerson` tier-limit enforcement gap (§2.1).** This is the single highest-priority item in this audit — it's not a missing feature, it's a paid-tier boundary that has never worked, discovered only by this audit rather than by any prior test or review.
2. **Resolve the person-level `privacyLevel` dead-column situation (§2.3)** — either wire it in or remove it; its current state (stored, inert) is actively misleading to anyone reading the schema.
3. **Decide GEDCOM import's duplicate-handling story (§1)** — at minimum, the current silent-duplication behavior should be surfaced more prominently to the user than the existing dialog copy does, since "duplicates are created" is easy to skim past.
4. **Resolve the DNA and offline/PWA tier-feature-integrity gaps**, as the PRD's own §9 already flags — this audit found nothing to add beyond confirming both are genuinely, completely unbuilt.
5. **Decide on audio/video media handling (§2.2)** — either add a generic non-thumbnail preview treatment (low effort) or explicitly scope out audio/video upload entirely until real preview support exists (removes a half-finished-feeling experience).

---

*This audit reflects a point-in-time, static-code review. Items marked "cannot be verified by static audit" (e.g., canvas performance at scale) require dynamic testing and are not resolved by this document.*
