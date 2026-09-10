import { randomBytes } from 'node:crypto';
import { getDb, connectedAccounts, persons } from '@rootlink/db';
import { eq, and, isNull } from 'drizzle-orm';
import { env } from '../config/env.js';
import { createAppError } from '../lib/errors.js';
import { encryptToken, decryptToken } from '../lib/crypto.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

// ─── Host selection ─────────────────────────────────────────────────────────
//
// FamilySearch has three tiers, not one: Sandbox ("Integration" — every
// registered app key is enabled for this automatically), Beta (an old
// snapshot of production data, requires a special request), and Production
// (requires passing the Compatible Solution Program review). A developer
// key is scoped to whichever tier(s) FamilySearch has actually enabled it
// for — env.FAMILYSEARCH_ENV must match what the registered app key can
// actually reach, or every call here will fail auth.
//
// CONFIRMED from FamilySearch's own docs/SDKs: the identity/OAuth host
// (ident.familysearch.org) and its authorization/token paths
// (/cis-web/oauth2/v3/authorization, /cis-web/oauth2/v3/token).
// BEST-EFFORT, NOT independently verified against a live sandbox account:
// the exact per-tier API base hostnames below. FamilySearch's own SDKs and
// community tooling have used "sandbox.familysearch.org" for the
// Integration/Sandbox tier; production is "api.familysearch.org". Confirm
// both against the actual registered developer app before relying on this
// in anything beyond local testing.
const IDENTITY_HOST = 'https://ident.familysearch.org';
const API_HOSTS: Record<typeof env.FAMILYSEARCH_ENV, string> = {
  sandbox: 'https://sandbox.familysearch.org',
  beta: 'https://beta.familysearch.org',
  production: 'https://api.familysearch.org',
};

function requireConfigured(): { clientId: string; clientSecret: string; redirectUri: string } {
  if (!env.FAMILYSEARCH_CLIENT_ID || !env.FAMILYSEARCH_CLIENT_SECRET || !env.FAMILYSEARCH_REDIRECT_URI) {
    throw createAppError(
      'VALIDATION_ERROR',
      'FamilySearch integration is not configured on this instance. Set FAMILYSEARCH_CLIENT_ID, FAMILYSEARCH_CLIENT_SECRET, and FAMILYSEARCH_REDIRECT_URI to enable it.',
      503,
    );
  }
  return {
    clientId: env.FAMILYSEARCH_CLIENT_ID,
    clientSecret: env.FAMILYSEARCH_CLIENT_SECRET,
    redirectUri: env.FAMILYSEARCH_REDIRECT_URI,
  };
}

// ─── OAuth: connect ─────────────────────────────────────────────────────────

/**
 * Builds the URL to redirect the user's browser to. `state` should be a
 * per-request random value the caller stores (e.g. in a short-lived Redis
 * key keyed to the user) and verifies on callback, to guard against CSRF —
 * FamilySearch echoes it back unchanged on redirect.
 *
 * scope includes offline_access, which per FamilySearch's docs is required
 * (alongside PKCE for native apps) to actually receive a refresh_token —
 * without it, the connection would silently stop working after the access
 * token's ~24h lifetime with no way to renew it short of the user
 * reconnecting manually.
 */
export function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = requireConfigured();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid offline_access',
    state,
  });
  return `${IDENTITY_HOST}/cis-web/oauth2/v3/authorization?${params.toString()}`;
}

