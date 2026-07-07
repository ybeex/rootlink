import type { FastifyInstance } from 'fastify';
import { getDb, sources } from '@rootlink/db';
import { eq, and, desc } from 'drizzle-orm';
import { createSourceSchema, paginationSchema } from '@rootlink/shared';
import { requireTreeRole } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';

export async function sourceRoutes(app: FastifyInstance) {
  // ── List sources for a tree ────────────────────────────────────────────
  app.get<{ Params: { treeId: string }; Querystring: Record<string, string> }>(
    '/',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const { page, pageSize } = paginationSchema.parse(request.query);
      const { db } = getDb();

      const rows = await db
        .select()
        .from(sources)
        .where(eq(sources.treeId, request.params.treeId))
        .orderBy(desc(sources.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return reply.send({
        success: true,
        data: rows,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Get one ────────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string; sourceId: string } }>(
    '/:sourceId',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const { db } = getDb();
      const [source] = await db
        .select()
        .from(sources)
        .where(and(eq(sources.id, request.params.sourceId), eq(sources.treeId, request.params.treeId)))
        .limit(1);

      if (!source) throw createAppError('NOT_FOUND', 'Source not found', 404);

      return reply.send({ success: true, data: source, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // ── Create ─────────────────────────────────────────────────────────────
  app.post<{ Params: { treeId: string }; Body: unknown }>(
    '/',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      await handleIdempotency(request, reply);

      const parsed = createSourceSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      const { db } = getDb();
      const [source] = await db
        .insert(sources)
        .values({
          treeId:         request.params.treeId,
          type:           parsed.data.type,
          title:          parsed.data.title,
          repository:     parsed.data.repository,
          repositoryUrl:  parsed.data.repositoryUrl,
          transcription:  parsed.data.transcription,
          notes:          parsed.data.notes,
          confidence:     parsed.data.confidence,
          publishedYear:  parsed.data.publishedDate?.year ?? null,
          createdBy:      request.user.sub,
        })
        .returning();

      return reply.status(201).send({ success: true, data: source, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // ── Update ─────────────────────────────────────────────────────────────
  app.patch<{ Params: { treeId: string; sourceId: string }; Body: unknown }>(
    '/:sourceId',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      const parsed = createSourceSchema.partial().safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      const { db } = getDb();
      const [updated] = await db
        .update(sources)
        .set({
          ...(parsed.data.title       !== undefined && { title:          parsed.data.title }),
          ...(parsed.data.repository  !== undefined && { repository:     parsed.data.repository }),
          ...(parsed.data.repositoryUrl !== undefined && { repositoryUrl: parsed.data.repositoryUrl }),
          ...(parsed.data.transcription !== undefined && { transcription: parsed.data.transcription }),
          ...(parsed.data.notes       !== undefined && { notes:          parsed.data.notes }),
          ...(parsed.data.confidence  !== undefined && { confidence:     parsed.data.confidence }),
        })
        .where(and(eq(sources.id, request.params.sourceId), eq(sources.treeId, request.params.treeId)))
        .returning();

      if (!updated) throw createAppError('NOT_FOUND', 'Source not found', 404);

      return reply.send({ success: true, data: updated, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // ── Delete ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { treeId: string; sourceId: string } }>(
    '/:sourceId',
    { preHandler: [requireTreeRole('editor')] },
    async (request, reply) => {
      const { db } = getDb();
      const [deleted] = await db
        .delete(sources)
        .where(and(eq(sources.id, request.params.sourceId), eq(sources.treeId, request.params.treeId)))
        .returning({ id: sources.id });

      if (!deleted) throw createAppError('NOT_FOUND', 'Source not found', 404);

      return reply.status(204).send();
    },
  );
}
