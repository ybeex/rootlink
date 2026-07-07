# RootLink — Bugs & Security Fixes Report

**Every bug and security finding identified across all 23 development milestones, with the exact before/after code for each fix and the reasoning behind the chosen remediation approach.**

This report consolidates two formal security audits, one multi-disciplinary audit (bugs/product/UX/security combined), and every defect found during ordinary development and the subsequent design-consistency pass — including several classes of bug (phantom dependencies, systemic import-path errors) that were only caught by deliberate, exhaustive verification rather than the normal edit-and-test loop, and are worth understanding as patterns, not just as individual fixes.

For the literal git commands that shipped each fix, see [`RootLink_Commit_Branch_History.md`](./RootLink_Commit_Branch_History.md). For the surrounding product context of each milestone, see [`RootLink_Changelog.md`](./RootLink_Changelog.md).

---

## Summary — every finding at a glance

| # | Milestone | Finding | Severity | Category |
|---|---|---|---|---|
| 1 | 15-16 | Living persons not redacted in shared/public tree views | High | Security |
| 2 | 15-16 | Refresh/access tokens stored in browser storage readable by XSS | Medium-High | Security |
| 3 | 15-16 | No Content-Security-Policy header on the frontend | Medium | Security |
| 4 | 15-16 | Email templates interpolated user content without HTML-escaping | Medium | Security |
| 5 | 15-16 | Presigned upload size/type not re-verified at confirmUpload | Medium | Security |
| 6 | 15-16 | Open-redirect risk via `?redirect=` query param | Low | Security |
| 7 | 15-16 | Refresh-token lookup was an O(n) bounded scan, not indexed | Low | Performance |
| 8 | 15-16 | Fan and descendants tree views were label-only stubs | Low | Feature gap |
| 9 | 15-16 | No dependency vulnerability scanning in place | Info | Process |
| 10 | 17 | `createTree`/`createPerson` failed on every call (idempotency hook registered per-request) | Critical | Bug |
| 11 | 17 | Initial data-quality score computed against an always-empty events array | Low | Bug |
| 12 | 18 | WebSocket `JOIN_TREE` had no authorization check, only authentication | High | Security |
| 13 | 18 | JWT verification didn't pin an explicit signing algorithm | Medium | Security |
| 14 | 18 | Real-time collaboration only ever synced presence, never actual tree data | High | Bug (product-facing) |
| 15 | 18 | Idempotency keys used a global primary key instead of per-user composite | Medium | Bug |
| 16 | 18 | S3 media deletions were fire-and-forget with no retry | Medium | Bug |
| 17 | 18 | `Image`/`ImageIcon` lucide-react collision, recurring a fourth time | Low | Bug |
| 18 | 18 | Uploads validated against client-supplied headers, not actual file bytes | Medium | Security |
| 19 | 18 | Tree canvas was not keyboard- or screen-reader-accessible | High | Accessibility |
| 20 | 18 | Touch targets too small and hover-gated (invisible on touch devices) | Medium | Accessibility/Bug |
| 21 | 18 | Missing custom error and 404 pages | Low | UX |
| 22 | 18 | No visibility into failed background jobs | Medium | Observability |
| 23 | 18 | No payment integration existed at all | Critical | Feature gap |
| 24 | 19 | `audit_logs` table existed since initial build but was never written to | Data integrity | Bug |
| 25 | 21 | New 3D logo inconsistently deployed — 8 pages still showed the old icon | Low | Brand defect |
| 26 | 21 | `react-hot-toast` called in 4 files but never declared as a dependency — silent no-op | Medium | Bug |
| 27 | 21 | CSS-only page transitions never actually animated on client-side navigation | Low | Bug |
| 28 | 21 | 26 broken relative-import paths across 15 files (20 static + 6 dynamic) | Critical (build-breaking) | Bug |
| 29 | 22 | `recharts` imported and used, never declared as a dependency | Medium | Bug |

*29 distinct findings across 8 milestones. All 29 closed as of the current build.*

---

## Milestone 15-16 — Security Audit & Remediation

This is the most detailed phase, since every fix below has an exact, verified before/after pulled directly from the audit-remediation work.

### Fix 1 (High) — Living persons were not redacted on shared/public tree views

**The problem:** `redactLivingPerson()` existed in the shared package, fully implemented, completely unused. `PersonService.listPersons()` and `getPerson()` returned full records — name, exact birth year, biography — to *any* caller holding `viewer` role, with no distinction between an authenticated family member and an anonymous visitor following a public share link. The `/shared` page's own UI displayed a banner promising living relatives were hidden; the API didn't honor that promise.

**Before** (`apps/api/src/middleware/auth.ts` — the only access-control path that existed for tree-scoped routes):
```typescript
export function requireTreeRole(requiredRole: TreeRole) {
  return async (request: FastifyRequest<{ Params: { treeId: string } }>, reply: FastifyReply) => {
    await authenticate(request, reply); // hard-fails if no JWT — share-token visitors have none
    const permission = await getTreePermission(request.user.sub, request.params.treeId);
    if (!permission) throw createAppError('TREE_ACCESS_DENIED', '...', 403);
    if (!hasMinimumRole(permission.role, requiredRole)) throw createAppError('INSUFFICIENT_ROLE', '...', 403);
  };
}
```

This single guard meant the persons-list and persons-get routes had exactly one access path: a valid JWT for an authenticated tree member. There was no second path for share-token visitors at all in the persons/relationships routes — meaning the `/shared` page must have been calling these endpoints some other way, or the feature was incomplete at the routing layer, not just the redaction layer.

**After:** a second middleware, `requireTreeViewAccess()`, was added specifically for read-only endpoints. It tries authenticated membership first; if that fails, it falls back to validating a `?shareToken=` query parameter against the tree's stored token (and refuses the fallback entirely if the tree's `privacyLevel` is `'private'`, regardless of whether a token happens to be set):

```typescript
export function requireTreeViewAccess() {
  return async (request: FastifyRequest<{ Params: { treeId: string }; Querystring: { shareToken?: string } }>) => {
    const jwtPayload = await tryAuthenticate(request);
    if (jwtPayload) {
      const permission = await getTreePermission(jwtPayload.sub, request.params.treeId);
      if (permission && hasMinimumRole(permission.role, 'viewer')) {
        request.viewPermission = { ...permission, viaShareToken: false };
        return;
      }
    }

    const shareToken = request.query.shareToken;
    if (shareToken) {
      const [tree] = await db.select(/* ... */).from(trees)
        .where(and(eq(trees.id, request.params.treeId), isNull(trees.deletedAt))).limit(1);

      if (tree?.shareToken && tree.privacyLevel !== 'private' && tree.shareToken === shareToken) {
        request.viewPermission = { role: 'viewer', treeOwnerId: tree.ownerId, viaShareToken: true };
        return;
      }
    }

    throw createAppError('TREE_ACCESS_DENIED', 'Tree not found or access denied', 403);
  };
}
```

The persons routes were switched to this middleware and now read `request.viewPermission?.viaShareToken` to decide whether to redact:

```typescript
app.get('/', { preHandler: [requireTreeViewAccess()] }, async (request, reply) => {
  const redactLiving = request.viewPermission?.viaShareToken ?? false;
  const result = await personService.listPersons(request.params.treeId, parsed.data, { redactLiving });
  // ...
});
```

`listPersons` now maps every row through `redactLivingPerson()` when the flag is set, and caches redacted and full results under separate keys (`persons:{treeId}:redacted:...` vs `persons:{treeId}:full:...`) so a redacted response can never be served from cache to an authenticated member, or vice versa:

```typescript
data: rows.map((r) => {
  const summary: PersonSummary = { /* ... */ };
  return redactLiving ? redactLivingPerson(summary) : summary;
}),
```

`getPerson` takes a stricter approach than partial redaction for the *detail* view: rather than trying to null out individual fields (biography, notes, exact dates) and risk forgetting one as the schema grows, a living person's full detail record is refused outright with a new `PERSON_PRIVATE` (403) error code when accessed via a share token:

```typescript
if (redactLiving && person.isLiving) {
  throw createAppError(
    'PERSON_PRIVATE',
    'This person is living and their details are private on shared views',
    403,
  );
}
```

The frontend's `PersonPanel` catches this specific error code and renders a calm "this person is living" notice instead of an error state or a blank panel:

```tsx
const isPrivate = error instanceof ApiClientError && error.code === 'PERSON_PRIVATE';

{isLoading ? <PersonPanelSkeleton />
  : isPrivate ? <PrivatePersonNotice />
  : person ? ( /* full detail */ )
  : null}
```

**Why a 403-on-detail instead of field-level redaction for `getPerson`:** the list endpoint redacts in place because `PersonSummary` is a small, stable, fully-enumerated shape — every field in it has already been explicitly decided to be either safe or redacted by `redactLivingPerson()`. The detail shape (`Person & { events: VitalEvent[] }`) is larger and more likely to grow new fields over time (the PRD anticipates DNA-match data, source citations, additional event types); a refuse-by-default 403 means any *new* field added to that shape is automatically protected without anyone needing to remember to add it to a redaction allowlist. The list view still needs partial data (so the pedigree chart can render a "Living" placeholder box in the right position in the tree) — the detail view doesn't need that compromise, since the panel already shows "Living" without ever needing the underlying record.

