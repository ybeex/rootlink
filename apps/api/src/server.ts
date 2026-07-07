import Fastify from 'fastify';
import { env } from './config/env.js';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';
import { registerIdempotencyHook } from './lib/idempotency.js';
import { registerBullBoard } from './plugins/bull-board.js';
import { gracefulShutdown } from './lib/shutdown.js';
import { registerWebSocket } from './plugins/websocket.js';
import { startCronJobs } from './workers/cron.js';
import { startMediaWorker } from './workers/media.worker.js';
import { startEmailWorker } from './workers/email.worker.js';
import { startGedcomWorkers } from './workers/gedcom.worker.js';
import { startAiWorkers } from './workers/ai.worker.js';
import { startDataQualityWorker } from './workers/data-quality.worker.js';
import { startMediaDeletionWorker } from './workers/media-deletion.worker.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
      redact: ['req.headers.authorization', 'req.body.password', 'req.body.totpCode'],
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            requestId: request.id,
            ip: request.ip,
          };
        },
      },
    },
    genReqId: () => crypto.randomUUID(),
    trustProxy: env.RATE_LIMIT_TRUST_PROXY,
    bodyLimit: 1 * 1024 * 1024,
    maxParamLength: 200,
  });

  await registerPlugins(app);
  registerIdempotencyHook(app);
  await registerRoutes(app);
  await registerBullBoard(app);
  await registerWebSocket(app);

  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error, requestId: request.id }, 'Unhandled server error');
    }
    const response = {
      success: false,
      error: {
        code: (error as { code?: string }).code ?? 'SRV_001',
        message:
          env.NODE_ENV === 'production' && statusCode >= 500
            ? 'An internal error occurred'
            : (error.message ?? 'Unknown error'),
        ...(env.NODE_ENV === 'development' && statusCode >= 500 && { stack: error.stack }),
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    };
    return reply.status(statusCode).send(response);
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: { code: 'RES_001', message: `Route ${request.method} ${request.url} not found` },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`RootLink API listening on ${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Start background workers (only in non-test environments)
  if (env.NODE_ENV !== 'test') {
    startMediaWorker();
    startEmailWorker();
    startGedcomWorkers();
    startAiWorkers();
    startDataQualityWorker();
    startMediaDeletionWorker();
    startCronJobs();
    app.log.info('Background workers and cron jobs started');
  }

  gracefulShutdown(app);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
