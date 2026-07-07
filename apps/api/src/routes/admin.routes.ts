import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import {
  getSystemStats,
  listAdminUsers,
  getAdminUser,
  updateAdminUser,
  listAdminTrees,
  adminDeleteTree,
  listAuditLogs,
} from '../services/admin.service.js';

const paginationSchema = z.object({
  page:    z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

const updateUserSchema = z.object({
  subscriptionTier: z.enum(['free', 'plus', 'pro']).optional(),
  isAdmin:          z.boolean().optional(),
  suspended:        z.boolean().optional(),
  unlockAccount:    z.boolean().optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  // Every route in this plugin requires admin — register it once here
  app.addHook('onRequest', requireAdmin());

  // ── System stats ────────────────────────────────────────────────────────────

  app.get('/stats', async (_request, reply) => {
    const stats = await getSystemStats();
    return reply.send({ success: true, data: stats });
  });

  // ── Users ───────────────────────────────────────────────────────────────────

  app.get<{ Querystring: { page?: string; perPage?: string; search?: string; tier?: string; includeDeleted?: string } }>(
    '/users',
    async (request, reply) => {
      const q = request.query;
      const result = await listAdminUsers({
        page:           Number(q.page ?? 1),
        perPage:        Math.min(Number(q.perPage ?? 25), 100),
        search:         q.search,
        tier:           q.tier,
        includeDeleted: q.includeDeleted === 'true',
      });
      return reply.send({ success: true, data: result });
    },
  );

  app.get<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    const user = await getAdminUser(request.params.userId);
    return reply.send({ success: true, data: user });
  });

  app.patch<{ Params: { userId: string }; Body: unknown }>(
    '/users/:userId',
    async (request, reply) => {
      const parsed = updateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, { fields: formatZodError(parsed.error) });
      }
      await updateAdminUser(
        request.params.userId,
        request.user.sub,
        parsed.data,
        request.id,
        request.ip,
      );
      return reply.send({ success: true, data: { message: 'User updated' } });
    },
  );

  // ── Trees ───────────────────────────────────────────────────────────────────

  app.get<{ Querystring: { page?: string; perPage?: string; search?: string; includeDeleted?: string } }>(
    '/trees',
    async (request, reply) => {
      const q = request.query;
      const result = await listAdminTrees({
        page:           Number(q.page ?? 1),
        perPage:        Math.min(Number(q.perPage ?? 25), 100),
        search:         q.search,
        includeDeleted: q.includeDeleted === 'true',
      });
      return reply.send({ success: true, data: result });
    },
  );

  app.delete<{ Params: { treeId: string } }>('/trees/:treeId', async (request, reply) => {
    await adminDeleteTree(request.params.treeId, request.user.sub, request.id, request.ip);
    return reply.send({ success: true, data: { message: 'Tree soft-deleted' } });
  });

  // ── Audit logs ──────────────────────────────────────────────────────────────

  app.get<{
    Querystring: {
      page?: string; perPage?: string;
      userId?: string; action?: string; resourceType?: string;
      since?: string; until?: string;
    };
  }>('/audit-logs', async (request, reply) => {
    const q = request.query;
    const result = await listAuditLogs({
      page:         Number(q.page ?? 1),
      perPage:      Math.min(Number(q.perPage ?? 50), 100),
      userId:       q.userId,
      action:       q.action,
      resourceType: q.resourceType,
      since:        q.since,
      until:        q.until,
    });
    return reply.send({ success: true, data: result });
  });
}