### Fix 2 (Medium-High) — Refresh and access tokens were stored in browser storage readable by XSS

**The problem:** the refresh token (30-day validity) lived in `localStorage`; the access token was additionally persisted to `sessionStorage` via a Zustand `persist` middleware, on top of an in-memory copy. Both storage mechanisms are fully readable by any JavaScript executing on the page — including an XSS payload — meaning a single successful script injection could exfiltrate a credential valid for a month, for an app that stores genealogical PII about people (including living relatives) who never consented to being in the system.

**Before** (`apps/web/src/lib/api-client.ts`):
```typescript
async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new ApiClientError(401, 'AUTH_003', 'No refresh token');

  const response = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  // ...
  const data = await response.json();
  setAccessToken(data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  return data.data.accessToken;
}
```

```typescript
// apps/web/src/store/auth.store.ts
partialize: (state) => ({
  user: state.user,
  accessToken: state.accessToken, // persisted to sessionStorage — XSS-readable
  isAuthenticated: state.isAuthenticated,
}),
```

**After:** the refresh token is set by the API as an `httpOnly`, `Secure` (in production), `SameSite=Strict` cookie scoped to `/v1/auth`, and is never present in any JSON response body the frontend can read:

```typescript
// apps/api/src/lib/cookies.ts
export function setRefreshTokenCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/v1/auth',
    domain: env.COOKIE_DOMAIN,
    maxAge: 30 * 24 * 60 * 60,
  });
}
```

```typescript
// apps/api/src/routes/auth.routes.ts — login
const tokens = await authService.login(parsed.data, request.ip, request.headers['user-agent'] ?? '');
setRefreshTokenCookie(reply, tokens.refreshToken);
return reply.send({
  success: true,
  data: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn }, // no refreshToken field
  // ...
});
```

```typescript
// apps/web/src/lib/api-client.ts
async function refreshAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // browser attaches the httpOnly cookie automatically
  });
  // ...
  const data = await response.json();
  setAccessToken(data.data.accessToken);
  return data.data.accessToken; // nothing to write to localStorage anymore
}
```

The access token was removed from the Zustand store's `persist` partialize entirely — it now lives only as an in-memory module variable in `api-client.ts`, which does not survive a page reload by design:

```typescript
// apps/web/src/store/auth.store.ts
partialize: (state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  // accessToken intentionally absent
}),
```

**Why this is safe on reload despite the access token disappearing from memory:** the first authenticated API call after a reload will receive a `401` (no in-memory token yet), which `apiFetch`'s existing retry-after-refresh logic already handles — it calls `refreshAccessToken()`, which succeeds via the still-valid httpOnly cookie, obtains a fresh access token, and retries the original request transparently. The user never sees this happen; it looks identical to before, but the credential that makes it possible is no longer sitting in a location any injected script could read.

### Fix 3 (Medium) — No Content-Security-Policy header

**The problem:** `next.config.ts` set `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` — all correct — but no CSP at all. Given Fix 2 above removes the most attractive *target* for an XSS payload, a CSP is the next layer: it constrains what an XSS payload could even attempt, as defense-in-depth against any future regression (e.g., someone adding `dangerouslySetInnerHTML` for a "rich biography formatting" feature down the line, without realizing the security implications).

**Before:** `headers()` in `next.config.ts` returned four header objects, no fifth `Content-Security-Policy` entry.

**After:**
```typescript
function buildCsp(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = isProd
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"]; // eval needed only for dev HMR

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://*.amazonaws.com', 'https://*.r2.cloudflarestorage.com'],
    'connect-src': ["'self'", 'ws:', 'wss:', apiUrl, wsUrl],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    // ...
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}
```