export function generateOAuthState(): string {
  return randomBytes(24).toString('base64url');
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number; // seconds; FamilySearch access tokens are ~24h if omitted
}

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(`${IDENTITY_HOST}/cis-web/oauth2/v3/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw createAppError(
      'SERVICE_UNAVAILABLE',
      `FamilySearch token request failed (${res.status}): ${text.slice(0, 300)}`,
      502,
    );
  }
  return res.json() as Promise<TokenResponse>;
}

/** Exchanges an authorization code (from the OAuth callback) for tokens and stores the connection. */
export async function connectAccount(userId: string, code: string): Promise<void> {
  const { clientId, clientSecret, redirectUri } = requireConfigured();

  const tokens = await requestToken(new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  }));

  await saveTokens(userId, tokens);
}

async function saveTokens(userId: string, tokens: TokenResponse): Promise<void> {
  const { db } = getDb();
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 24 * 60 * 60) * 1000);

  // One row per (userId, provider) — reconnecting replaces the previous
  // connection outright rather than trying to merge, since a fresh
  // authorization implies the user wants a clean connection (e.g. they may
  // have reconnected specifically because the old one broke).
  await db
    .delete(connectedAccounts)
    .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.provider, 'familysearch')));

  await db.insert(connectedAccounts).values({
    userId,
    provider: 'familysearch',
    accessTokenEncrypted: encryptToken(tokens.access_token),
    refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    expiresAt,
  });
}

export async function isConnected(userId: string): Promise<boolean> {
  const { db } = getDb();
  const [row] = await db
    .select({ id: connectedAccounts.id })
    .from(connectedAccounts)
    .where(and(
      eq(connectedAccounts.userId, userId),
      eq(connectedAccounts.provider, 'familysearch'),
      isNull(connectedAccounts.revokedAt),
    ))
    .limit(1);
  return !!row;
}

export async function disconnectAccount(userId: string): Promise<void> {
  const { db } = getDb();
  await db
    .update(connectedAccounts)
    .set({ revokedAt: new Date() })
    .where(and(eq(connectedAccounts.userId, userId), eq(connectedAccounts.provider, 'familysearch')));
}

/**
 * Returns a usable access token, transparently refreshing it if expired
 * (with a small safety margin) and persisting the new one. Throws a clear
 * error if there's no connection, or if refresh itself fails (e.g. the
 * user revoked access on FamilySearch's side) — in that case the caller
 * should prompt the user to reconnect, not silently retry.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const { db } = getDb();
  const [row] = await db
    .select()
    .from(connectedAccounts)
    .where(and(
      eq(connectedAccounts.userId, userId),
      eq(connectedAccounts.provider, 'familysearch'),
      isNull(connectedAccounts.revokedAt),
    ))
    .limit(1);

  if (!row) {
    throw createAppError('VALIDATION_ERROR', 'No connected FamilySearch account. Connect one in Settings first.', 400);
  }

  const marginMs = 60_000; // refresh a minute early rather than racing expiry mid-request
  if (row.expiresAt.getTime() - marginMs > Date.now()) {
    return decryptToken(row.accessTokenEncrypted);
  }

  if (!row.refreshTokenEncrypted) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Your FamilySearch connection has expired and cannot be renewed automatically. Reconnect it in Settings.',
      400,
    );
  }

  const { clientId, clientSecret } = requireConfigured();
  const tokens = await requestToken(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: decryptToken(row.refreshTokenEncrypted),
    client_id: clientId,
    client_secret: clientSecret,
  }));
  await saveTokens(userId, tokens);
  return tokens.access_token;
}

// ─── Search and Match ───────────────────────────────────────────────────────

export interface FamilySearchCandidate {
  firstName: string | null;
  lastName: string | null;
  birthYear: number | null;
  birthPlace: string | null;
  deathYear: number | null;
}

export interface FamilySearchMatch {
  externalId: string;
  displayName: string;
  matchedFields: string[];
  recordUrl: string;
  confidence: number;
}

/**
 * Calls FamilySearch's "Person Matches by Example" resource: POST a GEDCOM X
 * document describing the person to match, get back a ranked list of
 * candidate Family Tree persons.
 *
 * NOT independently verified against a live account (no FamilySearch
 * developer credentials or network access to familysearch.org from this
 * environment) — built from FamilySearch's published resource
 * documentation. The request shape (a GEDCOM X document with a primary
 * person referenced by the main sourceDescription's `about` field) and the
 * general response shape (GEDCOM X entries with a confidence value) are
 * documented; the exact field names in a live JSON response should be
 * confirmed against a real sandbox call before this is trusted in
 * production.
 */
export async function searchFamilySearch(
  userId: string,
  candidate: FamilySearchCandidate,
): Promise<FamilySearchMatch[]> {
  // Cache identical searches for a day — avoids re-querying FamilySearch
  // every time a page loads for the same person, per the design doc's
  // §4.4. Keyed only on the search criteria, not the user, since the
  // search itself is anonymous-with-respect-to-target (it's a query, not a
  // fetch of user-specific data) — two different users searching the same
  // name+year+place get the same cached result.
  const cacheKey = `familysearch_search:${candidate.firstName ?? ''}:${candidate.lastName ?? ''}:${candidate.birthYear ?? ''}:${candidate.birthPlace ?? ''}`;
  const cached = await cacheGet<FamilySearchMatch[]>(cacheKey);
  if (cached) return cached;

  const accessToken = await getValidAccessToken(userId);
  const apiHost = API_HOSTS[env.FAMILYSEARCH_ENV];

  const facts: Array<{ type: string; date?: { original: string } }> = [];
  if (candidate.birthYear) facts.push({ type: 'http://gedcomx.org/Birth', date: { original: String(candidate.birthYear) } });
  if (candidate.deathYear) facts.push({ type: 'http://gedcomx.org/Death', date: { original: String(candidate.deathYear) } });

  const gedcomXDoc = {
    persons: [
      {
        id: 'primaryPerson',
        names: [{
          nameForms: [{
            parts: [
              ...(candidate.firstName ? [{ type: 'http://gedcomx.org/Given', value: candidate.firstName }] : []),
              ...(candidate.lastName ? [{ type: 'http://gedcomx.org/Surname', value: candidate.lastName }] : []),
            ],
          }],
        }],
        facts,
      },
    ],
    sourceDescriptions: [{ id: 'primarySource', about: '#primaryPerson' }],
  };

  const res = await fetch(`${apiHost}/platform/tree/matches?collection=tree`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-gedcomx-v1+json',
      Accept: 'application/x-gedcomx-v1+json',
    },
    body: JSON.stringify(gedcomXDoc),
  });

  if (res.status === 401) {
    throw createAppError('VALIDATION_ERROR', 'FamilySearch rejected the access token. Reconnect your account in Settings.', 401);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw createAppError('SERVICE_UNAVAILABLE', `FamilySearch search failed (${res.status}): ${text.slice(0, 300)}`, 502);
  }

  const body = await res.json() as {
    entries?: Array<{
      id: string;
      content?: { gedcomx?: { persons?: Array<{ id: string; names?: Array<{ nameForms?: Array<{ fullText?: string }> }> }> } };
      // The confidence/likelihood field's exact key has varied across
      // FamilySearch API versions in community reports (score vs
      // confidence vs a nested ResultConfidence structure) — check both
      // reasonable candidates rather than assuming one.
      score?: number;
      confidence?: number;
    }>;
  };

  const matches = (body.entries ?? []).slice(0, 5).map((entry) => {
    const matchedPerson = entry.content?.gedcomx?.persons?.[0];
    const displayName = matchedPerson?.names?.[0]?.nameForms?.[0]?.fullText ?? 'Unknown name';
    return {
      externalId: matchedPerson?.id ?? entry.id,
      displayName,
      matchedFields: [], // GEDCOM X doesn't cleanly enumerate "which fields matched" the way our own duplicate-detection heuristic does — surfaced as unavailable rather than guessed
      recordUrl: `https://www.familysearch.org/tree/person/details/${matchedPerson?.id ?? entry.id}`,
      // Clamped defensively — FamilySearch's actual score scale isn't
      // confirmed (see the file-level comment above), and the existing
      // HintCard UI renders this as a 0-100% bar; an unclamped out-of-range
      // value would render a nonsensical percentage rather than fail loudly.
      confidence: Math.min(1, Math.max(0, entry.confidence ?? entry.score ?? 0)),
    };
  });

  await cacheSet(cacheKey, matches, 24 * 60 * 60);
  return matches;
}

/** Fails closed for living persons — their data should never be sent to a third party for a speculative search. */
export async function assertNotLiving(treeId: string, personId: string): Promise<void> {
  const { db } = getDb();
  const [person] = await db
    .select({ isLiving: persons.isLiving })
    .from(persons)
    .where(and(eq(persons.id, personId), eq(persons.treeId, treeId), isNull(persons.deletedAt)))
    .limit(1);
  if (!person) throw createAppError('PERSON_NOT_FOUND', 'Person not found', 404);
  if (person.isLiving) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Living persons are never searched against FamilySearch or any external provider.',
      400,
    );
  }
}
