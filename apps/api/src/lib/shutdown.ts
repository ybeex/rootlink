import type { FastifyInstance } from 'fastify';
import { allQueues } from '../workers/queues.js';
import { closeWorkerRedis, getRedis } from './redis.js';

export function gracefulShutdown(app: FastifyInstance) {
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);

    try {
      // Stop accepting new connections
      await app.close();
      app.log.info('Fastify server closed');

      // Close queues
      await Promise.all(allQueues.map((q) => q.close()));
      app.log.info('BullMQ queues closed');

      // Close Redis
      await Promise.all([getRedis().quit(), closeWorkerRedis()]);
      app.log.info('Redis connections closed');

      process.exit(0);
    } catch (err) {
      app.log.error('Error during graceful shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    app.log.fatal({ err }, 'Uncaught exception — shutting down');
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ reason }, 'Unhandled promise rejection — shutting down');
    void shutdown('unhandledRejection');
  });
}