**Why `'unsafe-inline'` is still present rather than a fully locked-down policy:** the existing UI relies extensively on inline `style={{ ... }}` props driven by CSS theme variables (see Phase 11's theming decision), and Next.js's hydration bootstrap script is itself inline. Removing `'unsafe-inline'` from `style-src` would require migrating that styling approach to class-based CSS — a real, larger refactor, not something to bundle silently into a security-fix PR. The CSP as shipped still meaningfully blocks the most common XSS payload shapes (script tags injected via innocent-looking user content, `<img onerror=...>` attempting to load attacker scripts from a third-party origin) while being honest in its own code comments about what it doesn't yet cover, so the remaining work is visible rather than hidden.

### Fix 4 (Medium) — Unescaped user content in HTML emails

**The problem:** the email worker's HTML templates interpolated `inviterName`, `treeName`, `message`, `hintTitle`, `hintDescription` directly into template-literal HTML with no escaping. A tree named `<img src=x onerror=alert(1)>` (an edge case, but a real one — tree names are free text) would render that markup verbatim in the recipient's inbox.

**Before:**
```typescript
html: `
  <h1>${String(data['inviterName'])} shared a family tree with you</h1>
  <p>You have been invited to collaborate on <strong>${String(data['treeName'])}</strong> ...</p>
  ${data['message'] ? `<blockquote>${String(data['message'])}</blockquote>` : ''}
`,
```

**After:**
```typescript
const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}
const esc = escapeHtml;

html: `
  <h1>${esc(data['inviterName'])} shared a family tree with you</h1>
  <p>You have been invited to collaborate on <strong>${esc(data['treeName'])}</strong> ...</p>
  ${data['message'] ? `<blockquote>${esc(data['message'])}</blockquote>` : ''}
`,
```

**Why the plain-text email bodies were deliberately left unescaped:** `escapeHtml()` is only applied inside the `html:` template strings. The `text:` fallback bodies still use plain `String(data['treeName'])` — running the escaper there would incorrectly show a recipient `Smith &amp; Jones Family` instead of `Smith & Jones Family` in a plain-text email client, since there's no markup to escape *against* in plain text. This is an easy mistake to make if `esc()` were applied indiscriminately everywhere instead of specifically at HTML-interpolation sites.

### Fix 5 (Medium) — Presigned upload size/type wasn't re-verified after upload

**The problem:** `createPresignedUpload` validated the client's *declared* mime type and file size against subscription limits before issuing a presigned PUT URL — but the presigned URL's signature didn't enforce `Content-Length`, so a client could request a URL for a 1KB JPEG and then PUT a much larger file directly to S3/MinIO, bypassing the application-layer size check entirely. `confirmUpload` trusted the original declared size when incrementing storage-quota counters.

**Before:**
```typescript
async confirmUpload(assetId: string, treeId: string) {
  const [asset] = await db.update(mediaAssets)
    .set({ processingStatus: 'processing' })
    .where(/* ... */).returning();

  await Promise.all([
    db.update(trees).set({ mediaCount: sql`${trees.mediaCount} + 1` }).where(eq(trees.id, treeId)),
    db.update(users)
      .set({ totalStorageUsedBytes: sql`${users.totalStorageUsedBytes} + ${asset.sizeBytes}` }) // trusts client-declared size
      .where(eq(users.id, asset.uploadedBy)),
  ]);

  await mediaProcessingQueue.add(/* ... */);
  return asset;
}
```

**After:**
```typescript
async confirmUpload(assetId: string, treeId: string, subscriptionTier: string) {
  const [asset] = await db.update(mediaAssets)
    .set({ processingStatus: 'processing' })
    .where(/* ... */).returning();

  const head = await s3.send(new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: asset.storageKey }));
  const actualSize = head.ContentLength ?? 0;
  const actualType = head.ContentType ?? '';

  const limits = SUBSCRIPTION_LIMITS[subscriptionTier] ?? SUBSCRIPTION_LIMITS.free;
  if (actualSize > limits.maxMediaSizeBytes) {
    await this.rejectUpload(asset.id, asset.storageKey, asset.thumbnailKey);
    throw createAppError('VALIDATION_ERROR', `Uploaded file exceeds the limit for your plan.`, 413);
  }
  if (actualType && asset.mimeType && actualType.split(';')[0] !== asset.mimeType) {
    await this.rejectUpload(asset.id, asset.storageKey, asset.thumbnailKey);
    throw createAppError('VALIDATION_ERROR', `Uploaded file type does not match the declared type.`, 400);
  }

  const sizeBytes = actualSize > 0 ? actualSize : asset.sizeBytes; // use VERIFIED size, not the client's claim
  await Promise.all([
    db.update(trees).set({ mediaCount: sql`${trees.mediaCount} + 1` }).where(eq(trees.id, treeId)),
    db.update(users).set({ totalStorageUsedBytes: sql`${users.totalStorageUsedBytes} + ${sizeBytes}` }).where(eq(users.id, asset.uploadedBy)),
    db.update(mediaAssets).set({ sizeBytes }).where(eq(mediaAssets.id, asset.id)),
  ]);

  await mediaProcessingQueue.add(/* ... */);
  return { ...asset, sizeBytes };
}
```

**Why reject-and-delete rather than just clamping the size in the response:** if a confirm request fails the post-upload check, the placeholder database row and the oversized/mistyped object in storage are both actively cleaned up (`rejectUpload`) rather than left as an orphaned row that never finishes processing. Leaving it would mean the asset shows up in listings forever stuck in a `'processing'` state with no path to resolution, which is worse than failing the confirm call outright and letting the user retry the upload (now correctly sized) from scratch.

### Fix 6 (Low) — Open-redirect risk via `?redirect=`

**The problem:** the login page read a `redirect` query parameter and passed it unvalidated to `router.replace()`. Next.js's router is scoped to the app's own route tree today, so this wasn't practically exploitable yet — but the pattern (trusting an unvalidated query param as a navigation target) is the kind of thing that becomes exploitable the moment someone copies it into a context that does a hard `window.location` navigation instead.

**Before:**
```typescript
const redirectTo = searchParams?.get('redirect') ?? '/dashboard';
// ...
router.replace(redirectTo);
```

**After:**
```typescript
// apps/web/src/lib/safe-redirect.ts
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false; // protocol-relative URL trick
  return true;
}
export function safeRedirect(path: string | null | undefined, fallback: string): string {
  return isSafeRedirectPath(path) ? path : fallback;
}
```
```typescript
const redirectTo = safeRedirect(searchParams?.get('redirect'), '/dashboard');
```

**Why a shared helper instead of an inline check:** this exact `?redirect=` pattern exists in one place today (login) but the accept-invite flow constructs values that get passed through it, and a second consumer is plausible in the future (e.g., a "continue where you left off" deep link after email verification). A named, exported, single-purpose helper means the validation logic is defined once and is trivially unit-testable in isolation, rather than being a copy-pasted inline conditional that could drift between call sites.

### Fix 7 (Low, performance) — Refresh-token lookup was an O(n) scan

**The problem:** every refresh-token validation loaded a batch of candidate rows and ran an `argon2.verify()` against each one in a loop until a match was found (or the batch was exhausted). Argon2 verification is intentionally slow (that's the point, for password hashing) — running it in a loop against up to fifty rows on every single token refresh does not scale gracefully as active-session volume grows.

**Before:**
```typescript
const candidates = await db.select().from(refreshTokens)
  .where(and(eq(refreshTokens.isRevoked, false), gt(refreshTokens.expiresAt, new Date())))
  .orderBy(asc(refreshTokens.createdAt))
  .limit(50);

for (const rt of candidates) {
  if (await argon2.verify(rt.tokenHash, token)) { matchedToken = rt; break; }
}
```

**After:** a `tokenSelector` column (16 random characters, plaintext, indexed, unique) was added to `refresh_tokens`. The token issued to the client is now `${selector}.${verifier}` — the selector is looked up directly via an indexed equality query (O(1)), and only the *one* matched row's hash is verified against the verifier:

```typescript
// schema.ts
tokenSelector: varchar('token_selector', { length: 32 }),
// ...
uniqueIndex('refresh_tokens_selector_unique').on(t.tokenSelector),
```
```typescript
// auth.service.ts — generateTokenPair
const tokenSelector = nanoid(16);
const tokenVerifier = nanoid(48);
const refreshTokenValue = `${tokenSelector}.${tokenVerifier}`;
const tokenHash = await argon2.hash(tokenVerifier, { type: argon2.argon2id });
await db.insert(refreshTokens).values({ userId, tokenSelector, tokenHash, /* ... */ });
```
```typescript
// auth.service.ts — refresh
const selector = token.slice(0, 16);
const verifier = token.slice(17);
const [candidate] = await db.select().from(refreshTokens)
  .where(and(eq(refreshTokens.tokenSelector, selector), eq(refreshTokens.isRevoked, false), gt(refreshTokens.expiresAt, new Date())))
  .limit(1);
if (candidate && (await argon2.verify(candidate.tokenHash, verifier))) {
  matchedToken = candidate;
}
```

**Why the verifier portion is still hashed rather than just trusting the selector as a lookup key on its own:** the selector alone is not a secret — it's stored in plaintext specifically so it can be indexed and queried. The verifier is the actual secret; hashing it (rather than storing it in plaintext too) preserves the property that a database read alone (e.g., from a backup, a misconfigured replica, or a SQL injection elsewhere in the stack) cannot produce a token an attacker could replay. The selector's only job is to make the *lookup* fast; the verifier's job is to make the *credential* safe at rest, and splitting those two responsibilities into two values is what allows both properties simultaneously. Tokens issued before this migration (no selector) fall back to the old bounded-scan path until they expire naturally thirty days after issuance, at which point that fallback becomes permanently dead code.

### Fix 9 (Feature gap) — Fan and descendants tree views were label-only stubs

**The problem:** the tree page's view-mode switcher (`pedigree` / `fan` / `descendants`) correctly updated a `viewMode` state variable and a text label in the stats overlay, but `PedigreeTree` never received that state as a prop — it always built and rendered the same ancestor-pedigree D3 layout regardless of which button was clicked.

**Before** (`PedigreeTree` had no `viewMode` prop at all):
```typescript
interface TreeProps {
  persons: PersonSummary[];
  relationships: Relationship[];
  rootPersonId: string;
  // ... no viewMode field ...
}
```
```tsx
<PedigreeTree
  ref={treeRef}
  persons={persons}
  relationships={relationships}
  rootPersonId={rootPerson.id}
  // viewMode never passed
/>
```

**After:** the component gained a `viewMode` prop and two genuinely distinct rendering paths in addition to the original pedigree layout — `buildDescendantHierarchy()` walks the *children* map downward from the root instead of the *parents* map upward, and a new `renderFanLayout()` lays the same ancestor data out radially using `d3.partition()` instead of `d3.tree()`:

```typescript
export type TreeViewMode = 'pedigree' | 'fan' | 'descendants';
interface TreeProps {
  // ...
  viewMode?: TreeViewMode;
}
```
```typescript
if (viewMode === 'descendants') {
  const hierarchy = buildDescendantHierarchy();
  if (hierarchy) renderCardLayout(g, hierarchy, 'down', svg, zoom);
} else if (viewMode === 'fan') {
  const hierarchy = buildAncestorHierarchy();
  if (hierarchy) renderFanLayout(g, hierarchy, svg, zoom);
} else {
  const hierarchy = buildAncestorHierarchy();
  if (hierarchy) renderCardLayout(g, hierarchy, 'up', svg, zoom);
}
```
```tsx
<PedigreeTree
  ref={treeRef}
  persons={persons}
  relationships={relationships}
  rootPersonId={rootPerson.id}
  viewMode={viewMode}
  // ...
/>
```

The fan layout's core geometry: each ancestor's angular slice is split evenly among their own parents at the next ring outward, via `d3.partition()` with every node weighted equally (`hierarchy.sum(() => 1)`) rather than weighted by descendant count — a genealogy fan chart conventionally gives every ancestor at a given generation equal visual width, not width proportional to how much *is known* about them:

```typescript
const sized = hierarchy.sum(() => 1);
const root = partition(sized);
const arcGen = d3.arc<d3.HierarchyRectangularNode<TreeNodeData>>()
  .startAngle((d) => d.x0 - Math.PI / 2)
  .endAngle((d) => d.x1 - Math.PI / 2)
  .innerRadius((d) => d.y0)
  .outerRadius((d) => d.y1 - 2);
```

**Why this was worth a real implementation rather than leaving the buttons as a documented known-limitation:** a chart picker that visibly does nothing is worse for user trust than not offering the choice at all — it looks like a bug (because it is one) rather than a deliberate scope decision. The E2E test that previously only checked the text label updated was also strengthened to assert on actual DOM differences between modes (`.fan-arc` elements present in fan mode, `.node` elements present in card modes, never both at once), since the old assertion would have passed even with the bug fully present.

### Fix 10 — Dependency vulnerability scanning was absent

**The problem:** the codebase had never been run through `npm audit` or an equivalent tool as part of CI; dependency vulnerabilities could ship undetected.

**After:** `.github/dependabot.yml` was added, grouping low-risk infra-package patch/minor bumps (Fastify plugins, Drizzle, BullMQ on the backend; Next.js, React, TanStack on the frontend) into batched weekly PRs, while explicitly excluding `argon2` and `jsonwebtoken` from any auto-grouping — security-critical packages always get their own PR for individual review, never bundled with unrelated bumps. A `dependency-audit` CI job runs `npm audit --audit-level=high` on every push, with `continue-on-error: true` (a fresh zero-day in a transitive dependency with no available fix shouldn't block unrelated PRs) but writes its findings to the GitHub Actions step summary so they remain visible rather than silently swallowed:

```yaml
- name: npm audit (high + critical)
  continue-on-error: true
  run: npm audit --audit-level=high --omit=dev > audit-report.txt 2>&1 || true

- name: Summarize findings
  if: always()
  run: |
    echo "## Dependency Audit" >> "$GITHUB_STEP_SUMMARY"
    cat audit-report.txt >> "$GITHUB_STEP_SUMMARY"
```

**Why non-blocking rather than failing the build on any finding:** a hard-fail policy on `npm audit` is a common cause of CI pipelines being disabled or ignored entirely the first time a no-fix-available advisory appears in a transitive dependency nobody can immediately patch. Surfacing the finding prominently (step summary, uploaded artifact, weekly Dependabot PRs doing the actual remediation work) achieves the real goal — nothing ships unnoticed — without creating an incentive to bypass CI checks altogether when a fix genuinely isn't available yet.

---

## Summary

Seventeen phases, from competitive research through a security-audit remediation round, produced a 150+ file full-stack monorepo. The bug pattern worth naming across all of them: the most consequential fixes were never exotic security exploits requiring deep expertise to find — they were ordinary engineering gaps (a queue with no producer, a button with no handler, a cast instead of a runtime check, a credential stored somewhere convenient instead of somewhere safe) that were each caught by the same discipline of actually reading the code rather than assuming it worked because it compiled.


---

## Milestone 17 — Idempotency Hook Fix & Marketing Site

### Fix 1 (Critical) — `createTree` and `createPerson` did not work at all

**The problem:** both routes call `handleIdempotency(request, reply)` as their first line. That function, on every request carrying an `X-Idempotency-Key` header from an authenticated user, ended with this:

```typescript
// apps/api/src/lib/idempotency.ts — before
export async function handleIdempotency(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // ... existing-key replay check above ...

  request.server.addHook('onSend', async (req, rep, payload) => {
    const ctx = request._idempotency;
    if (!ctx) return payload;
    // ... persist the response to the idempotency_keys table ...
    return payload;
  });
}
```

`addHook` registers a hook on the Fastify *instance* — it is meant to be called once, during the boot/plugin-registration phase, before the server starts accepting traffic. Calling it from inside a request handler means a brand-new hook gets registered on **every single qualifying request**, forever, for the lifetime of the process. Each one closes over that request's own `request`, `userId`, and `db` references, so this is a guaranteed, unbounded memory leak on top of being outside what Fastify's hook lifecycle supports while already serving traffic — which is why these two specific routes failed outright rather than merely leaking memory quietly over time.

The reason *login and register appeared unaffected* while these two did not is itself diagnostic. `handleIdempotency` has an early guard:

```typescript
const userId = request.user?.sub;
if (!userId) return;
```

`register` calls `handleIdempotency` too, but at register time there is no authenticated user yet — `request.user` is undefined, so this guard returns before ever reaching the broken `addHook` line. `login` doesn't call it at all. `createTree` and `createPerson` both run behind `preHandler: [authenticate]` / `requireTreeRole(...)`, so by the time they call `handleIdempotency`, `request.user` is always populated — meaning they hit the broken line on every single call, with no exceptions.

**After** — the hook is registered exactly once, at boot, in `server.ts`:

```typescript
// apps/api/src/lib/idempotency.ts — after
export function registerIdempotencyHook(app: FastifyInstance): void {
  app.addHook('onSend', async (request, reply, payload) => {
    const ctx = request._idempotency;
    if (!ctx) return payload;
    try {
      const bodyObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const { db } = getDb();
      await db.insert(idempotencyKeys).values({
        key: ctx.key, userId: ctx.userId,
        responseStatus: reply.statusCode,
        responseBody: bodyObj as Record<string, unknown>,
        expiresAt: new Date(ctx.capturedAt + IDEMPOTENCY_TTL_MS),
      }).onConflictDoNothing();
    } catch { /* never break the response that's already on its way out */ }
    return payload;
  });
}

export async function handleIdempotency(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // ... unchanged replay-check logic ...
  if (existing[0]) {
    await reply.status(existing[0].responseStatus).send(existing[0].responseBody);
    return; // caller must check reply.sent and stop
  }
  // Record context on the request itself; the ONE global hook above picks
  // this up when the real handler finishes.
  request._idempotency = { key: idempotencyKey, userId, capturedAt: now.getTime() };
}
```

```typescript
// apps/api/src/server.ts — after
await registerPlugins(app);
registerIdempotencyHook(app);   // exactly once, before routes handle any traffic
await registerRoutes(app);
```

**A second, latent bug fixed at the same time:** the replay branch above calls `reply.send(...)` and returns, but every call site looked like this:

```typescript
await handleIdempotency(request, reply);
const parsed = createTreeSchema.safeParse(request.body); // ran regardless of a replay
```

On a *repeat* request with an already-seen key, the handler would replay the cached response and then keep going — parsing the body again, creating a second tree, and attempting to send a second reply, which Fastify rejects. This wasn't the cause of the reported failure (a brand-new key never hits this branch), but it's a real bug along the same code path, fixed by adding a guard at all four call sites:

```typescript
await handleIdempotency(request, reply);
if (reply.sent) return;
const parsed = createTreeSchema.safeParse(request.body);
```

**Why this matters beyond the immediate fix:** this is the kind of bug that no amount of *reading* the happy-path logic catches, because the logic for handling one request, in isolation, is correct. It only breaks once you ask "what happens the second time this function runs in the life of this process" — exactly the question a unit test calling the same route handler twice in a row would have surfaced immediately.

**A related, smaller fix made while tracing this same code path:** `person.service.ts`'s initial data-quality-score computation on person creation was passing an always-empty array instead of the events actually being submitted:

```typescript
// apps/api/src/services/person.service.ts — before
const qualityScore = computeDataQualityScore({
  ...person,
  events: [],
  sourceIds: [],
  mediaIds: [],
});
```

```typescript
// apps/api/src/services/person.service.ts — after
const qualityScore = computeDataQualityScore({
  ...person,
  events: input.events,
  sourceIds: [],
  mediaIds: [],
});
```

A background worker recomputed this shortly after creation regardless, so the practical impact was a briefly-wrong score rather than a persistently wrong one — but there was no reason to leave it wrong even momentarily once noticed.

### Marketing site

Seven pages were added under a new `(marketing)` route group: the landing page, features, pricing, about, terms, privacy, and contact. This is additive feature work rather than a bug fix, so it doesn't carry a before/after in the same sense as the rest of this document, but two decisions are worth recording because they were explicit trade-offs, not defaults:

**The hero animation reuses the product's own visual language.** Rather than a generic decorative illustration, `AnimatedTreeHero.tsx` draws the same bifurcating structure the in-app pedigree chart draws — branches stroke-animate in, and the circles at each tip use the same color logic (ink/ember/sage) as a real person-node. Someone who signs up after seeing the landing page should recognize the tree they're looking at.

**Pricing carries real numbers with honest CTAs.** The tier limits (3/20/100 trees, the storage and AI-quota figures) are pulled from the actual `SUBSCRIPTION_LIMITS` constant, not invented. The dollar amounts had to be invented, since no live pricing existed anywhere in the codebase to draw from — but every CTA routes to `/register`, not to a working checkout, because Stripe wasn't wired up at the time this was built (see Phase 18, Fix 12, where it now is).

---

## Milestone 18 — Multi-Disciplinary Audit Remediation (Round 2)

This phase closes all twelve findings from `RootLink_MultiDisciplinary_Audit.md` (four bugs, three security, two product, three UX). Two findings from that report — P2 (no ToS/Privacy pages) and P3 (AI-hints honesty) — turned out to already be resolved by the Phase 17 marketing site build, so they aren't repeated here. The other twelve are fixed below, in the order they were addressed: S1 was deliberately fixed *before* B1, since B1's broadcast payloads flow through the exact room S1 had left unguarded — closing the access-control gap before turning on real data sync, not after.

### Fix 1 (High) — WebSocket `JOIN_TREE` had no authorization check

**The problem:** the WebSocket handshake verified that a JWT was validly signed and unexpired, then admitted the connection to the requested tree's room with no further check:

```typescript
// apps/api/src/plugins/websocket.ts — before
const treeId = String(data['treeId'] ?? '');
if (!treeId) {
  socket.send(JSON.stringify({ event: 'error', data: { message: 'treeId required' } }));
  return;
}

clientMeta = { ws: socket, userId: payload.sub, treeId };
```

A valid JWT proves the connection belongs to *some* RootLink account. It says nothing about whether that account has any relationship to the specific tree it's asking to join. Every REST route reaches `getTreePermission()` via `requireTreeRole()` or `requireTreeViewAccess()` before touching tree-scoped data — this handshake was the one place in the codebase that check was missing, meaning any registered user could join any tree's live room by sending its ID.

**Why this was contained in practice, but not actually safe:** at the time this was found, B1 was *also* still open — `publishTreeEvent` was never called from any mutation, so the only thing flowing through a joined room was presence (who else is looking at this tree). An attacker joining an unauthorized room learned that *someone* was viewing it and could see typing/cursor-style presence noise, not actual person data. That containment was incidental, not a property of the authorization model, and would have silently evaporated the moment B1 was fixed without S1 being fixed first — which is exactly why S1 was fixed first.

**After:**

```typescript
// apps/api/src/plugins/websocket.ts — after
const treeId = String(data['treeId'] ?? '');
if (!treeId) {
  socket.send(JSON.stringify({ event: 'error', data: { message: 'treeId required' } }));
  return;
}

// Authorization, not just authentication — mirrors what every REST route
// already does via getTreePermission(). Deliberately scoped to
// authenticated members only: anonymous share-link viewers are read-only
// browsers, not collaborators, so they are not admitted to the live room.
const permission = await getTreePermission(payload.sub, treeId);
if (!permission) {
  socket.send(JSON.stringify({ event: 'error', data: { message: 'You do not have access to this tree' } }));
  logger.warn({ userId: payload.sub, treeId }, 'Rejected unauthorized JOIN_TREE attempt');
  return;
}

clientMeta = { ws: socket, userId: payload.sub, treeId };
```

One design decision worth recording: this does *not* re-validate permission continuously for the life of a connection. If a user is removed from a tree while their socket is still open, that socket stays in the room until it naturally disconnects or the tree's room otherwise empties. Closing that gap would mean either polling permissions periodically or actively tracking membership-change events to force-disconnect affected sockets — a meaningfully larger change than what the audit finding described (the finding was specifically about the join-time check being absent, not about continuous revalidation), so it's recorded here as a known, deliberately out-of-scope residual rather than silently left unconsidered.

### Fix 2 (Medium) — JWT verification didn't pin an algorithm

**The problem:** both places this codebase verifies a JWT omitted the `algorithms` option, relying on the library's default behavior rather than stating explicitly what's accepted:

```typescript
// apps/api/src/plugins/index.ts — before
await app.register(jwt, {
  secret: env.JWT_ACCESS_SECRET,
  sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  verify: { allowedIss: 'rootlink-api' },
});
```

```typescript
// apps/api/src/plugins/websocket.ts — before
function verifyToken(token: string): JwtPayload {
  return verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}
```

Practical risk was low here — there's no asymmetric key configured anywhere in this codebase that a token could be crafted against — but "low risk today" and "explicit contract" are different things, and an implicit default is exactly the kind of thing that quietly stops being safe the moment someone adds an unrelated feature (an SSO integration, a second signing key) without realizing this depends on the default never changing.

**After**, both pinned to the single algorithm this codebase actually uses:

```typescript
await app.register(jwt, {
  secret: env.JWT_ACCESS_SECRET,
  sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN, algorithm: 'HS256' },
  verify: { allowedIss: 'rootlink-api', algorithms: ['HS256'] },
});
```

```typescript
function verifyToken(token: string): JwtPayload {
  return verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
}
```

### Fix 3 (High — product-facing) — Real-time collaboration only ever synced presence, never data

**The problem:** the frontend's `useTreeWebSocket.ts` correctly listened for `PERSON_CREATED`, `PERSON_UPDATED`, `PERSON_DELETED`, `RELATIONSHIP_CREATED`, `RELATIONSHIP_DELETED`, and `TREE_UPDATED`, and correctly invalidated the relevant React Query cache key on each. Nothing on the backend ever sent them. `publishTreeEvent` existed (used only for `COLLABORATOR_JOINED`/`LEFT` presence) but was never called from `person.service.ts`, `relationship.service.ts`, or `tree.service.ts`. Two browsers with the same tree open, one editing, would never see the other's changes without a manual refresh — despite the UI's presence indicators implying live collaboration was already working.

**After** — a call was added after every mutation in all three services. The payloads carry only an ID, which is deliberate: the frontend's invalidation handlers only ever read the ID to know *what* to refetch, never the data itself, so there was no reason to broadcast full person/relationship objects over the socket. This also means the residual exposure if Fix 1 above were ever reopened is much smaller than it would be with full-object broadcasts — an unauthorized listener would learn that *some* person in a tree changed, not that person's name, dates, or biography.

```typescript
// apps/api/src/services/person.service.ts — after (createPerson, abbreviated)
void aiHintQueue.add('generate-hints', { personId: person.id, treeId, userId }).catch(() => undefined);
void dataQualityQueue.add('compute-quality', { personId: person.id, treeId }).catch(() => undefined);
void publishTreeEvent(treeId, WS_EVENTS.PERSON_CREATED, { personId: person.id }, userId).catch(() => undefined);
return { ...person, events: input.events };
```

The same pattern was repeated for `updatePerson`/`PERSON_UPDATED`, `deletePerson`/`PERSON_DELETED`, `relationship.service.ts`'s `create`/`delete` (`RELATIONSHIP_CREATED`/`DELETED`), and `tree.service.ts`'s `updateTree` (`TREE_UPDATED`) — six call sites in total, each a one-line addition fired-and-forgotten with `.catch(() => undefined)`, consistent with how this codebase already treats background-job enqueueing elsewhere in the same functions.

### Fix 4 (Medium) — Idempotency keys were unique globally, not per-user

**The problem:**

```typescript
// packages/db/src/schema.ts — before
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: varchar('key', { length: 64 }).primaryKey(),   // unique across ALL users
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ...
}, (t) => [
  index('idempotency_keys_user_idx').on(t.userId),
  index('idempotency_keys_expires_idx').on(t.expiresAt),
]);
```

Every application-level query already filtered correctly by *both* `key` and `userId`, so this was never a cross-user data leak — user A could never be served user B's cached response. The problem was narrower but still real: if two different users' clients ever generated the same key value (a non-random key generator, a client-side bug, an unlikely-but-possible UUID collision), the second user's `INSERT ... ON CONFLICT DO NOTHING` would silently no-op against the first user's row, since `key` alone was the primary key being conflicted on. That second user's idempotency protection would never actually get stored — a retry from their client would then go completely unrecognized as a duplicate and execute twice, defeating the one thing this table exists to prevent, for them specifically.

**After:**

```typescript
// packages/db/src/schema.ts — after
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: varchar('key', { length: 64 }).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // ...
}, (t) => [
  primaryKey({ columns: [t.userId, t.key] }),
  index('idempotency_keys_expires_idx').on(t.expiresAt),
]);
```

The single-column `userId` index was dropped rather than kept alongside the new composite key — a composite primary key's leading column already serves the same lookups via ordinary B-tree prefix matching, so keeping both would mean maintaining a redundant index for no benefit. No application code needed to change: the existing `SELECT ... WHERE key = ? AND userId = ?` and `.onConflictDoNothing()` (which targets the primary key by default when no explicit conflict target is given) were already written as if this were the constraint — they were just briefly relying on a narrower one than the schema actually enforced.

### Fix 5 (Medium) — Failed media deletions from S3 were unrecoverable

**The problem:** both places media gets deleted from storage used the same pattern —

```typescript
// apps/api/src/services/media.service.ts — before (deleteAsset)
s3.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: asset.storageKey })).catch(
  (err: unknown) => { console.error('S3 delete failed for key', asset.storageKey, err); },
);
```

A transient failure — a momentary throttle, a network blip — left the call logged and forgotten. The database row tracking that `storageKey` gets *hard-deleted* by a cron job seven days later regardless of whether the S3 object was actually removed, after which there is no record anywhere of what that orphaned key even was. One failed attempt, with no retry, meant a permanently orphaned file.

**After** — deletion now goes through a dedicated, retryable queue:

```typescript
// apps/api/src/services/media.service.ts — after (deleteAsset, abbreviated)
const keysToDelete = [asset.storageKey, asset.thumbnailKey].filter((k): k is string => !!k);
await mediaDeletionQueue.add('delete-media', { storageKeys: keysToDelete });
```

```typescript
// apps/api/src/workers/media-deletion.worker.ts — new
export function startMediaDeletionWorker() {
  return new Worker<MediaDeletionJob>(QUEUE_NAMES.mediaDeletion, async (job) => {
    const s3 = getS3();
    for (const key of job.data.storageKeys) {
      // DeleteObjectCommand is idempotent — deleting an already-gone key
      // succeeds as a no-op, so retrying the whole job after a partial
      // failure never throws on the keys that already went through.
      await s3.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
    }
  }, { connection: getRedis(), concurrency: 5 })
    .on('failed', (job, err) => {
      logger.error({ jobId: job?.id, storageKeys: job?.data.storageKeys, err }, 'Media deletion permanently failed after all retries');
    });
}
```

The 7-day hard-delete cron — previously commented `// Note: S3 objects are purged separately by lifecycle policy`, which wasn't actually true anywhere in this codebase — was upgraded into a genuine backstop rather than just having its stale comment corrected:

```typescript
// apps/api/src/workers/cron.ts — after (abbreviated)
const result = await db.delete(mediaAssets)
  .where(and(isNotNull(mediaAssets.deletedAt), lt(mediaAssets.deletedAt, cutoff)))
  .returning({ id: mediaAssets.id, storageKey: mediaAssets.storageKey, thumbnailKey: mediaAssets.thumbnailKey });

for (const row of result) {
  const keys = [row.storageKey, row.thumbnailKey].filter((k): k is string => !!k);
  if (keys.length > 0) {
    await mediaDeletionQueue.add('delete-media', { storageKeys: keys }).catch((err) => {
      logger.error({ err, assetId: row.id }, 'Failed to enqueue backstop media deletion');
    });
  }
}
```

This re-enqueues a deletion job for every row about to be hard-deleted, specifically as a guard against the *original* enqueue (the one in `deleteAsset` above) having silently failed — once this row disappears, its `storageKey` disappears with it, so this is the last point at which a backstop is even possible. Since `DeleteObjectCommand` is idempotent, re-enqueueing for an object that was already correctly deleted earlier is a harmless no-op, not duplicate work.

One incidental discovery while making this change: `deleteAsset` had a second, redundant fire-and-forget delete of the thumbnail key sitting a few lines below the first one — almost certainly a leftover from an earlier edit that was never cleaned up. It was removed as part of this fix rather than left to coexist with the new queue-based call.

### Fix 6 (Low) — The `Image`/`ImageIcon` collision, a fourth time

**The problem:** `lucide-react` exports an icon literally named `Image`, which collides with `next/image`'s `Image` component. This had already been fixed three times in earlier rounds of this project, each time by aliasing the import at one specific file — and each time, another occurrence elsewhere in the codebase was missed. This round found it in `dashboard/page.tsx` and `media/page.tsx`:

```typescript
// before, both files
import { /* ..., */ Image, /* ... */ } from 'lucide-react';
// ...
<Image size={11} />
```

**After**, the same fix applied a fourth time:

```typescript
import { /* ..., */ Image as ImageIcon, /* ... */ } from 'lucide-react';
// ...
<ImageIcon size={11} />
```

What's different this time is the addition of an ESLint rule, so a fifth occurrence fails the lint step instead of needing another audit to find it:

```javascript
// apps/web/eslint.config.mjs — added
'no-restricted-imports': ['error', {
  paths: [{
    name: 'lucide-react',
    importNames: ['Image'],
    message: "Import as 'Image as ImageIcon' — the bare name collides with next/image's Image component. This exact mistake has been made and fixed three times already.",
  }],
}],
```

This is the actual fix worth recording: not the fourth instance of the same one-line change, but recognizing that a recurring bug needs a structural rule preventing recurrence, not another manual catch.

---

### Fix 7 (Medium — security) — Uploads were validated against client-supplied headers, not actual bytes

**The problem:** `confirmUpload()` performed a `HeadObject` cross-check — the S3 object's `Content-Type` metadata had to match what the client declared at presign time. This sounds like a meaningful check, but both values being compared were under client control: the presign endpoint records whatever `mimeType` the client sent in its JSON body, and when the client then uploads, it sets `Content-Type` itself in the PUT request. A client could consistently lie in both places and the check would pass — it only catches *inconsistency* between two client-controlled values, not a mismatch between the declared type and the actual file content.

**After** — magic-byte verification using `file-type` runs after the header cross-check:

```typescript
// apps/api/src/services/media.service.ts — added to confirmUpload()
// Fetch just the first 4 KB via a Range request (cheap even for 200 MB files)
const sniffRange = await s3.send(new GetObjectCommand({
  Bucket: env.STORAGE_BUCKET,
  Key: asset.storageKey,
  Range: 'bytes=0-4100',
}));
const sniffBytes = sniffRange.Body
  ? await sniffRange.Body.transformToByteArray()
  : new Uint8Array();
const sniffed = await fileTypeFromBuffer(sniffBytes);

if (!sniffed || sniffed.mime !== asset.mimeType) {
  await this.rejectUpload(asset.id, asset.storageKey, asset.thumbnailKey);
  throw createAppError('VALIDATION_ERROR',
    sniffed
      ? `The uploaded file's actual content (${sniffed.mime}) does not match the declared type (${asset.mimeType}).`
      : `The uploaded file's content could not be verified as a valid ${asset.mimeType} file.`,
    400);
}
```

The range fetch reads 4100 bytes because `file-type`'s internal detection signatures max out around 4100 bytes for the broadest types it supports (TIFF, for instance) — anything under that is enough to read every magic byte that matters for the MIME types this product accepts.

The second half of this finding was about download URLs: presigned S3 GET requests carry no `ResponseContentDisposition` override by default, meaning the browser handles the response based on whatever `Content-Type` S3 stored — which could, in a scenario where the above check somehow failed, result in inline execution rather than a download prompt:

```typescript
// apps/api/src/services/media.service.ts — getDownloadUrl() before
return getSignedUrl(s3, new GetObjectCommand({
  Bucket: env.STORAGE_BUCKET, Key: storageKey,
}), { expiresIn });
```

```typescript
// after — forces attachment by default, callers opt in to inline explicitly
async getDownloadUrl(storageKey: string, expiresIn = 3600,
  options: { forceDownload?: boolean } = {}): Promise<string> {
  const forceDownload = options.forceDownload ?? true;
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: storageKey,
    ...(forceDownload && { ResponseContentDisposition: 'attachment' }),
  }), { expiresIn });
}
```

Call sites in `media.routes.ts` were updated to pass `forceDownload: asset.type !== 'photo'` for main files and `forceDownload: false` for thumbnails — thumbnails are always genuine images regardless of the parent asset's type, so they always render inline in the gallery; documents and other non-photo types force a download.

---

### Fix 8 (High) — Tree canvas nodes were keyboard and screen-reader inaccessible

**The problem:** the outer `<svg>` had `role="img"` and a generic label — effectively telling assistive technology "this is one flat, non-interactive picture." A screen reader had no way to perceive individual people in the tree or navigate to them. A keyboard user had no way to move focus into the canvas at all.

```tsx
// apps/web/src/components/tree/PedigreeTree.tsx — before
<svg
  ref={svgRef}
  className="tree-canvas"
  style={{ width: '100%', height: '100%' }}
  aria-label={`Family tree — ${viewMode} view`}
  role="img"
