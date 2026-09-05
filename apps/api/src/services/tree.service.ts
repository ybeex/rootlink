import { nanoid } from 'nanoid';
import { getDb, trees, treeMembers, persons, users, vitalEvents } from '@rootlink/db';
import { eq, and, isNull, count, asc } from 'drizzle-orm';
import type { CreateTreeInput, UpdateTreeInput, InviteMemberInput, TreeRole } from '@rootlink/shared';
import { SUBSCRIPTION_LIMITS, CACHE_TTL, WS_EVENTS, isPersonPrivacyRestricted, getDisplayName } from '@rootlink/shared';
import { cacheGet, cacheSet, cacheDelPattern } from '../lib/redis.js';
import { publishTreeEvent } from '../plugins/websocket.js';
import { createAppError } from '../lib/errors.js';
import { emailQueue } from '../workers/queues.js';

export class TreeService {
  // ─── List trees for a user ─────────────────────────────────────────────────

  async listUserTrees(userId: string) {
    const cacheKey = `user_trees:${userId}`;
    const cached = await cacheGet<unknown[]>(cacheKey);
    if (cached) return cached;

    const { db } = getDb();

    // Trees owned + trees the user is a member of
    const ownedTrees = await db
      .select({
        id: trees.id,
        name: trees.name,
        description: trees.description,
        privacyLevel: trees.privacyLevel,
        ownerId: trees.ownerId,
        personCount: trees.personCount,
        mediaCount: trees.mediaCount,
        createdAt: trees.createdAt,
        updatedAt: trees.updatedAt,
        role: trees.ownerId,
      })
      .from(trees)
      .where(and(eq(trees.ownerId, userId), isNull(trees.deletedAt)));

    const memberTrees = await db
      .select({
        id: trees.id,
        name: trees.name,
        description: trees.description,
        privacyLevel: trees.privacyLevel,
        ownerId: trees.ownerId,
        personCount: trees.personCount,
        mediaCount: trees.mediaCount,
        createdAt: trees.createdAt,
        updatedAt: trees.updatedAt,
        role: treeMembers.role,
      })
      .from(treeMembers)
      .innerJoin(trees, eq(treeMembers.treeId, trees.id))
      .where(
        and(
          eq(treeMembers.userId, userId),
          isNull(treeMembers.revokedAt),
          isNull(trees.deletedAt),
        ),
      );

    const owned = ownedTrees.map((t) => ({ ...t, role: 'owner' as const }));
    const combined = [...owned, ...memberTrees];

    await cacheSet(cacheKey, combined, CACHE_TTL.treeSummary);
    return combined;
  }

  // ─── Get single tree ───────────────────────────────────────────────────────

