import type { FastifyRequest, FastifyReply } from 'fastify';
import type { TreeRole } from '@rootlink/shared';
import { getDb, treeMembers, trees, users } from '@rootlink/db';
import { eq, and, isNull } from 'drizzle-orm';
import { cacheGet, cacheSet } from '../lib/redis.js';
import { CACHE_TTL } from '@rootlink/shared';
import { createAppError } from '../lib/errors.js';

// ─── JWT Payload ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  tier: string;
  iss: string;
  iat: number;
  exp: number;
}

// ─── Augment Fastify Request ──────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

// ─── Authenticate hook ────────────────────────────────────────────────────────

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw createAppError('TOKEN_INVALID', 'Invalid or expired access token', 401);
  }
}

// ─── Tree permission helpers ──────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<TreeRole, number> = {
  viewer: 1,
  contributor: 2,
  editor: 3,
  admin: 4,
  owner: 5,
};

export function hasMinimumRole(userRole: TreeRole, requiredRole: TreeRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

interface TreePermission {
  role: TreeRole;
  treeOwnerId: string;
}

export async function getTreePermission(
  userId: string,
  treeId: string,
): Promise<TreePermission | null> {
  const cacheKey = `tree_perm:${userId}:${treeId}`;
  const cached = await cacheGet<TreePermission>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();

  // Check if user is tree owner first (most common case)
  const tree = await db
    .select({ ownerId: trees.ownerId })
    .from(trees)
    .where(and(eq(trees.id, treeId), isNull(trees.deletedAt)))
    .limit(1);

  if (!tree[0]) return null;

  if (tree[0].ownerId === userId) {
    const perm: TreePermission = { role: 'owner', treeOwnerId: tree[0].ownerId };
    await cacheSet(cacheKey, perm, CACHE_TTL.treeSummary);
    return perm;
  }

  // Check membership
  const member = await db
    .select({ role: treeMembers.role })
    .from(treeMembers)
    .where(
      and(
        eq(treeMembers.treeId, treeId),
        eq(treeMembers.userId, userId),
        isNull(treeMembers.revokedAt),
      ),
    )
    .limit(1);

  if (!member[0]) return null;

  const perm: TreePermission = { role: member[0].role, treeOwnerId: tree[0].ownerId };
  await cacheSet(cacheKey, perm, CACHE_TTL.treeSummary);
  return perm;
}

// ─── Tree authorization factory ───────────────────────────────────────────────

export function requireTreeRole(requiredRole: TreeRole) {
  return async (request: FastifyRequest<{ Params: { treeId: string } }>, reply: FastifyReply) => {
    await authenticate(request, reply);

    const { treeId } = request.params;
    const userId = request.user.sub;

    const permission = await getTreePermission(userId, treeId);

    if (!permission) {
      throw createAppError('TREE_ACCESS_DENIED', 'Tree not found or access denied', 403);
    }

    if (!hasMinimumRole(permission.role, requiredRole)) {
      throw createAppError(
        'INSUFFICIENT_ROLE',
        `This action requires ${requiredRole} role or higher`,
        403,
      );
    }

    // Attach permission to request for downstream use
    (request as FastifyRequest & { treePermission: TreePermission }).treePermission = permission;
  };
}

// ─── Site-admin authorization (operational dashboard only) ────────────────────

export function requireAdmin() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    const userId = request.user.sub;
    const cacheKey = `is_admin:${userId}`;
    let isAdmin = await cacheGet<boolean>(cacheKey);

    if (isAdmin === null) {
      const { db } = getDb();
      const [row] = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      isAdmin = row?.isAdmin ?? false;
      // Short TTL relative to tree-permission caching: admin status changes
      // rarely, but the consequence of a stale "true" is broader (access to
      // every tree's queue data) than a stale tree-role cache entry, so this
      // favors faster revocation over cache-hit rate.
      await cacheSet(cacheKey, isAdmin, 60);
    }

    if (!isAdmin) {
      throw createAppError('FORBIDDEN', 'Admin access required', 403);
    }
  };
}

// ─── Tree VIEW authorization (authenticated member OR share token) ────────────
//
// Read-only endpoints (list/get persons, relationships, etc.) must remain
// reachable by anonymous visitors holding a valid share link, in addition to
// authenticated tree members. This factory grants access via either path and
// records HOW access was granted via `viaShareToken`, so the calling route can
// decide whether to redact living-person data (redact when viaShareToken=true).
//
// A share token only grants access when:
//   1. It matches `trees.share_token` for this tree, AND
//   2. The tree's privacyLevel is NOT 'private' (private trees never honor
//      share tokens, regardless of whether one happens to be set).

export interface ViewPermission extends TreePermission {
  viaShareToken: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    treePermission?: TreePermission;
    viewPermission?: ViewPermission;
  }
}

/** Attempts JWT verification without throwing. Returns the payload, or null. */
async function tryAuthenticate(request: FastifyRequest): Promise<JwtPayload | null> {
  try {
    await request.jwtVerify();
    return request.user;
  } catch {
    return null;
  }
}

export function requireTreeViewAccess() {
  return async (
    request: FastifyRequest<{ Params: { treeId: string }; Querystring: { shareToken?: string } }>,
    _reply: FastifyReply,
  ) => {
    const { treeId } = request.params;

    // 1. Try authenticated tree membership first.
    const jwtPayload = await tryAuthenticate(request);
    if (jwtPayload) {
      const permission = await getTreePermission(jwtPayload.sub, treeId);
      if (permission && hasMinimumRole(permission.role, 'viewer')) {
        request.treePermission = permission;
        request.viewPermission = { ...permission, viaShareToken: false };
        return;
      }
    }

    // 2. Fall back to share-token access (read-only, redacted).
    const shareToken = request.query.shareToken;
    if (shareToken) {
      const { db } = getDb();
      const [tree] = await db
        .select({ id: trees.id, ownerId: trees.ownerId, shareToken: trees.shareToken, privacyLevel: trees.privacyLevel })
        .from(trees)
        .where(and(eq(trees.id, treeId), isNull(trees.deletedAt)))
        .limit(1);

      if (
        tree &&
        tree.shareToken &&
        tree.privacyLevel !== 'private' &&
        // Constant-time-ish comparison is unnecessary here: share tokens are
        // high-entropy nanoid values and this is a read-only grant, not an
        // auth secret comparison guarding credential verification.
        tree.shareToken === shareToken
      ) {
        const permission: ViewPermission = { role: 'viewer', treeOwnerId: tree.ownerId, viaShareToken: true };
        request.treePermission = permission;
        request.viewPermission = permission;
        return;
      }
    }

    throw createAppError('TREE_ACCESS_DENIED', 'Tree not found or access denied', 403);
  };
}
