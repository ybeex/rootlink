import type { FastifyInstance } from 'fastify';
import { getDb, researchHints } from '@rootlink/db';
import { eq, and, desc } from 'drizzle-orm';
import { reviewHintSchema, paginationSchema } from '@rootlink/shared';
import { requireTreeRole } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { aiHintQueue, gedcomImportQueue, gedcomExportQueue } from '../workers/queues.js';
import { nanoid } from 'nanoid';

export async function hintRoutes(app: FastifyInstance) {
  // ── List hints for a tree ──────────────────────────────────────────────
  app.get<{ Params: { treeId: string }; Querystring: Record<string, string> }>(
    '/',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const { page, pageSize } = paginationSchema.parse(request.query);
      const statusFilter = (request.query['status'] as string | undefined) ?? 'pending';
      const { db } = getDb();

      const rows = await db
        .select()
        .from(researchHints)
        .where(
          and(
            eq(researchHints.treeId, request.params.treeId),
            eq(researchHints.status, statusFilter as 'pending' | 'accepted' | 'rejected' | 'snoozed'),
          ),
        )
        .orderBy(desc(researchHints.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return reply.send({ success: true, data: rows, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // ── Review a hint (accept / reject / snooze) ───────────────────────────
  app.patch<{ Params: { treeId: string; hintId: string }; Body: unknown }>(
    '/:hintId',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      const parsed = reviewHintSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, { fields: formatZodError(parsed.error) });
      }

      const { db } = getDb();
      const [updated] = await db
        .update(researchHints)
        .set({
          status:     parsed.data.status,
          reviewedAt: new Date(),
          reviewedBy: request.user.sub,
        })
        .where(
          and(
            eq(researchHints.id, request.params.hintId),
            eq(researchHints.treeId, request.params.treeId),
          ),
        )
        .returning();

      if (!updated) throw createAppError('NOT_FOUND', 'Hint not found', 404);

      return reply.send({ success: true, data: updated, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // ── Trigger AI hint generation for a person ────────────────────────────
  app.post<{ Params: { treeId: string }; Body: { personId: string } }>(
    '/generate',
    {
      preHandler: [requireTreeRole('contributor')],
      config: { rateLimit: { max: 5, timeWindow: '1h' } },
    },
    async (request, reply) => {
      const { personId } = request.body;
      if (!personId) throw createAppError('VALIDATION_ERROR', 'personId is required', 400);

      await aiHintQueue.add('generate-hints', {
        personId,
        treeId: request.params.treeId,
        userId: request.user.sub,
      });

      return reply.status(202).send({
        success: true,
        data: { message: 'Hint generation queued.' },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}

export async function gedcomRoutes(app: FastifyInstance) {
  // ── Trigger GEDCOM export ──────────────────────────────────────────────
  app.post<{ Params: { treeId: string } }>(
    '/export',
    {
      preHandler: [requireTreeRole('viewer')],
      config: { rateLimit: { max: 3, timeWindow: '1h' } },
    },
    async (request, reply) => {
      const requestId = nanoid(16);

      await gedcomExportQueue.add('export-gedcom', {
        treeId:    request.params.treeId,
        userId:    request.user.sub,
        requestId,
      });

      return reply.status(202).send({
        success: true,
        data: { message: 'GEDCOM export queued. You will receive a notification when it is ready.', requestId },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Trigger GEDCOM import (file must already be uploaded to S3) ────────
  app.post<{ Params: { treeId: string }; Body: { storageKey: string } }>(
    '/import',
    {
      preHandler: [requireTreeRole('admin')],
      config: { rateLimit: { max: 3, timeWindow: '1h' } },
    },
    async (request, reply) => {
      const { storageKey } = request.body;
      if (!storageKey) throw createAppError('VALIDATION_ERROR', 'storageKey is required', 400);

      await gedcomImportQueue.add('import-gedcom', {
        treeId:     request.params.treeId,
        userId:     request.user.sub,
        storageKey,
      });

      return reply.status(202).send({
        success: true,
        data: { message: 'GEDCOM import queued. You will receive a notification when complete.' },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
