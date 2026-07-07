import {
  getDb, users, trees, treeMembers, persons, mediaAssets, auditLogs,
} from '@rootlink/db';
import {
  eq, and, isNull, sql, desc, like, or, count, sum,
  gte, lte,
} from 'drizzle-orm';
import { createAppError } from '../lib/errors.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;        // not soft-deleted
  verifiedUsers: number;
  tierBreakdown: Record<string, number>;
  totalTrees: number;
  activeTrees: number;
  totalPersons: number;
  totalMediaAssets: number;
  totalStorageBytes: number;
  newUsersLast30Days: number;
  newTreesLast30Days: number;
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  subscriptionTier: string;
  stripeCustomerId: string | null;
  totalStorageUsedBytes: number;
  twoFactorEnabled: boolean;
  isAdmin: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  treeCount: number;
}

export interface AdminTree {
  id: string;
  name: string;
  description: string | null;
  privacyLevel: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  personCount: number;
  mediaCount: number;
  memberCount: number;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface AdminAuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
}

// ── System stats ───────────────────────────────────────────────────────────────

export async function getSystemStats(): Promise<SystemStats> {
  const { db } = getDb();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    userRows,
    treeRows,
    personRows,
    mediaRows,
  ] = await Promise.all([
    db.select({
      totalUsers:       count(),
      activeUsers:      sql<number>`count(*) filter (where ${users.deletedAt} is null)`,
      verifiedUsers:    sql<number>`count(*) filter (where ${users.emailVerified} = true and ${users.deletedAt} is null)`,
      newLast30Days:    sql<number>`count(*) filter (where ${users.createdAt} >= ${thirtyDaysAgo} and ${users.deletedAt} is null)`,
      freeTier:         sql<number>`count(*) filter (where ${users.subscriptionTier} = 'free' and ${users.deletedAt} is null)`,
      plusTier:         sql<number>`count(*) filter (where ${users.subscriptionTier} = 'plus' and ${users.deletedAt} is null)`,
      proTier:          sql<number>`count(*) filter (where ${users.subscriptionTier} = 'pro' and ${users.deletedAt} is null)`,
      totalStorage:     sql<number>`coalesce(sum(${users.totalStorageUsedBytes}), 0)`,
    }).from(users),

    db.select({
      totalTrees:    count(),
      activeTrees:   sql<number>`count(*) filter (where ${trees.deletedAt} is null)`,
      newLast30Days: sql<number>`count(*) filter (where ${trees.createdAt} >= ${thirtyDaysAgo} and ${trees.deletedAt} is null)`,
    }).from(trees),

    db.select({ total: count() }).from(persons).where(isNull(persons.deletedAt)),
    db.select({ total: count() }).from(mediaAssets).where(isNull(mediaAssets.deletedAt)),
  ]);

  const u = userRows[0]!;
  const t = treeRows[0]!;

  return {
    totalUsers:        Number(u.totalUsers),
    activeUsers:       Number(u.activeUsers),
    verifiedUsers:     Number(u.verifiedUsers),
    tierBreakdown:     { free: Number(u.freeTier), plus: Number(u.plusTier), pro: Number(u.proTier) },
    totalTrees:        Number(t.totalTrees),
    activeTrees:       Number(t.activeTrees),
    totalPersons:      Number(personRows[0]?.total ?? 0),
    totalMediaAssets:  Number(mediaRows[0]?.total ?? 0),
    totalStorageBytes: Number(u.totalStorage),
    newUsersLast30Days: Number(u.newLast30Days),
    newTreesLast30Days: Number(t.newLast30Days),
  };
}

// ── Users ──────────────────────────────────────────────────────────────────────

