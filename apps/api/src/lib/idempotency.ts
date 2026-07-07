import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb, idempotencyKeys } from '@rootlink/db';
import { eq, and, gt } from 'drizzle-orm';
import { createAppError } from './errors.js';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyContext {
  key: string;
  userId: string;
  capturedAt: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    _idempotency?: IdempotencyContext;
  }
}

/**
 * Registers the ONE, server-wide onSend hook responsible for persisting
 * idempotent responses. Call this exactly once during boot (see server.ts,
 * immediately after registerPlugins) — never per-request.
 *
 * BUG THIS REPLACES: the previous version of this file called
 * `request.server.addHook('onSend', ...)` from inside `handleIdempotency`
 * itself — which runs once per incoming request that carries an
 * X-Idempotency-Key header. Fastify's hook system expects hooks to be
 * registered during the boot/plugin phase, before the server starts
 * accepting traffic, not from within a request handler while already
 * listening. Every call added a brand-new hook that was never removed,
 * which is both a guaranteed-growing memory leak (one closure per request,
 * forever) and — because hook registration after listen() is outside what
 * Fastify's plugin/encapsulation lifecycle supports — the direct cause of
 * `createTree` and `createPerson` failing outright. Both routes call
 * handleIdempotency() with an authenticated user already attached to the
 * request; `register` also calls it, but at register time there is no
 * authenticated user yet, so the old code's early `if (!userId) return;`
 * guard meant register never reached the broken addHook line at all —
 * which is exactly why login/register appeared unaffected while
 * create-tree/create-person were not.
 */
export function registerIdempotencyHook(app: FastifyInstance): void {
  app.addHook('onSend', async (request, reply, payload) => {
    const ctx = request._idempotency;
    if (!ctx) return payload;

    try {
      const bodyObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const { db } = getDb();
      await db
        .insert(idempotencyKeys)
        .values({
          key: ctx.key,
          userId: ctx.userId,
          responseStatus: reply.statusCode,
          responseBody: bodyObj as Record<string, unknown>,
          expiresAt: new Date(ctx.capturedAt + IDEMPOTENCY_TTL_MS),
        })
        .onConflictDoNothing();
    } catch {
      // Non-fatal: a storage failure here must never break the response
      // that's already on its way out to the client.
    }
    return payload;
  });
}

/**
 * Call at the top of a mutating route handler. After awaiting this,
 * ALWAYS check `reply.sent` before continuing:
 *
 *   await handleIdempotency(request, reply);
 *   if (reply.sent) return;
 *
 * If `reply.sent` is true, a cached response from an earlier identical
 * request (same user, same X-Idempotency-Key, within 24h) was just replayed
 * — the rest of the handler must NOT run (it would create a second
 * tree/person and then attempt to send a second reply, which Fastify
 * rejects).
 */
export async function handleIdempotency(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const idempotencyKey = request.headers['x-idempotency-key'];
  if (!idempotencyKey || typeof idempotencyKey !== 'string') return;

  if (idempotencyKey.length > 64) {
    throw createAppError('VALIDATION_ERROR', 'X-Idempotency-Key must be 64 characters or fewer', 400);
  }

  const userId = request.user?.sub;
  if (!userId) return;

  const { db } = getDb();
  const now = new Date();

  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempotencyKey),
        eq(idempotencyKeys.userId, userId),
        gt(idempotencyKeys.expiresAt, now),
      ),
    )
    .limit(1);

  if (existing[0]) {
    void reply.header('X-Idempotency-Replayed', 'true');
    await reply.status(existing[0].responseStatus).send(existing[0].responseBody);
    return;
  }

  // Record key/user on the request itself; the single globally-registered
  // onSend hook picks this up once the handler finishes and the real
  // response is on its way out.
  request._idempotency = { key: idempotencyKey, userId, capturedAt: now.getTime() };
}
