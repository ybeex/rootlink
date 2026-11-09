import { Worker } from 'bullmq';
import sharp from 'sharp';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getWorkerRedis } from '../lib/redis.js';
import { getDb, mediaAssets } from '@rootlink/db';
import { eq } from 'drizzle-orm';
import { QUEUE_NAMES, THUMBNAIL_SIZES } from '@rootlink/shared';
import { env } from '../config/env.js';
import type { MediaProcessingJob } from './queues.js';

const PHOTO_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/heic', 'image/heif']);

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export function startMediaWorker() {
  const s3 = new S3Client({
    region: env.STORAGE_REGION,
    ...(env.STORAGE_ENDPOINT && { endpoint: env.STORAGE_ENDPOINT }),
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!env.STORAGE_ENDPOINT,
  });

  return new Worker<MediaProcessingJob>(
    QUEUE_NAMES.mediaProcessing,
    async (job) => {
      const { assetId, treeId, storageKey, type } = job.data;
      const { db } = getDb();

      job.log(`Processing ${type} asset ${assetId}`);

      // Fetch original from S3
      const getCmd = new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
      });

      const s3Obj = await s3.send(getCmd);
      if (!s3Obj.Body) throw new Error('Empty S3 object body');

      const originalBuffer = await streamToBuffer(s3Obj.Body as NodeJS.ReadableStream);

      let thumbnailKey: string | undefined;
      let width: number | undefined;
      let height: number | undefined;
      let durationSeconds: number | undefined;

      if (type === 'photo' && PHOTO_MIME_TYPES.has(s3Obj.ContentType ?? '')) {
        // ─── Generate thumbnails ─────────────────────────────────────────────
        const image = sharp(originalBuffer);
        const meta = await image.metadata();
        width = meta.width;
        height = meta.height;

        // Generate medium thumbnail (400x400 contain)
        const thumbnailBuffer = await image
          .rotate() // Auto-rotate from EXIF
          .resize(THUMBNAIL_SIZES.medium.width, THUMBNAIL_SIZES.medium.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();

        thumbnailKey = storageKey.replace(/\.[^.]+$/, '_thumb.webp');

        await s3.send(
          new PutObjectCommand({
            Bucket: env.STORAGE_BUCKET,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/webp',
          }),
        );

        // Also generate small thumb for tree nodes
        const smallThumbBuffer = await sharp(originalBuffer)
          .rotate()
          .resize(THUMBNAIL_SIZES.small.width, THUMBNAIL_SIZES.small.height, {
            fit: 'cover',
            position: 'attention', // Smart crop
          })
          .webp({ quality: 80 })
          .toBuffer();

        const smallThumbKey = storageKey.replace(/\.[^.]+$/, '_thumb_sm.webp');
        await s3.send(
          new PutObjectCommand({
            Bucket: env.STORAGE_BUCKET,
            Key: smallThumbKey,
            Body: smallThumbBuffer,
            ContentType: 'image/webp',
          }),
        );

        job.log(`Generated thumbnails: ${thumbnailKey}, ${smallThumbKey}`);
      }

      // Update DB record with processed data
      await db
        .update(mediaAssets)
        .set({
          processingStatus: 'complete',
          thumbnailKey: thumbnailKey ?? null,
          width: width ?? null,
          height: height ?? null,
          durationSeconds: durationSeconds ?? null,
        })
        .where(eq(mediaAssets.id, assetId));

      job.log(`Asset ${assetId} processing complete`);
    },
    {
      connection: getWorkerRedis(),
      concurrency: 5,
    },
  );
}
