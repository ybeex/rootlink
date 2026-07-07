import cron from 'node-cron';
import { getDb, refreshTokens, idempotencyKeys, users, mediaAssets } from '@rootlink/db';
import { lt, and, isNotNull } from 'drizzle-orm';
import { mediaDeletionQueue } from './queues.js';
import pino from 'pino';

const logger = pino({ name: 'cron' });

export function startCronJobs() {
  // ── Every 15 minutes: purge expired refresh tokens ─────────────────────
  cron.schedule('*/15 * * * *', async () => {
    try {
      const { db } = getDb();
      const result = await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, new Date()))
        .returning({ id: refreshTokens.id });
      if (result.length > 0) {
        logger.info({ deleted: result.length }, 'Purged expired refresh tokens');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to purge refresh tokens');
    }
  });

  // ── Every hour: purge expired idempotency keys ──────────────────────────
  cron.schedule('0 * * * *', async () => {
    try {
      const { db } = getDb();
      const result = await db
        .delete(idempotencyKeys)
        .where(lt(idempotencyKeys.expiresAt, new Date()))
        .returning({ key: idempotencyKeys.key });
      if (result.length > 0) {
        logger.info({ deleted: result.length }, 'Purged expired idempotency keys');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to purge idempotency keys');
    }
  });

  // ── Daily at 03:00: hard-delete accounts soft-deleted >30 days ago ──────
  cron.schedule('0 3 * * *', async () => {
    try {
      const { db } = getDb();
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await db
        .delete(users)
        .where(and(isNotNull(users.deletedAt), lt(users.deletedAt, cutoff)))
        .returning({ id: users.id });

      if (result.length > 0) {
        logger.info({ deleted: result.length }, 'Hard-deleted expired accounts');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to hard-delete accounts');
    }
  });

  // ── Daily at 04:00: hard-delete media assets soft-deleted >7 days ago ───
  cron.schedule('0 4 * * *', async () => {
    try {
      const { db } = getDb();
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await db
        .delete(mediaAssets)
        .where(and(isNotNull(mediaAssets.deletedAt), lt(mediaAssets.deletedAt, cutoff)))
        .returning({ id: mediaAssets.id, storageKey: mediaAssets.storageKey, thumbnailKey: mediaAssets.thumbnailKey });

      if (result.length > 0) {
        // Safety-net re-enqueue, not the primary deletion path: deleteAsset()
        // already enqueues this at the moment of deletion. This guards
        // specifically against that original enqueue having silently
        // failed — once this row is gone, its storageKey is gone with it,
        // so this is the last point at which a backstop is still possible.
        for (const row of result) {
          const keys = [row.storageKey, row.thumbnailKey].filter((k): k is string => !!k);
          if (keys.length > 0) {
            await mediaDeletionQueue.add('delete-media', { storageKeys: keys }).catch((err: unknown) => {
              logger.error({ err, assetId: row.id }, 'Failed to enqueue backstop media deletion');
            });
          }
        }
        logger.info({ deleted: result.length }, 'Hard-deleted expired media records');
      }
    } catch (err) {
      logger.error({ err }, 'Failed to hard-delete media');
    }
  });

  logger.info('Cron jobs registered');
}