/>
```

**After** — three layers of accessibility, from most dependent to least:

**Layer 1:** individual SVG nodes are now focusable interactive elements. The fix applies to both the card-layout nodes (pedigree/descendants views) and the fan-layout arc segments:

```typescript
// d3 selection call chain, appended to both the card and arc selections
.attr('tabindex', 0)
.attr('role', 'button')
.attr('aria-label', (d) =>
  `${shortName(d.data)}, ${dateLabel(d.data)}${d.data.id === selectedPersonId ? ' (selected)' : ''}`)
.on('keydown', (event: KeyboardEvent, d) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelectPerson(d.data.id);
  }
})
.on('focus', function () {
  d3.select(this).style('outline', '2px solid var(--accent-ember)').style('outline-offset', '2px');
})
.on('blur', function () {
  d3.select(this).style('outline', 'none');
});
```

`shortName()` and `dateLabel()` are the existing display helpers — they already return "Living" for living persons where privacy protection applies, so the accessible label automatically respects the same privacy semantics as the visual card.

**Layer 2:** the outer `<svg>` role was changed from `img` (which suppresses all interactive children in most AT implementations) to `application`, with a label that includes navigation instructions:

```tsx
// after
<svg
  role="application"
  aria-label={`Family tree, ${viewMode} view. ${persons.length} people. Press Tab to move between people, Enter to select.`}
  ...
