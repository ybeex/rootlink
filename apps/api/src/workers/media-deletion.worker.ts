import { Worker } from 'bullmq';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getRedis } from '../lib/redis.js';
import { getS3 } from '../lib/s3.js';
import { env } from '../config/env.js';
import { QUEUE_NAMES, type MediaDeletionJob } from '@rootlink/shared';
import pino from 'pino';

const logger = pino({ name: 'media-deletion-worker' });

export function startMediaDeletionWorker() {
  return new Worker<MediaDeletionJob>(
    QUEUE_NAMES.mediaDeletion,
    async (job) => {
      const s3 = getS3();
      const { storageKeys } = job.data;

      for (const key of storageKeys) {
        // DeleteObjectCommand is idempotent — deleting an already-gone key
        // succeeds as a no-op rather than erroring, so retrying the whole
        // job after a partial failure (e.g. the original succeeded but the
        // thumbnail delete failed) never throws on the keys that already
        // went through.
        await s3.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
      }

      logger.info({ jobId: job.id, count: storageKeys.length }, 'Deleted media object(s) from storage');
    },
    {
      connection: getRedis(),
      concurrency: 5,
    },
  ).on('failed', (job, err) => {
    // After all of BullMQ's configured attempts (3, exponential backoff —
    // see createQueue() in queues.ts) are exhausted, this is logged rather
    // than silently dropped. The job's data (including storageKeys) is
    // preserved in the dead-letter set per removeOnFail's age window,
    // giving an operator something to act on rather than nothing.
    logger.error({ jobId: job?.id, storageKeys: job?.data.storageKeys, err }, 'Media deletion permanently failed after all retries');
  });
}