  async getTree(treeId: string, userId: string) {
    const cacheKey = `tree:${treeId}`;
    const cached = await cacheGet<unknown>(cacheKey);
    if (cached) return cached;

    const { db } = getDb();

    const [tree] = await db
      .select()
      .from(trees)
      .where(and(eq(trees.id, treeId), isNull(trees.deletedAt)))
      .limit(1);

    if (!tree) throw createAppError('TREE_NOT_FOUND', 'Tree not found', 404);

    const members = await db
      .select({
        userId: treeMembers.userId,
        role: treeMembers.role,
        acceptedAt: treeMembers.acceptedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(treeMembers)
      .innerJoin(users, eq(treeMembers.userId, users.id))
      .where(and(eq(treeMembers.treeId, treeId), isNull(treeMembers.revokedAt)));

    const result = { ...tree, members };
    await cacheSet(cacheKey, result, CACHE_TTL.treeSummary);
    return result;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createTree(userId: string, subscriptionTier: string, input: CreateTreeInput) {
    const { db } = getDb();
    const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS]
      ?? SUBSCRIPTION_LIMITS.free;

    // Check tree limit
    const [{ treeCount }] = await db
      .select({ treeCount: count() })
      .from(trees)
      .where(and(eq(trees.ownerId, userId), isNull(trees.deletedAt)));

    if (Number(treeCount) >= limits.maxTrees) {
      throw createAppError(
        'TREE_LIMIT_REACHED',
        `Your plan allows a maximum of ${limits.maxTrees} trees. Upgrade to create more.`,
        403,
      );
    }

    const [tree] = await db
      .insert(trees)
      .values({
        name: input.name,
        description: input.description,
        privacyLevel: input.privacyLevel,
        ownerId: userId,
      })
      .returning();

    if (!tree) throw createAppError('INTERNAL_ERROR', 'Failed to create tree', 500);

    await cacheDelPattern(`user_trees:${userId}`);
    return tree;
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updateTree(treeId: string, userId: string, input: UpdateTreeInput) {
    const { db } = getDb();

    const [tree] = await db
      .update(trees)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(trees.id, treeId), isNull(trees.deletedAt)))
      .returning();

    if (!tree) throw createAppError('TREE_NOT_FOUND', 'Tree not found', 404);

    await Promise.all([
      cacheDelPattern(`tree:${treeId}`),
      cacheDelPattern(`user_trees:${userId}`),
    ]);

    void publishTreeEvent(treeId, WS_EVENTS.TREE_UPDATED, { treeId }, userId).catch(() => undefined);

    return tree;
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteTree(treeId: string, userId: string) {
    const { db } = getDb();

    await db
      .update(trees)
      .set({ deletedAt: new Date() })
      .where(and(eq(trees.id, treeId), eq(trees.ownerId, userId), isNull(trees.deletedAt)));

    await Promise.all([
      cacheDelPattern(`tree:${treeId}`),
      cacheDelPattern(`user_trees:${userId}`),
      cacheDelPattern(`persons:${treeId}:*`),
    ]);
  }

  // ─── Generate share token ──────────────────────────────────────────────────

  async generateShareToken(treeId: string) {
    const { db } = getDb();
    const shareToken = nanoid(32);

    await db
      .update(trees)
      .set({ shareToken })
      .where(eq(trees.id, treeId));

    await cacheDelPattern(`tree:${treeId}`);
    return shareToken;
  }

  async revokeShareToken(treeId: string) {
    const { db } = getDb();
    await db.update(trees).set({ shareToken: null }).where(eq(trees.id, treeId));
    await cacheDelPattern(`tree:${treeId}`);
  }

  // ─── Get tree by share token (public, no auth) ────────────────────────────

  async getTreeByShareToken(shareToken: string) {
    const { db } = getDb();
    const [tree] = await db
      .select()
      .from(trees)
      .where(and(eq(trees.shareToken, shareToken), isNull(trees.deletedAt)))
      .limit(1);

    if (!tree) throw createAppError('TREE_NOT_FOUND', 'Invalid or expired share link', 404);
    return tree;
  }

  // ─── Invite member ─────────────────────────────────────────────────────────

  async inviteMember(treeId: string, invitedByUserId: string, input: InviteMemberInput) {
    const { db } = getDb();

    // Find or pre-register invitee
    const [invitee] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    const inviteToken = nanoid(48);

    if (invitee) {
      // Check if already a member
      const [existing] = await db
        .select({ id: treeMembers.id })
        .from(treeMembers)
        .where(
          and(
            eq(treeMembers.treeId, treeId),
            eq(treeMembers.userId, invitee.id),
            isNull(treeMembers.revokedAt),
          ),
        )
        .limit(1);

      if (existing) {
        throw createAppError('VALIDATION_ERROR', 'User is already a member of this tree', 409);
      }

      await db.insert(treeMembers).values({
        treeId,
        userId: invitee.id,
        role: input.role,
        invitedByUserId,
        inviteToken,
        inviteEmail: input.email,
      });
    } else {
      // Pending invite — will be claimed when user registers
      await db.insert(treeMembers).values({
        treeId,
        userId: invitedByUserId, // placeholder; updated on accept
        role: input.role,
        invitedByUserId,
        inviteToken,
        inviteEmail: input.email,
      });
    }

    // Send invite email
    const inviterName = await (async () => {
      const { db: d } = getDb();
      const [inv] = await d.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, invitedByUserId)).limit(1);
      return inv ? `\${inv.firstName} \${inv.lastName}` : 'Someone';
    })();

    const [treeRow] = await db.select({ name: trees.name }).from(trees).where(eq(trees.id, treeId)).limit(1);
    await emailQueue.add('send-invite', {
      to: input.email,
      templateId: 'tree-invite',
      subject: `${inviterName} invited you to a family tree on RootLink`,
      templateData: {
        inviterName,
        treeName: treeRow?.name ?? 'a family tree',
        role: input.role,
        message: input.message ?? '',
        acceptUrl: `${process.env['APP_URL'] ?? 'http://localhost:3000'}/accept-invite?token=${inviteToken}`,
      },
    });

    await cacheDelPattern(`tree:\${treeId}`);
    return { inviteToken };
  }