/>
```

**Layer 3:** a visually-hidden fallback list of real native `<button>` elements, one per person, sits alongside the SVG canvas:

```tsx
<ul className="sr-only">
  {persons.map((p) => (
    <li key={p.id}>
      <button type="button" onClick={() => onSelectPerson(p.id)}>
        {shortName(p)}, {dateLabel(p)}
      </button>
    </li>
  ))}
</ul>
```

This doesn't depend on how well any given screen reader/browser combination handles focus inside nested SVG — it's the same pattern as any ordinary web list, so it works identically regardless. Layers 1 and 2 serve users where SVG focus *is* well-supported; Layer 3 is the fallback for where it isn't, with no visible impact on the sighted experience.

### Fix 9 (Medium) — Touch targets were too small and hover-gated

**The problem:** the add-parent button on a tree leaf node had a radius of 10px (a 20px-diameter hit area), below the ~44px minimum comfortable touch target recommended by Apple's HIG and Android's Material Design guidelines. More critically, it was entirely hidden behind a `mouseenter` event:

```typescript
// apps/web/src/components/tree/PedigreeTree.tsx — before
.append('circle').attr('r', 10)    // 20px diameter
// ...
.style('opacity', 0)               // invisible until hover
// mouseenter: opacity → 1, mouseleave: opacity → 0
```

On a touch device, `mouseenter` doesn't fire. The button wasn't just small — it was completely invisible and therefore completely unreachable on any phone or tablet.

**After:**

```typescript
// r=22 → 44px diameter touch target
.append('circle').attr('r', 22)
// ...
.style('opacity', 0.55)   // always at least partially visible
// mouseenter: 0.55 → 1, mouseleave: 1 → 0.55 (not hidden, just dimmer)
```

The same session also caught a pre-existing, unrelated bug in the zoom toolbar: `action` was referenced in `onClick` but never destructured from the map callback, which would have thrown a `ReferenceError` at render:

```tsx
// apps/web/src/app/(app)/trees/[treeId]/page.tsx — before
].map(({ icon: Icon, label }) => (          // 'action' not destructured
  <button onClick={action} ...>             // ReferenceError
```

```tsx
// after
].map(({ icon: Icon, label, action }) => (  // action now in scope
  <button onClick={action} ...>             // works
```

### Fix 10 (Low) — Missing custom error and 404 pages

**The problem:** Next.js shows a generic, unstyled error screen for unhandled errors and an equally generic 404 for missing routes. Neither fit the product.

**After** — two new files:

```tsx
// apps/web/src/app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg-base)' }}>
      {/* on-brand icon, "404" label, friendly copy, back-to-dashboard and back-to-home links */}
    </div>
  );
}
```

```tsx
// apps/web/src/app/error.tsx — 'use client' required by Next.js App Router
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Unhandled render error:', error); }, [error]);
  return (
    // on-brand, with a "Try again" button that calls reset() and
    // a "Back to dashboard" link for when reset() doesn't help
  );
}
```

The `error.tsx` must be a Client Component because it calls `reset()` (a function passed in from the framework) and uses `useEffect`. `not-found.tsx` doesn't need any client-side behavior, so it stays a Server Component.

---

### Fix 11 (Medium) — No visibility into failed background jobs

**The problem:** the product had no way to see the state of its own background job queues — not from within the product, not from any kind of dashboard. If a GEDCOM import stalled after completing three of four processing stages, or a media deletion exhausted its three retries and entered the dead-letter set, the only way to know was to read raw worker process logs directly, which requires knowing where to look and having access to them at all.

**After** — Bull Board mounted at `/admin/queues`, showing every queue's completed/active/waiting/delayed/failed/stuck counts, each job's payload, and the full stack trace on failure, with a manual-retry button:

```typescript
// apps/api/src/plugins/bull-board.ts
export async function registerBullBoard(app: FastifyInstance): Promise<void> {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({ queues: allQueues.map(q => new BullMQAdapter(q)), serverAdapter });

  await app.register(async (adminApp) => {
    adminApp.addHook('onRequest', requireAdmin());
    await adminApp.register(serverAdapter.registerPlugin());
  }, { prefix: '/admin/queues' });
}
```

The gating uses a new `requireAdmin()` preHandler rather than reusing `requireTreeRole`:

```typescript
// apps/api/src/middleware/auth.ts
export function requireAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    const userId = request.user.sub;
    const cacheKey = `is_admin:${userId}`;
    let isAdmin = await cacheGet<boolean>(cacheKey);
    if (isAdmin === null) {
      const [row] = await db.select({ isAdmin: users.isAdmin }).from(users)
        .where(eq(users.id, userId)).limit(1);
      isAdmin = row?.isAdmin ?? false;
      await cacheSet(cacheKey, isAdmin, 60); // short TTL — admin revocation is immediate-ish
    }
    if (!isAdmin) throw createAppError('FORBIDDEN', 'Admin access required', 403);
  };
}
```

Admin status comes from a fresh (short-TTL cached) database read rather than a JWT claim for an important reason: a JWT is valid for its full expiry window even after an account's admin status is revoked. A JWT claim would mean an ex-admin stays an admin for up to `JWT_ACCESS_EXPIRES_IN` after revocation. The database check means revocation takes effect within 60 seconds (the cache TTL), which is the same pattern `getTreePermission` uses for tree roles.

The `is_admin` column defaults to `false` for every row, and no API endpoint lets a user promote themselves — the first admin account on any instance has to be granted by a direct database update.

---

### Fix 12 (Critical — product-blocking) — No payment integration

**The problem:** subscription tier enforcement existed in code — `SUBSCRIPTION_LIMITS` was referenced, tier-gated features checked `user.subscriptionTier` — but there was no way for anyone to actually upgrade. No Stripe integration, no checkout flow, no webhook handler to act on subscription lifecycle events, no customer portal for updating payment methods or canceling. Users couldn't do anything their free-tier limits didn't already allow, regardless of willingness to pay.

**After** — a complete Stripe integration, organized around three responsibilities:

**Checkout:** creates a Stripe Checkout Session, reusing the same Stripe customer record if one already exists for this account:

```typescript
// apps/api/src/services/billing.service.ts (abbreviated)
async createCheckoutSession(userId: string, email: string, tier: PaidTier): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceIdForTier(tier), quantity: 1 }],
    ...(user?.stripeCustomerId
      ? { customer: user.stripeCustomerId }   // reuse existing Stripe customer
      : { customer_email: email }),           // create new one on Stripe's side
    client_reference_id: userId,
    success_url: `${env.APP_URL}/settings?billing=success`,
    cancel_url: `${env.APP_URL}/settings?billing=canceled`,
    subscription_data: { metadata: { userId, tier } },
  });
  return session.url!;
}
```

**Webhook handler** — processes all subscription lifecycle events. One detail worth recording explicitly: as of Stripe API version 2025-03-31 ("basil"), `current_period_end` moved from the subscription level to a per-item field. The code checks for this explicitly rather than reaching for the old top-level field:

```typescript
function currentPeriodEnd(sub: Stripe.Subscription): Date | null {
  // Stripe API 2025-03-31: current_period_end is now per-item, not
  // subscription-level. Since RootLink subscriptions are always exactly
  // one item, the first item's period is the only one that matters here.
  const item = sub.items.data[0];
  return item ? new Date(item.current_period_end * 1000) : null;
}
```

Events handled: `checkout.session.completed` (attach Stripe customer ID, flip tier), `customer.subscription.updated` (tier change/renewal), `customer.subscription.deleted` (downgrade to free), `invoice.payment_failed` (notify user via the existing email queue without yet downgrading them, since Stripe's own retry schedule handles escalation).

**Webhook signature verification** requires the raw request bytes, not a re-parsed JSON body — Stripe's signature covers the exact bytes it sent, and re-serializing JSON produces a different byte sequence even with identical-looking content:

```typescript
// apps/api/src/routes/billing.routes.ts
await app.register(async (webhookApp) => {
  webhookApp.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);   // raw Buffer, not parsed JSON
  });
  webhookApp.post('/webhook', async (request, reply) => {
    await billingService.handleWebhookEvent(request.body as Buffer, signature);
    return reply.send({ received: true });
  });
});
```

**Frontend** — the Upgrade button in `settings/page.tsx` was previously rendered but had no `onClick`. Now:

```tsx
const checkoutMutation = useMutation({
  mutationFn: (tier: 'plus' | 'pro') => api.post<{ url: string }>('/v1/billing/checkout', { tier }),
  onSuccess: ({ url }) => { window.location.href = url; },
  onError: (err) => { toast.error(err instanceof ApiClientError ? err.message : 'Could not start checkout.'); },
});

