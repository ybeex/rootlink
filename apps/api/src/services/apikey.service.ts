import * as argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { getDb, apiKeys } from '@rootlink/db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { SUBSCRIPTION_LIMITS } from '@rootlink/shared';
import { createAppError } from '../lib/errors.js';

const MAX_ACTIVE_KEYS_PER_USER = 10;
const KEY_PREFIX_LABEL = 'rl_live_';

function requireApiAccessTier(subscriptionTier: string): void {
  const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS]
    ?? SUBSCRIPTION_LIMITS.free;
  if (!limits.canAccessApiAccess) {
    throw createAppError(
      'SUBSCRIPTION_REQUIRED',
      'API access is available on the Pro plan. Upgrade to generate an API key.',
      403,
    );
  }
}

export interface CreatedApiKey {
  id: string;
  label: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  // Only ever returned from create — never stored, never returned again.
  plaintextKey: string;
}

/**
 * Creates a new API key for a user. Mirrors AuthService.generateTokenPair's
 * selector+verifier pattern: the plaintext key is `${KEY_PREFIX_LABEL}${selector}.${verifier}`.
 * The selector is stored in plaintext (indexed) for O(1) lookup at request
 * time; only the argon2 hash of the verifier is stored. The full plaintext
 * key is returned here once, and only here — the service has no way to
 * reconstruct it afterward, by design.
 */
export async function createApiKey(
  userId: string,
  subscriptionTier: string,
  label: string,
): Promise<CreatedApiKey> {
  requireApiAccessTier(subscriptionTier);

  const { db } = getDb();

  const activeCount = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  if (activeCount.length >= MAX_ACTIVE_KEYS_PER_USER) {
    throw createAppError(
      'API_KEY_LIMIT_REACHED',
      `You can have at most ${MAX_ACTIVE_KEYS_PER_USER} active API keys. Revoke one before creating another.`,
      403,
    );
  }

  const selector = nanoid(16);
  const verifier = nanoid(48);
  const plaintextKey = `${KEY_PREFIX_LABEL}${selector}.${verifier}`;
  // Shown in the key list so a user can tell keys apart without the server
  // being able to reconstruct the secret from what's stored.
  const keyPrefix = plaintextKey.slice(0, 16);
  const keyHash = await argon2.hash(verifier, { type: argon2.argon2id });

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      label,
      keyPrefix,
      keySelector: selector,
      keyHash,
      scopes: ['read'],
    })
    .returning();

  return {
    id: row.id,
    label: row.label,
    keyPrefix: row.keyPrefix,
    scopes: row.scopes as string[],
    createdAt: row.createdAt.toISOString(),
    plaintextKey,
  };
}

export async function listApiKeys(userId: string) {
  const { db } = getDb();
  const rows = await db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));

  // keyHash/keySelector never leave the service layer, even for the
  // owning user — there is no legitimate reason for a client to see them.
  return rows;
}

export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  const { db } = getDb();

  const [existing] = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!existing) {
    throw createAppError('API_KEY_NOT_FOUND', 'API key not found', 404);
  }

  await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, keyId));
}

export interface VerifiedApiKey {
  apiKeyId: string;
  userId: string;
  scopes: string[];
}

/**
 * Verifies a raw `Authorization: Bearer rl_live_<selector>.<verifier>` key
 * and returns the owning user + scopes, or null if invalid/revoked. Updates
 * lastUsedAt on success — fire-and-forget from the caller's perspective
 * (see authenticateApiKey in middleware/auth.ts), same non-blocking spirit
 * as other "last used" style writes in this codebase.
 */
export async function verifyApiKey(rawKey: string): Promise<VerifiedApiKey | null> {
  if (!rawKey.startsWith(KEY_PREFIX_LABEL)) return null;

  const withoutPrefix = rawKey.slice(KEY_PREFIX_LABEL.length);
  const dotIndex = withoutPrefix.indexOf('.');
  if (dotIndex !== 16) return null;

  const selector = withoutPrefix.slice(0, 16);
  const verifier = withoutPrefix.slice(17);

  const { db } = getDb();
  const [candidate] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keySelector, selector), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!candidate) return null;
  if (!(await argon2.verify(candidate.keyHash, verifier))) return null;

  void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, candidate.id));

  return {
    apiKeyId: candidate.id,
    userId: candidate.userId,
    scopes: candidate.scopes as string[],
  };
}
