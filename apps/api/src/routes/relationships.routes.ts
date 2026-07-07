import type { FastifyInstance } from 'fastify';
import { RelationshipService } from '../services/relationship.service.js';
import { createRelationshipSchema } from '@rootlink/shared';
import { requireTreeRole, requireTreeViewAccess } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';

export async function relationshipRoutes(app: FastifyInstance) {
  const svc = new RelationshipService();

  // List relationships for a tree
  app.get<{ Params: { treeId: string }; Querystring: { shareToken?: string } }>(
    '/',
    { preHandler: [requireTreeViewAccess()] },
    async (request, reply) => {
      const data = await svc.listByTree(request.params.treeId);
      return reply.send({ success: true, data, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // List relationships for a specific person
  app.get<{ Params: { treeId: string; personId: string } }>(
    '/person/:personId',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const data = await svc.listByPerson(request.params.treeId, request.params.personId);
      return reply.send({ success: true, data, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // Create
  app.post<{ Params: { treeId: string }; Body: unknown }>(
    '/',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      await handleIdempotency(request, reply);

      const parsed = createRelationshipSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      const rel = await svc.create(request.params.treeId, request.user.sub, parsed.data);
      return reply.status(201).send({ success: true, data: rel, requestId: request.id, timestamp: new Date().toISOString() });
    },
  );

  // Delete
  app.delete<{ Params: { treeId: string; relationshipId: string } }>(
    '/:relationshipId',
    { preHandler: [requireTreeRole('editor')] },
    async (request, reply) => {
      await svc.delete(request.params.treeId, request.params.relationshipId, request.user.sub);
      return reply.status(204).send();
    },
  );
}