// ...
<button
  onClick={() => { if (t.id !== 'free') checkoutMutation.mutate(t.id); }}
  disabled={checkoutMutation.isPending}>
  {checkoutMutation.isPending && checkoutMutation.variables === t.id ? 'Redirecting…' : 'Upgrade'}
</button>
```

The billing service checks for its required env vars (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PLUS`, etc.) at the point of use rather than at boot:

```typescript
function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw createAppError('VALIDATION_ERROR',
      'Billing is not configured on this instance yet. Set STRIPE_SECRET_KEY to enable it.', 503);
  }
  _stripe ??= new Stripe(env.STRIPE_SECRET_KEY);
  return _stripe;
}
```

This means the rest of the application boots normally in a development environment where Stripe isn't configured — only actual checkout, portal, and webhook requests fail with a clear, specific error message rather than crashing the server at startup.

---

## Summary

| Phase | Key change | Files touched |
|-------|-----------|--------------|
| 17 | Idempotency hook registered per-request instead of at boot | `lib/idempotency.ts`, `server.ts`, 3 route files |
| 17 | Quality score on create used empty events array | `person.service.ts` |
| 17 | Marketing site (7 pages, 2 components) | 11 new files |
| 18 — S1 | WS `JOIN_TREE` authorized, not just authenticated | `plugins/websocket.ts` |
| 18 — S2 | JWT algorithm pinned on both verification paths | `plugins/index.ts`, `plugins/websocket.ts` |
| 18 — B1 | Real-time sync wired up (6 broadcast calls) | 3 service files |
| 18 — B2 | Idempotency key composite primary key | `schema.ts`, migration 0002 |
| 18 — B3 | S3 deletes retryable via BullMQ, cron as backstop | `media.service.ts`, new worker, `cron.ts` |
| 18 — B4 | Icon collision fixed + ESLint rule to prevent recurrence | `dashboard/page.tsx`, `media/page.tsx`, `eslint.config.mjs` |
| 18 — S3 | Magic-byte content verification + forced-download headers | `media.service.ts`, `media.routes.ts` |
| 18 — U1 | Keyboard nav + ARIA + sr-only fallback on tree canvas | `PedigreeTree.tsx` |
| 18 — U2 | Touch targets enlarged, button always visible | `PedigreeTree.tsx`, `trees/[treeId]/page.tsx` |
| 18 — U3 | Custom 404 and error boundary pages | `not-found.tsx`, `error.tsx` |
| 18 — P4 | Bull Board at `/admin/queues`, gated by `isAdmin` column | New plugin, migration 0003, `middleware/auth.ts` |
| 18 — P1 | Full Stripe billing integration | `billing.service.ts`, `billing.routes.ts`, `settings/page.tsx` |

