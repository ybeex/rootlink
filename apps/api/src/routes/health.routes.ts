import type { FastifyInstance } from 'fastify';
import { getDb } from '@rootlink/db';
import { getRedis } from '../lib/redis.js';
import { sql } from 'drizzle-orm';

export async function healthRoutes(app: FastifyInstance) {
  // Liveness — is the process alive?
  app.get('/live', { logLevel: 'silent' }, async (_req, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness — can the process serve traffic?
  app.get('/ready', { logLevel: 'silent' }, async (_req, reply) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    // Check DB
    try {
      const { db } = getDb();
      await db.execute(sql`SELECT 1`);
      checks['database'] = 'ok';
    } catch {
      checks['database'] = 'error';
    }

    // Check Redis
    try {
      const redis = getRedis();
      await redis.ping();
      checks['redis'] = 'ok';
    } catch {
      checks['redis'] = 'error';
    }

    const allOk = Object.values(checks).every((s) => s === 'ok');
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  // Version info
  app.get('/version', { logLevel: 'silent' }, async (_req, reply) => {
    return reply.send({
      name: 'rootlink-api',
      version: '1.0.0',
      environment: process.env['NODE_ENV'] ?? 'development',
      uptime: Math.floor(process.uptime()),
    });
  });
}
