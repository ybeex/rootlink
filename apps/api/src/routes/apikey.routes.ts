import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/apikey.service.js';

const createApiKeySchema = z.object({
  label: z.string().min(1).max(200),
});

export async function apiKeyRoutes(app: FastifyInstance) {
  // ── Create a new key ─────────────────────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    await handleIdempotency(request, reply);
    if (reply.sent) return;

    const parsed = createApiKeySchema.safeParse(request.body);
    if (!parsed.success) {
      throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
        fields: formatZodError(parsed.error),
      });
    }

    const key = await createApiKey(request.user.sub, request.user.tier, parsed.data.label);

    return reply.send({
      success: true,
      data: key,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── List keys (never includes the plaintext key or its hash) ────────────────
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const keys = await listApiKeys(request.user.sub);
    return reply.send({
      success: true,
      data: keys,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Revoke a key ──────────────────────────────────────────────────────────────
  app.delete<{ Params: { keyId: string } }>(
    '/:keyId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await revokeApiKey(request.params.keyId, request.user.sub);
      return reply.send({
        success: true,
        data: { revoked: true },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