  // ─── Accept invite ─────────────────────────────────────────────────────────

  async acceptInvite(inviteToken: string, userId: string) {
    const { db } = getDb();

    const [invite] = await db
      .select()
      .from(treeMembers)
      .where(eq(treeMembers.inviteToken, inviteToken))
      .limit(1);

    if (!invite) throw createAppError('NOT_FOUND', 'Invalid invite token', 404);
    if (invite.acceptedAt) throw createAppError('VALIDATION_ERROR', 'Invite already accepted', 400);

    await db
      .update(treeMembers)
      .set({ userId, acceptedAt: new Date(), inviteToken: null })
      .where(eq(treeMembers.id, invite.id));

    await cacheDelPattern(`tree:${invite.treeId}`);
    await cacheDelPattern(`user_trees:${userId}`);

    return { treeId: invite.treeId };
  }

  // ─── Remove member ─────────────────────────────────────────────────────────

  async removeMember(treeId: string, targetUserId: string) {
    const { db } = getDb();

    await db
      .update(treeMembers)
      .set({ revokedAt: new Date() })
      .where(and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, targetUserId)));

    await Promise.all([
      cacheDelPattern(`tree:${treeId}`),
      cacheDelPattern(`user_trees:${targetUserId}`),
      cacheDelPattern(`tree_perm:${targetUserId}:${treeId}`),
    ]);
  }

  // ─── Timeline (§5.4) ────────────────────────────────────────────────────────
  //
  // Every vital event in the tree, across every person, sorted
  // chronologically — "aggregate vitalEvents across a family, sorted by
  // date" per the continuation plan. vitalEvents carries treeId directly,
  // so this is a single flat query rather than a join through every person
  // in the tree individually.
  //
  // Privacy: events belonging to a privacy-restricted person are excluded
  // entirely rather than partially redacted. A feed that mixes visible and
  // "someone private" placeholder entries side-by-side is a worse
  // experience than just not surfacing that person's events here at all,
  // and avoids the harder problem of deciding how much of a redacted
  // entry (date? place? just the event type?) is safe to show in
  // isolation from the rest of that person's profile.
  async getTimeline(
    treeId: string,
    options: { viewerRole?: TreeRole | null; isShareTokenViewer?: boolean } = {},
  ) {
    const { viewerRole = null, isShareTokenViewer = false } = options;
    const { db } = getDb();

    const rows = await db
      .select({
        eventId: vitalEvents.id,
        type: vitalEvents.type,
        dateYear: vitalEvents.dateYear,
        dateMonth: vitalEvents.dateMonth,
        dateDay: vitalEvents.dateDay,
        dateCirca: vitalEvents.dateCirca,
        placeDisplayName: vitalEvents.placeDisplayName,
        description: vitalEvents.description,
        personId: persons.id,
        firstName: persons.firstName,
        middleName: persons.middleName,
        lastName: persons.lastName,
        preferredName: persons.preferredName,
        isLiving: persons.isLiving,
        privacyLevel: persons.privacyLevel,
      })
      .from(vitalEvents)
      .innerJoin(persons, eq(vitalEvents.personId, persons.id))
      .where(and(eq(vitalEvents.treeId, treeId), isNull(persons.deletedAt)))
      .orderBy(asc(vitalEvents.dateYear), asc(vitalEvents.dateMonth), asc(vitalEvents.dateDay));

    return rows
      .filter((r) => {
        if (isPersonPrivacyRestricted({ privacyLevel: r.privacyLevel }, { role: viewerRole, isShareTokenViewer })) return false;
        // Living persons' events are excluded from a share-token view of
        // the timeline, same as redactLiving does for the person list —
        // an anonymous link recipient shouldn't see a living relative's
        // birthdate laid out on a public-facing feed.
        if (isShareTokenViewer && r.isLiving) return false;
        return true;
      })
      .map((r) => ({
        eventId: r.eventId,
        type: r.type,
        date: r.dateYear ? { year: r.dateYear, month: r.dateMonth, day: r.dateDay, circa: r.dateCirca } : null,
        place: r.placeDisplayName,
        description: r.description,
        personId: r.personId,
        personDisplayName: getDisplayName(r),
      }));
  }
}