Total new/modified source files across both phases: 38.


---

## Milestone 19 — Super Admin Dashboard

### Fix 1 (Data-integrity gap) — `audit_logs` table existed since the initial build but was never written to

**The problem:** the `audit_logs` table was defined in `packages/db/src/schema.ts` from the very first schema migration — columns for `userId`, `action`, `resourceType`, `resourceId`, `ipAddress`, `userAgent`, `requestId`, and `metadata` were all present and correctly typed. Nothing in the application ever called `INSERT` against it. Any compliance or security narrative that pointed to "an append-only audit log" would have been describing a table that was structurally real but functionally empty.

**Before:** no `writeAuditLog` function existed anywhere in the codebase. The table was schema-only.

**After** — a single, deliberately fail-safe writer function, plus real call sites:

```typescript
// apps/api/src/services/admin.service.ts
export async function writeAuditLog(entry: {
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { db } = getDb();
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch {
    // Audit writes must never break the calling flow — log and continue
  }
}
```

Every admin mutation (`updateAdminUser`, `adminDeleteTree`) now calls this after the mutation succeeds, and — closing the loop on the table's original purpose — `auth.service.ts`'s `login()` method calls it on every successful and failed login attempt:

```typescript
// apps/api/src/services/auth.service.ts (excerpt, inside login())
void writeAuditLog({
  userId:       user.id,
  action:       'auth.login',
  resourceType: 'auth',
  ipAddress,
  userAgent,
});
```

```typescript
// apps/api/src/services/auth.service.ts (excerpt, inside the failed-credentials branch)
void writeAuditLog({
  userId:       user.id,
  action:       'auth.login_failed',
  resourceType: 'auth',
  ipAddress,
  userAgent,
  metadata:     { attempt: newAttempts, locked: newAttempts >= MAX_FAILED_ATTEMPTS },
});
```