export async function listAdminUsers(opts: {
  page: number;
  perPage: number;
  search?: string;
  tier?: string;
  includeDeleted?: boolean;
}): Promise<PaginatedResult<AdminUser>> {
  const { db } = getDb();
  const { page, perPage, search, tier, includeDeleted } = opts;
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (!includeDeleted) conditions.push(isNull(users.deletedAt));
  if (tier) conditions.push(eq(users.subscriptionTier, tier as 'free' | 'plus' | 'pro'));
  if (search) {
    conditions.push(
      or(
        like(users.email, `%${search}%`),
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`),
      ),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const treeCountSq = db
    .select({ userId: trees.ownerId, treeCount: count().as('tree_count') })
    .from(trees)
    .where(isNull(trees.deletedAt))
    .groupBy(trees.ownerId)
    .as('tree_counts');

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: users.id, email: users.email,
        firstName: users.firstName, lastName: users.lastName,
        emailVerified: users.emailVerified,
        subscriptionTier: users.subscriptionTier,
        stripeCustomerId: users.stripeCustomerId,
        totalStorageUsedBytes: users.totalStorageUsedBytes,
        twoFactorEnabled: users.twoFactorEnabled,
        isAdmin: users.isAdmin,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        deletedAt: users.deletedAt,
        treeCount: sql<number>`coalesce(${treeCountSq.treeCount}, 0)`,
      })
      .from(users)
      .leftJoin(treeCountSq, eq(users.id, treeCountSq.userId))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(perPage)
      .offset(offset),

    db.select({ total: count() }).from(users).where(where),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  return {
    data: rows.map(r => ({ ...r, treeCount: Number(r.treeCount) })),
    total,
    page,
    perPage,
    pages: Math.ceil(total / perPage),
  };
}

export async function getAdminUser(userId: string): Promise<AdminUser & {
  trees: { id: string; name: string; personCount: number; createdAt: Date }[];
}> {
  const { db } = getDb();

  const [userRow] = await db
    .select({
      id: users.id, email: users.email,
      firstName: users.firstName, lastName: users.lastName,
      emailVerified: users.emailVerified,
      subscriptionTier: users.subscriptionTier,
      stripeCustomerId: users.stripeCustomerId,
      totalStorageUsedBytes: users.totalStorageUsedBytes,
      twoFactorEnabled: users.twoFactorEnabled,
      isAdmin: users.isAdmin,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRow) throw createAppError('NOT_FOUND', 'User not found', 404);

  const userTrees = await db
    .select({ id: trees.id, name: trees.name, personCount: trees.personCount, createdAt: trees.createdAt })
    .from(trees)
    .where(and(eq(trees.ownerId, userId), isNull(trees.deletedAt)))
    .orderBy(desc(trees.createdAt))
    .limit(20);

  const treeCountSub = await db
    .select({ total: count() })
    .from(trees)
    .where(and(eq(trees.ownerId, userId), isNull(trees.deletedAt)));

  return {
    ...userRow,
    treeCount: Number(treeCountSub[0]?.total ?? 0),
    trees: userTrees,
  };
}

export async function updateAdminUser(
  userId: string,
  adminId: string,
  updates: {
    subscriptionTier?: 'free' | 'plus' | 'pro';
    isAdmin?: boolean;
    suspended?: boolean;
    unlockAccount?: boolean;
  },
  requestId: string,
  ipAddress: string,
): Promise<void> {
  const { db } = getDb();

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) throw createAppError('NOT_FOUND', 'User not found', 404);

  const patch: Record<string, unknown> = {};
  if (updates.subscriptionTier !== undefined) patch.subscriptionTier = updates.subscriptionTier;
  if (updates.isAdmin !== undefined) patch.isAdmin = updates.isAdmin;
  if (updates.suspended === true) patch.deletedAt = new Date();
  if (updates.suspended === false) patch.deletedAt = null;
  if (updates.unlockAccount) { patch.failedLoginAttempts = 0; patch.lockedUntil = null; }

  await db.update(users).set(patch as never).where(eq(users.id, userId));

  // Every admin mutation writes to the audit log (Gap 5 from the PRD analysis)
  await writeAuditLog({
    userId: adminId,
    action: 'admin.update_user',
    resourceType: 'user',
    resourceId: userId,
    ipAddress,
    requestId,
    metadata: { updates },
  });
}

// ── Trees ──────────────────────────────────────────────────────────────────────

export async function listAdminTrees(opts: {
  page: number;
  perPage: number;
  search?: string;
  includeDeleted?: boolean;
}): Promise<PaginatedResult<AdminTree>> {
  const { db } = getDb();
  const { page, perPage, search, includeDeleted } = opts;
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (!includeDeleted) conditions.push(isNull(trees.deletedAt));
  if (search) conditions.push(like(trees.name, `%${search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const memberCountSq = db
    .select({ treeId: treeMembers.treeId, mc: count().as('mc') })
    .from(treeMembers)
    .groupBy(treeMembers.treeId)
    .as('member_counts');

  const owner = { email: users.email, first: users.firstName, last: users.lastName };

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: trees.id, name: trees.name, description: trees.description,
        privacyLevel: trees.privacyLevel, ownerId: trees.ownerId,
        ownerEmail: owner.email,
        ownerName: sql<string>`${owner.first} || ' ' || ${owner.last}`,
        personCount: trees.personCount, mediaCount: trees.mediaCount,
        memberCount: sql<number>`coalesce(${memberCountSq.mc}, 0)`,
        createdAt: trees.createdAt, deletedAt: trees.deletedAt,
      })
      .from(trees)
      .innerJoin(users, eq(trees.ownerId, users.id))
      .leftJoin(memberCountSq, eq(trees.id, memberCountSq.treeId))
      .where(where)
      .orderBy(desc(trees.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(trees).where(where),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  return {
    data: rows.map(r => ({ ...r, memberCount: Number(r.memberCount) })),
    total,
    page,
    perPage,
    pages: Math.ceil(total / perPage),
  };
}

export async function adminDeleteTree(
  treeId: string,
  adminId: string,
  requestId: string,
  ipAddress: string,
): Promise<void> {
  const { db } = getDb();

  const [tree] = await db.select({ id: trees.id, name: trees.name }).from(trees).where(eq(trees.id, treeId)).limit(1);
  if (!tree) throw createAppError('NOT_FOUND', 'Tree not found', 404);

  await db.update(trees).set({ deletedAt: new Date() }).where(eq(trees.id, treeId));

  await writeAuditLog({
    userId: adminId,
    action: 'admin.delete_tree',
    resourceType: 'tree',
    resourceId: treeId,
    ipAddress,
    requestId,
    metadata: { treeName: tree.name },
  });
}

// ── Audit log ──────────────────────────────────────────────────────────────────

export async function listAuditLogs(opts: {
  page: number;
  perPage: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  since?: string;
  until?: string;
}): Promise<PaginatedResult<AdminAuditLog>> {
  const { db } = getDb();
  const { page, perPage, userId, action, resourceType, since, until } = opts;
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action) conditions.push(like(auditLogs.action, `%${action}%`));
  if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
  if (since) conditions.push(gte(auditLogs.createdAt, new Date(since)));
  if (until) conditions.push(lte(auditLogs.createdAt, new Date(until)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userEmail: users.email,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        ipAddress: auditLogs.ipAddress,
        requestId: auditLogs.requestId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  const total = Number(totalRows[0]?.total ?? 0);
  return {
    data: rows.map(r => ({
      ...r,
      metadata: r.metadata as Record<string, unknown>,
    })),
    total,
    page,
    perPage,
    pages: Math.ceil(total / perPage),
  };
}

// ── Audit log writer — finally wires up the audit_logs table (Gap 5 from PRD) ─

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
