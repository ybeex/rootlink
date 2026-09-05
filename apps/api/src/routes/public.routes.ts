import type { FastifyInstance } from 'fastify';
import { TreeService } from '../services/tree.service.js';
import { PersonService } from '../services/person.service.js';
import { searchPersonSchema } from '@rootlink/shared';
import { authenticateApiKey, requireApiKeyRateLimit, getTreePermission, hasMinimumRole } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';

// ─── Public API (Pro tier "API Access" feature) ────────────────────────────
//
// Deliberately a small, read-only surface for a first pass — no mutation
// endpoints. A public write API is a much larger security surface
// (idempotency, abuse potential) that deserves its own dedicated scoping
// pass, per the continuation plan. Every route here requires the 'read'
// scope (the only scope that currently exists) and is subject to a
// per-key rate limit (see requireApiKeyRateLimit).
//
// IMPORTANT: TreeService.getTree()/PersonService.listPersons()/getPerson()
// do NOT themselves check whether the calling user may access the given
// treeId — that check lives in the JWT-authenticated routes' preHandler
// (requireTreeRole/requireTreeViewAccess), which this namespace doesn't go
// through. Every route below re-implements that same check explicitly via
// getTreePermission() before calling into the service layer — skipping it
// would let any API key read any tree in the system by ID.
export async function publicApiRoutes(app: FastifyInstance) {
  const treeService = new TreeService();
  const personService = new PersonService();

  app.addHook('preHandler', authenticateApiKey);
  app.addHook('preHandler', requireApiKeyRateLimit);
  app.addHook('preHandler', async (request) => {
    if (!request.apiKeyAuth?.scopes.includes('read')) {
      throw createAppError('FORBIDDEN', "This API key does not have the 'read' scope", 403);
    }
  });

  // ── List the key owner's trees ──────────────────────────────────────────────
  app.get('/trees', async (request, reply) => {
    const trees = await treeService.listUserTrees(request.apiKeyAuth!.userId);
    return reply.send({
      success: true,
      data: trees,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Get one tree ─────────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string } }>('/trees/:treeId', async (request, reply) => {
    const { treeId } = request.params;
    const permission = await getTreePermission(request.apiKeyAuth!.userId, treeId);
    if (!permission || !hasMinimumRole(permission.role, 'viewer')) {
      throw createAppError('TREE_ACCESS_DENIED', 'Tree not found or access denied', 403);
    }

    const tree = await treeService.getTree(treeId, request.apiKeyAuth!.userId);
    return reply.send({
      success: true,
      data: tree,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── List persons in a tree ───────────────────────────────────────────────────
  app.get<{ Params: { treeId: string }; Querystring: Record<string, string> }>(
    '/trees/:treeId/persons',
    async (request, reply) => {
      const { treeId } = request.params;
      const permission = await getTreePermission(request.apiKeyAuth!.userId, treeId);
      if (!permission || !hasMinimumRole(permission.role, 'viewer')) {
        throw createAppError('TREE_ACCESS_DENIED', 'Tree not found or access denied', 403);
      }

      const parsed = searchPersonSchema.safeParse(request.query);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid query params', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      // Same as the JWT-authenticated (non-share-token) path in
      // persons.routes.ts: an API key acts as its owning user, never as an
      // anonymous share-token viewer, so redactLiving stays false and
      // privacy-level enforcement runs off the real viewerRole.
      const result = await personService.listPersons(treeId, parsed.data, {
        redactLiving: false,
        viewerRole: permission.role,
        isShareTokenViewer: false,
      });

      return reply.send({
        success: true,
        ...result,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Get one person ───────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string; personId: string } }>(
    '/trees/:treeId/persons/:personId',
    async (request, reply) => {
      const { treeId, personId } = request.params;
      const permission = await getTreePermission(request.apiKeyAuth!.userId, treeId);
      if (!permission || !hasMinimumRole(permission.role, 'viewer')) {
        throw createAppError('TREE_ACCESS_DENIED', 'Tree not found or access denied', 403);
      }

      const person = await personService.getPerson(treeId, personId, {
        redactLiving: false,
        viewerRole: permission.role,
        isShareTokenViewer: false,
      });

      return reply.send({
        success: true,
        data: person,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
