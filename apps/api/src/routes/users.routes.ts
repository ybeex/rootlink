import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb, users, notifications } from '@rootlink/db';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { paginationSchema } from '@rootlink/shared';
import { cacheDelPattern } from '../lib/redis.js';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(10).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  // ─── Get current user profile ─────────────────────────────────────────────

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { db } = getDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        subscriptionTier: users.subscriptionTier,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        timezone: users.timezone,
        locale: users.locale,
        twoFactorEnabled: users.twoFactorEnabled,
        totalStorageUsedBytes: users.totalStorageUsedBytes,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, request.user.sub))
      .limit(1);

    if (!user) throw createAppError('NOT_FOUND', 'User not found', 404);

    return reply.send({
      success: true,
      data: user,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Update profile ───────────────────────────────────────────────────────

  app.patch('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
        fields: formatZodError(parsed.error),
      });
    }

    const { db } = getDb();
    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, request.user.sub))
      .returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        timezone: users.timezone,
        locale: users.locale,
        updatedAt: users.updatedAt,
      });

    await cacheDelPattern(`user:${request.user.sub}*`);

    return reply.send({
      success: true,
      data: updated,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Delete account ───────────────────────────────────────────────────────

  app.delete('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { db } = getDb();

    // Soft-delete — GDPR right to erasure is handled via scheduled job
    await db
      .update(users)
      .set({ deletedAt: new Date(), email: `deleted_${request.user.sub}@deleted.rootlink` })
      .where(eq(users.id, request.user.sub));

    return reply.status(204).send();
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  app.get<{ Querystring: Record<string, string> }>(
    '/me/notifications',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const { db } = getDb();

      const items = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, request.user.sub))
        .orderBy(desc(notifications.createdAt))
        .limit(pagination.pageSize)
        .offset((pagination.page - 1) * pagination.pageSize);

      return reply.send({
        success: true,
        data: items,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  app.patch(
    '/me/notifications/read-all',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { db } = getDb();
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.userId, request.user.sub)));

      return reply.status(204).send();
    },
  );
}