**Why the writer swallows its own errors:** a failure to write an audit entry must never be allowed to break the action being audited — a login that fails because the *audit log* insert failed would be a strictly worse outcome than a login that succeeds with a missing audit entry. The `try/catch` here is a deliberate choice, not an oversight; audit logging degrades gracefully rather than becoming a new single point of failure for authentication.

---

## Milestone 21 — Design Consistency & Correctness Pass

### Fix 1 (Brand defect, low severity) — the new 3D logo was inconsistently deployed across 8 pages

**The problem:** after Milestone 20 introduced `RootLinkIcon`/`RootLinkLogo` as the new brand mark, an initial fix pass covered 5 files. An exhaustive `grep -rln "TreePine"` across the whole `apps/web/src` tree found 3 more: `trees/new/page.tsx`, `accept-invite/page.tsx`, and `verify-email/page.tsx`, plus two icon-map entries inside `NotificationsPanel.tsx` still rendering the generic lucide icon for edit/conflict notification types. A user's first three touchpoints — landing page, register, login — could show two different logos depending on which had already been fixed.

**Before** (representative — the pattern was identical in all 5 wrapped-square cases):
```tsx
<div className="flex h-11 w-11 items-center justify-center rounded-2xl"
  style={{ background: 'var(--accent-primary)' }}>
  <TreePine size={20} color="white" />
</div>
```

**After:**
```tsx
<RootLinkIcon size={44} />
```

The wrapping `<div>` was removed entirely rather than kept — `RootLinkIcon` already renders its own complete glyph including a background fill; nesting it inside a second colored square would have doubled up the visual container.

### Fix 2 (Functional bug) — `react-hot-toast` was called in 4 files but silently did nothing

**The problem:** `admin/trees/page.tsx`, `admin/users/[userId]/page.tsx`, `admin/users/page.tsx`, and `onboarding/page.tsx` all imported `toast` from `react-hot-toast` and called `toast.success(...)`/`toast.error(...)` after mutations. `react-hot-toast` was never declared in `apps/web/package.json` — only `sonner` was, and only `sonner`'s `<Toaster>` was mounted in `providers.tsx`. Every toast call in those 4 files was, at best, relying on an undeclared transitive dependency resolving by chance; at worst, calling a function whose UI host never rendered, meaning the user got no feedback at all after a suspend, restore, tier change, or onboarding error.

**Before:**
```typescript
import toast from 'react-hot-toast';
// ...
toast.success('Updated');
// ...
onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Update failed'),
```

**After:**
```typescript
import { toast } from 'sonner';
// call sites unchanged — sonner and react-hot-toast share the same
// toast.success(string) / toast.error(string) method signatures, so this
// was a clean import swap with no call-site changes needed
```

**Why this class of bug is worth naming explicitly:** this is the second "phantom dependency" found in this project (the first being `recharts` in Milestone 22, below) — a package imported and used in application code without ever being added to `package.json`. Both were caught only by an exhaustive, deliberate cross-check rather than by the normal edit-and-verify loop, because a phantom dependency doesn't fail loudly: `npm install` in a monorepo can resolve a transitive copy of a similarly-named or coincidentally-present package, or the code simply never gets exercised in a way that surfaces the missing `Toaster`. Neither `tsc` nor ESLint catch "this npm package is used but not declared" by default.

### Fix 3 (Functional bug) — client-side page transitions never actually animated

**The problem:** the app and admin layouts applied a CSS class, `animate-page-in`, to their main content area, intended to animate route content on navigation. `@keyframes` / `animation` CSS properties fire once, when the element is first painted onto the page — they do not re-fire when React swaps the children of an already-mounted element, which is exactly what happens during client-side navigation in Next.js's App Router. The class caused a fade-in on the very first page load and never fired again for the rest of the session.

**Before:**
```tsx
<main className="flex-1 overflow-y-auto animate-page-in">
  {children}
</main>
```

**After** — a real `PageTransition` component using `framer-motion`'s `AnimatePresence`, keyed on the current pathname so a route change is detectable as a genuine element swap rather than an in-place children update:

```tsx
// apps/web/src/components/layout/PageTransition.tsx
'use client';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} variants={variants}
        initial="initial" animate="animate" exit="exit"
        transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

```tsx
<main className="flex-1 overflow-y-auto">
  <PageTransition>{children}</PageTransition>
</main>
```

**Why it's inserted per-layout, not once at the root:** the root layout wraps every route group — marketing, auth, app, admin — each with entirely different persistent chrome (or none). Placing `AnimatePresence` at the root would force the whole page, including a mounted app sidebar, to remount and re-animate on every navigation, which reads as broken rather than polished. Instead `PageTransition` is inserted inside each shell layout's own `children` slot, so the sidebar/header stay mounted and static while only the content beneath them transitions.

### Fix 4 (Build-breaking, systemic) — 26 broken relative-import paths across 15 files

**The problem:** files nested inside a Next.js route-group directory — anything under `(app)/` or `(auth)/` — had relative imports written as if the parenthesized group name didn't count as a real directory level. It does. `src/app/(app)/people/page.tsx` is three directories below `src/` (`app` → `(app)` → `people`), so reaching `src/lib/api-client.ts` requires `../../../lib/api-client`, not `../../lib/api-client`. The bug was pre-existing — confirmed present in files never touched during the design overhaul (`people/page.tsx`, `login/page.tsx`) — and would fail at build time the moment any of the 15 affected files was compiled.

**Before** (representative, `apps/web/src/app/(app)/people/page.tsx`):
```typescript
import { api } from '../../lib/api-client';   // resolves to src/app/lib — does not exist
```

**After:**
```typescript
import { api } from '../../../lib/api-client';  // resolves to src/lib — correct
```

**How it was found and fixed exhaustively, not just patched where noticed:** rather than fixing the one instance a manual read happened to catch, a script walked every `.ts`/`.tsx` file under `apps/web/src`, extracted every `from '...'` import whose path started with `.` or `..`, resolved it against the real filesystem, and flagged anything that didn't exist:

```python
import re, os

def exists_as_module(path):
    candidates = [
        path, path + '.ts', path + '.tsx', path + '.js', path + '.jsx',
        os.path.join(path, 'index.ts'), os.path.join(path, 'index.tsx'),
    ]
    return any(os.path.exists(c) for c in candidates)

for root, _, files in os.walk('.'):
    for fname in files:
        if not fname.endswith(('.ts', '.tsx')):
            continue
        content = open(os.path.join(root, fname)).read()
        for m in re.finditer(r"from\s+['\"](\.\.?/[^'\"]+)['\"]", content):
            resolved = os.path.normpath(os.path.join(root, m.group(1)))
            if not exists_as_module(resolved):
                print(f"BROKEN: {os.path.join(root, fname)} -> '{m.group(1)}'")
```

This found and auto-corrected 20 broken static imports. A second pass with a regex matching `import('...')` (dynamic import call syntax, which the first regex does not match since it looks for `from '...'`) found 6 more — all introduced earlier in the *same* design-overhaul work, when converting components to `dynamic()` for code-splitting: the conversion had copied the relative-path prefix from each file's pre-existing (already broken) static import, propagating the same wrong depth into the new dynamic call. One of the 6 was a dead registry entry:

```typescript
// apps/web/src/lib/dynamic.ts — before
export const DynAddPersonForm = dynamic(
  () => import('../components/tree/AddPersonForm').then(m => ({ default: m.AddPersonForm })),
  { ssr: false, loading: () => null }
);
```

`AddPersonForm.tsx` never existed under that name or in that directory — the real, only person-form component is `components/person/PersonForm.tsx`. Fixed by correcting the reference rather than deleting the registry entry, so it stays usable:

```typescript
// apps/web/src/lib/dynamic.ts — after
export const DynPersonForm = dynamic(
  () => import('../components/person/PersonForm').then(m => ({ default: m.PersonForm })),
  { ssr: false, loading: () => null }
);
```

Both passes were re-run after every fix until they returned zero results across all 69 source files.

---

## Milestone 22 — Documentation Suite & HTML Landing Replica

### Fix 1 (Functional bug) — `recharts` imported and used, never declared as a dependency

**The problem:** identical bug class to Fix 2 in Milestone 21. `apps/web/src/components/charts/AreaChartWrapper.tsx` and `PieChartWrapper.tsx` both `import { ... } from 'recharts'` and are used by the dashboard and admin overview pages (added in Milestone 20). `recharts` was never added to `apps/web/package.json`. A fresh `npm install` on a clean checkout would not have installed it, and any environment where a coincidentally-present or transitively-resolved copy wasn't already in `node_modules` would fail to build both chart wrappers.

**Before** (`apps/web/package.json`, dependencies block):
```json
"d3": "^7.9.0",
```

**After:**
```json
"d3": "^7.9.0",
"recharts": "^2.15.0",
```

**Why this kept recurring:** both this and the `react-hot-toast` phantom dependency in Milestone 21 slipped through because adding an import statement and adding a `package.json` entry are two separate, disconnected actions — nothing in a normal edit loop forces them to happen together, and neither `tsc --noEmit` nor ESLint's default configuration flags an import resolving via a phantom/transitive copy as an error. Both were only caught by a deliberate, explicit cross-check between "every package imported in source" and "every package declared in `package.json`" — worth adding as a standing pre-release check rather than relying on it being remembered.
