import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { cacheSet, cacheGet, getRedis } from '../lib/redis.js';
import { env } from '../config/env.js';
import {
  getAuthorizationUrl, generateOAuthState, connectAccount, isConnected, disconnectAccount,
} from '../services/familysearch.service.js';

const STATE_TTL_SECONDS = 600; // 10 minutes — long enough for a user to complete FamilySearch's login, short enough to bound a leaked/unused state value

export async function integrationRoutes(app: FastifyInstance) {
  // ── Start the connect flow ──────────────────────────────────────────────────
  //
  // Returns a URL rather than redirecting directly: the frontend calls this
  // as an authenticated fetch (so we know which RootLink user is
  // connecting), then does the actual browser navigation itself. The
  // callback below is a bare, unauthenticated browser redirect from
  // FamilySearch — it can't carry a JWT — so `state` doubles as both a CSRF
  // guard and the only way to recover which user initiated this.
  app.get('/familysearch/connect-url', { preHandler: [authenticate] }, async (request, reply) => {
    const state = generateOAuthState();
    await cacheSet(`fs_oauth_state:${state}`, request.user.sub, STATE_TTL_SECONDS);

    return reply.send({
      success: true,
      data: { url: getAuthorizationUrl(state) },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── OAuth callback ───────────────────────────────────────────────────────────
  //
  // Deliberately unauthenticated (FamilySearch redirects the bare browser
  // here, with no way to attach an Authorization header) and returns an
  // HTTP redirect back to the app, not JSON — this request never runs
  // inside the SPA's fetch/XHR layer.
  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/familysearch/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;
      const settingsUrl = `${env.APP_URL}/settings`;

      if (error || !code || !state) {
        return reply.redirect(`${settingsUrl}?familysearch=error`);
      }

      const userId = await cacheGet<string>(`fs_oauth_state:${state}`);
      if (!userId) {
        // Expired, already used, or forged — never proceed on a state we
        // don't recognize.
        return reply.redirect(`${settingsUrl}?familysearch=error`);
      }
      await getRedis().del(`fs_oauth_state:${state}`); // single-use

      try {
        await connectAccount(userId, code);
        return reply.redirect(`${settingsUrl}?familysearch=connected`);
      } catch {
        return reply.redirect(`${settingsUrl}?familysearch=error`);
      }
    },
  );

  // ── Status ───────────────────────────────────────────────────────────────────
  app.get('/familysearch/status', { preHandler: [authenticate] }, async (request, reply) => {
    const connected = await isConnected(request.user.sub);
    return reply.send({
      success: true,
      data: { connected },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  app.delete('/familysearch', { preHandler: [authenticate] }, async (request, reply) => {
    await disconnectAccount(request.user.sub);
    return reply.send({
      success: true,
      data: { disconnected: true },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });
}
