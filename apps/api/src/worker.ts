/**
 * Worker process entrypoint.
 * Run separately from the API: `node dist/worker.js`
 * This allows independent scaling of background jobs.
 */
import { env } from './config/env.js';
import { startMediaWorker } from './workers/media.worker.js';
import { startEmailWorker } from './workers/email.worker.js';
import { startGedcomWorkers } from './workers/gedcom.worker.js';
import { startAiWorkers } from './workers/ai.worker.js';
import { startDataQualityWorker } from './workers/data-quality.worker.js';
import { startMediaDeletionWorker } from './workers/media-deletion.worker.js';
import { startCronJobs } from './workers/cron.js';
import { allQueues } from './workers/queues.js';
import { getRedis } from './lib/redis.js';
import pino from 'pino';

const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  }),
});

async function main() {
  logger.info('Starting RootLink worker process');

  const mediaWorker  = startMediaWorker();
  const emailWorker  = startEmailWorker();
  const { importWorker, exportWorker } = startGedcomWorkers();
  const { bioWorker, hintWorker }      = startAiWorkers();
  const qualityWorker = startDataQualityWorker();
  const deletionWorker = startMediaDeletionWorker();
  startCronJobs();

  const workers = [mediaWorker, emailWorker, importWorker, exportWorker, bioWorker, hintWorker, qualityWorker, deletionWorker];

  workers.forEach((w) => {
    w.on('completed', (job) => {
      logger.info({ queue: w.name, jobId: job.id }, 'Job completed');
    });
    w.on('failed', (job, err) => {
      logger.error({ queue: w.name, jobId: job?.id, err: err.message }, 'Job failed');
    });
  });

  logger.info(`${workers.length} workers started`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down workers`);
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all(allQueues.map((q) => q.close()));
    await getRedis().quit();
    logger.info('Worker process shut down cleanly');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error(err, 'Worker process crashed');
  process.exit(1);
});
