import type { FastifyInstance } from 'fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { allQueues } from '../workers/queues.js';
import { requireAdmin } from '../middleware/auth.js';

/**
 * Mounts a Bull Board dashboard at /admin/queues, showing every queue
 * registered in workers/queues.ts — completed/active/waiting/failed counts,
 * each job's data and stack trace on failure, and a manual retry button.
 *
 * Closes audit finding P4: previously the only way to learn that, say, a
 * GEDCOM import job or a media-deletion job had permanently failed after
 * exhausting its retries was to read worker process logs directly. For a
 * solo founder running this without a log aggregation stack set up yet,
 * that's the difference between noticing a stuck job within a minute and
 * not noticing until a user complains weeks later.
 *
 * Gated by requireAdmin (see middleware/auth.ts) — this view exposes job
 * payloads across every tree on the instance, not just the requesting
 * user's own data, so admin status is checked fresh against the database
 * rather than trusted from a JWT claim.
 */
export async function registerBullBoard(app: FastifyInstance): Promise<void> {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: allQueues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  await app.register(
    async (adminApp) => {
      adminApp.addHook('onRequest', requireAdmin());
      await adminApp.register(serverAdapter.registerPlugin());
    },
    { prefix: '/admin/queues' },
  );
}
