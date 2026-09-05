import type { FastifyInstance } from 'fastify';
import { TreeService } from '../services/tree.service.js';
import {
  createTreeSchema,
  updateTreeSchema,
  inviteMemberSchema,
  type CreateTreeInput,
  type UpdateTreeInput,
  type InviteMemberInput,
} from '@rootlink/shared';
import { authenticate, requireTreeRole, requireTreeViewAccess } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';

export async function treeRoutes(app: FastifyInstance) {
  const treeService = new TreeService();

  // ─── List user's trees ────────────────────────────────────────────────────

  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const trees = await treeService.listUserTrees(request.user.sub);
    return reply.send({
      success: true,
      data: trees,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Get tree by share token (public) ─────────────────────────────────────

  app.get<{ Querystring: { token: string } }>('/shared', async (request, reply) => {
    const { token } = request.query;
    if (!token) throw createAppError('VALIDATION_ERROR', 'token is required', 400);
    const tree = await treeService.getTreeByShareToken(token);
    return reply.send({
      success: true,
      data: tree,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Accept invite ─────────────────────────────────────────────────────────

  app.post<{ Body: { inviteToken: string } }>(
    '/accept-invite',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { inviteToken } = request.body;
      if (!inviteToken) throw createAppError('VALIDATION_ERROR', 'inviteToken is required', 400);

      const result = await treeService.acceptInvite(inviteToken, request.user.sub);
      return reply.send({
        success: true,
        data: result,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Get one ──────────────────────────────────────────────────────────────

  app.get<{ Params: { treeId: string } }>(
    '/:treeId',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const tree = await treeService.getTree(request.params.treeId, request.user.sub);
      return reply.send({
        success: true,
        data: tree,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Timeline (§5.4) ──────────────────────────────────────────────────────

  app.get<{ Params: { treeId: string }; Querystring: { shareToken?: string } }>(
    '/:treeId/timeline',
    { preHandler: [requireTreeViewAccess()] },
    async (request, reply) => {
      const timeline = await treeService.getTimeline(request.params.treeId, {
        viewerRole: request.viewPermission?.role ?? null,
        isShareTokenViewer: request.viewPermission?.viaShareToken ?? false,
      });
      return reply.send({
        success: true,
        data: timeline,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Create ───────────────────────────────────────────────────────────────

  app.post<{ Body: CreateTreeInput }>(
    '/',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await handleIdempotency(request, reply);
      if (reply.sent) return;

      const parsed = createTreeSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      const tree = await treeService.createTree(request.user.sub, request.user.tier, parsed.data);

      return reply.status(201).send({
        success: true,
        data: tree,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Update ───────────────────────────────────────────────────────────────

  app.patch<{ Params: { treeId: string }; Body: UpdateTreeInput }>(
    '/:treeId',
    { preHandler: [requireTreeRole('admin')] },
    async (request, reply) => {
      const parsed = updateTreeSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      const tree = await treeService.updateTree(
        request.params.treeId,
        request.user.sub,
        parsed.data,
      );

      return reply.send({
        success: true,
        data: tree,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Delete ───────────────────────────────────────────────────────────────

  app.delete<{ Params: { treeId: string } }>(
    '/:treeId',
    { preHandler: [requireTreeRole('owner')] },
    async (request, reply) => {
      await treeService.deleteTree(request.params.treeId, request.user.sub);
      return reply.status(204).send();
    },
  );

  // ─── Members ──────────────────────────────────────────────────────────────

  app.post<{ Params: { treeId: string }; Body: InviteMemberInput }>(
    '/:treeId/members/invite',
    { preHandler: [requireTreeRole('admin')] },
    async (request, reply) => {
      await handleIdempotency(request, reply);
      if (reply.sent) return;

      const parsed = inviteMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
          fields: formatZodError(parsed.error),
        });
      }

      const result = await treeService.inviteMember(
        request.params.treeId,
        request.user.sub,
        parsed.data,
      );

      return reply.status(201).send({
        success: true,
        data: result,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  app.delete<{ Params: { treeId: string; userId: string } }>(
    '/:treeId/members/:userId',
    { preHandler: [requireTreeRole('admin')] },
    async (request, reply) => {
      await treeService.removeMember(request.params.treeId, request.params.userId);
      return reply.status(204).send();
    },
  );

  // ─── Share token ──────────────────────────────────────────────────────────

  app.post<{ Params: { treeId: string } }>(
    '/:treeId/share-token',
    { preHandler: [requireTreeRole('admin')] },
    async (request, reply) => {
      const token = await treeService.generateShareToken(request.params.treeId);
      return reply.send({
        success: true,
        data: { shareToken: token },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  app.delete<{ Params: { treeId: string } }>(
    '/:treeId/share-token',
    { preHandler: [requireTreeRole('admin')] },
    async (request, reply) => {
      await treeService.revokeShareToken(request.params.treeId);
      return reply.status(204).send();
    },
  );
}
