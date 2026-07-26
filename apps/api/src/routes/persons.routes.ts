import type { FastifyInstance } from 'fastify';
import { PersonService } from '../services/person.service.js';
import {
  createPersonSchema,
  updatePersonSchema,
  searchPersonSchema,
  paginationSchema,
  type CreatePersonInput,
  type UpdatePersonInput,
} from '@rootlink/shared';
import { requireTreeRole, requireTreeViewAccess } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';
import { getDb, editHistory } from '@rootlink/db';
import { eq, and, desc } from 'drizzle-orm';
import { aiBioQueue } from '../workers/queues.js';

export async function personRoutes(app: FastifyInstance) {
  const personService = new PersonService();

  // ── List / Search ───────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string }; Querystring: Record<string, string> & { shareToken?: string } }>(
    '/',
    { preHandler: [requireTreeViewAccess()] },
    async (request, reply) => {
      const parsed = searchPersonSchema.safeParse(request.query);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid query params', 400, {
          fields: formatZodError(parsed.error),
        });
      }
      const redactLiving = request.viewPermission?.viaShareToken ?? false;
      const result = await personService.listPersons(request.params.treeId, parsed.data, {
        redactLiving,
        viewerRole: request.viewPermission?.role ?? null,
        isShareTokenViewer: request.viewPermission?.viaShareToken ?? false,
      });
      return reply.send({
        success: true,
        ...result,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Get one ─────────────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string; personId: string }; Querystring: { shareToken?: string } }>(
    '/:personId',
    { preHandler: [requireTreeViewAccess()] },
    async (request, reply) => {
      const redactLiving = request.viewPermission?.viaShareToken ?? false;
      const person = await personService.getPerson(
        request.params.treeId,
        request.params.personId,
        {
          redactLiving,
          viewerRole: request.viewPermission?.role ?? null,
          isShareTokenViewer: request.viewPermission?.viaShareToken ?? false,
        },
      );
      return reply.send({
        success: true,
        data: person,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Create ──────────────────────────────────────────────────────────────────
  app.post<{ Params: { treeId: string }; Body: CreatePersonInput }>(
    '/',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      await handleIdempotency(request, reply);
      if (reply.sent) return;
      const parsed = createPersonSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }
      const idempotencyKey = request.headers['x-idempotency-key'] as string | undefined;
      const person = await personService.createPerson(
        request.params.treeId,
        request.user.sub,
        parsed.data,
        idempotencyKey,
      );
      return reply.status(201).send({
        success: true,
        data: person,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Update ──────────────────────────────────────────────────────────────────
  app.patch<{ Params: { treeId: string; personId: string }; Body: UpdatePersonInput }>(
    '/:personId',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      const parsed = updatePersonSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }
      const person = await personService.updatePerson(
        request.params.treeId,
        request.params.personId,
        request.user.sub,
        parsed.data,
      );
      return reply.send({
        success: true,
        data: person,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  app.delete<{ Params: { treeId: string; personId: string } }>(
    '/:personId',
    { preHandler: [requireTreeRole('editor')] },
    async (request, reply) => {
      await personService.deletePerson(
        request.params.treeId,
        request.params.personId,
        request.user.sub,
      );
      return reply.status(204).send();
    },
  );

  // ── Edit history ────────────────────────────────────────────────────────────
  app.get<{
    Params: { treeId: string; personId: string };
    Querystring: Record<string, string>;
  }>(
    '/:personId/history',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const { db } = getDb();
      const entries = await db
        .select()
        .from(editHistory)
        .where(
          and(
            eq(editHistory.treeId, request.params.treeId),
            eq(editHistory.entityId, request.params.personId),
            eq(editHistory.entityType, 'person'),
          ),
        )
        .orderBy(desc(editHistory.performedAt))
        .limit(pagination.pageSize)
        .offset((pagination.page - 1) * pagination.pageSize);

      return reply.send({
        success: true,
        data: entries,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Restore from history ────────────────────────────────────────────────────
  app.post<{ Params: { treeId: string; personId: string }; Body: { historyId: string } }>(
    '/:personId/restore',
    { preHandler: [requireTreeRole('editor')] },
    async (request, reply) => {
      const { historyId } = request.body;
      if (!historyId) throw createAppError('VALIDATION_ERROR', 'historyId is required', 400);
      const { db } = getDb();

      const [entry] = await db
        .select()
        .from(editHistory)
        .where(
          and(
            eq(editHistory.id, historyId),
            eq(editHistory.entityId, request.params.personId),
            eq(editHistory.treeId, request.params.treeId),
          ),
        )
        .limit(1);

      if (!entry) throw createAppError('NOT_FOUND', 'History entry not found', 404);

      const restoreData: Record<string, unknown> = {};
      for (const [field, change] of Object.entries(
        entry.changedFields as Record<string, { before: unknown; after: unknown }>,
      )) {
        restoreData[field] = change.before;
      }

      const person = await personService.updatePerson(
        request.params.treeId,
        request.params.personId,
        request.user.sub,
        restoreData as UpdatePersonInput,
      );

      await db.insert(editHistory).values({
        treeId:        request.params.treeId,
        entityType:    'person',
        entityId:      request.params.personId,
        action:        'restore',
        changedFields: { restoredFromHistoryId: { before: null, after: historyId } },
        performedBy:   request.user.sub,
        note:          `Restored to state from ${entry.performedAt.toISOString()}`,
      });

      return reply.send({
        success: true,
        data: person,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Generate AI biography ───────────────────────────────────────────────────
  app.post<{ Params: { treeId: string; personId: string } }>(
    '/:personId/generate-bio',
    {
      preHandler: [requireTreeRole('contributor')],
      config: { rateLimit: { max: 5, timeWindow: '1h' } },
    },
    async (request, reply) => {
      const { treeId, personId } = request.params;
      const userId = request.user.sub;
      const tier   = request.user.tier;

      // AI bio generation is Plus/Pro only
      if (tier === 'free') {
        throw createAppError(
          'SUBSCRIPTION_REQUIRED',
          'AI biography generation requires a Plus or Pro subscription.',
          403,
        );
      }

      await aiBioQueue.add(
        'generate-bio',
        { personId, treeId, userId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      return reply.status(202).send({
        success: true,
        data: { message: 'Biography generation queued. You will be notified when ready.' },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
