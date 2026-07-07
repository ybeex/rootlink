import {
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  NotFound,
} from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { getDb, mediaAssets, trees, users } from '@rootlink/db';
import { eq, and, isNull, sql } from 'drizzle-orm';
import type { UploadMediaInput } from '@rootlink/shared';
import {
  ALLOWED_MIME_TYPES,
  SUBSCRIPTION_LIMITS,
  type MediaType,
} from '@rootlink/shared';
import { cacheDelPattern } from '../lib/redis.js';
import { createAppError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { getS3 } from '../lib/s3.js';
import { mediaProcessingQueue, mediaDeletionQueue } from '../workers/queues.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectMediaType(mimeType: string): MediaType | null {
  for (const [type, mimes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if ((mimes as readonly string[]).includes(mimeType)) {
      return type as MediaType;
    }
  }
  return null;
}

function buildStorageKey(treeId: string, mediaType: MediaType, filename: string): string {
  const ext = filename.split('.').pop() ?? 'bin';
  const hash = nanoid(16);
  return `trees/${treeId}/${mediaType}/${hash}.${ext}`;
}

export function getPublicUrl(storageKey: string): string {
  if (env.STORAGE_PUBLIC_URL) {
    return `${env.STORAGE_PUBLIC_URL}/${storageKey}`;
  }
  return `https://${env.STORAGE_BUCKET}.s3.${env.STORAGE_REGION}.amazonaws.com/${storageKey}`;
}

// ─── Media Service ────────────────────────────────────────────────────────────

export class MediaService {
  // ─── Generate presigned upload URL ────────────────────────────────────────

  async createPresignedUpload(
    treeId: string,
    userId: string,
    subscriptionTier: string,
    mimeType: string,
    fileSizeBytes: number,
    originalFilename: string,
    metadata: UploadMediaInput,
  ) {
    const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS]
      ?? SUBSCRIPTION_LIMITS.free;

    // Validate mime type
    const mediaType = detectMediaType(mimeType);
    if (!mediaType) {
      throw createAppError(
        'VALIDATION_ERROR',
        `Unsupported file type: ${mimeType}`,
        400,
      );
    }

    // Validate file size against subscription
    if (fileSizeBytes > limits.maxMediaSizeBytes) {
      const maxMb = Math.round(limits.maxMediaSizeBytes / 1024 / 1024);
      throw createAppError(
        'VALIDATION_ERROR',
        `File size exceeds the ${maxMb}MB limit for your plan.`,
        413,
      );
    }

    // Check media count limit
    const { db } = getDb();
    const [tree] = await db
      .select({ mediaCount: trees.mediaCount })
      .from(trees)
      .where(and(eq(trees.id, treeId), isNull(trees.deletedAt)))
      .limit(1);

    if (!tree) throw createAppError('TREE_NOT_FOUND', 'Tree not found', 404);

    if (tree.mediaCount >= limits.maxMediaAssets) {
      throw createAppError(
        'MEDIA_LIMIT_REACHED',
        `Your plan allows up to ${limits.maxMediaAssets} media assets. Upgrade for more storage.`,
        403,
      );
    }

    // Check user total storage
    const [userRow] = await db
      .select({ totalStorageUsedBytes: users.totalStorageUsedBytes })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRow && userRow.totalStorageUsedBytes + fileSizeBytes > limits.totalStorageBytes) {
      throw createAppError(
        'MEDIA_LIMIT_REACHED',
        'Storage quota exceeded. Delete unused files or upgrade your plan.',
        403,
      );
    }

    const storageKey = buildStorageKey(treeId, mediaType, originalFilename);
    const s3 = getS3();

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
        ContentType: mimeType,
        ContentLength: fileSizeBytes,
        Metadata: {
          treeId,
          uploadedBy: userId,
          mediaType,
        },
      }),
      { expiresIn: 900 }, // 15 minutes
    );

    // Create pending record
    const [asset] = await db
      .insert(mediaAssets)
      .values({
        treeId,
        uploadedBy: userId,
        type: mediaType,
        filename: originalFilename,
        mimeType,
        sizeBytes: fileSizeBytes,
        storageKey,
        caption: metadata.caption,
        taggedPersonIds: metadata.taggedPersonIds,
        dateTakenYear: metadata.dateTaken?.year ?? null,
        dateTakenMonth: metadata.dateTaken?.month ?? null,
        dateTakenDay: metadata.dateTaken?.day ?? null,
        processingStatus: 'awaiting_upload',
      })
      .returning({ id: mediaAssets.id });

    if (!asset) throw createAppError('INTERNAL_ERROR', 'Failed to create media record', 500);

    return {
      assetId: asset.id,
      uploadUrl,
      storageKey,
    };
  }

  // ─── Confirm upload complete (called after S3 upload) ─────────────────────

  async confirmUpload(assetId: string, treeId: string, subscriptionTier: string) {
    const { db } = getDb();

    const [asset] = await db
      .update(mediaAssets)
      .set({ processingStatus: 'processing' })
      .where(
        and(
          eq(mediaAssets.id, assetId),
          eq(mediaAssets.treeId, treeId),
          eq(mediaAssets.processingStatus, 'awaiting_upload'),
        ),
      )
      .returning();

    if (!asset) throw createAppError('MEDIA_NOT_FOUND', 'Media asset not found or already processed', 404);

    // ── Re-verify the actual uploaded object against what was validated at
    // presign time (audit fix #5). The presigned PUT URL's signature covers
    // Content-Type, but S3/MinIO presigned URLs commonly do NOT enforce
    // Content-Length — a client can PUT a larger object than the size that
    // was checked against subscription limits in createPresignedUpload().
    // HeadObject gives us the ground truth before we trust the upload.
    const s3 = getS3();
    let head: { ContentLength?: number; ContentType?: string };
    try {
      head = await s3.send(new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: asset.storageKey }));
    } catch (err) {
      if (err instanceof NotFound) {
        await this.rejectUpload(asset.id, asset.storageKey, null);
        throw createAppError(
          'VALIDATION_ERROR',
          'No file was found at the upload location. Upload may not have completed.',
          400,
        );
      }
      throw err;
    }

    const actualSize = head.ContentLength ?? 0;
    const actualType = head.ContentType ?? '';

    const limits = SUBSCRIPTION_LIMITS[subscriptionTier as keyof typeof SUBSCRIPTION_LIMITS]
      ?? SUBSCRIPTION_LIMITS.free;

    if (actualSize > limits.maxMediaSizeBytes) {
      const maxMb = Math.round(limits.maxMediaSizeBytes / 1024 / 1024);
      await this.rejectUpload(asset.id, asset.storageKey, asset.thumbnailKey);
      throw createAppError(
        'VALIDATION_ERROR',
        `Uploaded file (${Math.round(actualSize / 1024 / 1024)}MB) exceeds the ${maxMb}MB limit for your plan.`,
        413,
      );
    }

    // Content-Type SHOULD already match (it's part of the presigned
    // signature), but verify defensively — some S3-compatible backends or
    // proxy configurations may not enforce signed headers strictly.
    if (actualType && asset.mimeType && actualType.split(';')[0] !== asset.mimeType) {
      await this.rejectUpload(asset.id, asset.storageKey, asset.thumbnailKey);
      throw createAppError(
        'VALIDATION_ERROR',
        `Uploaded file type (${actualType}) does not match the declared type (${asset.mimeType}).`,
        400,
      );
    }

    // Magic-byte verification (audit finding S3): the HeadObject check above
    // only cross-checks two client-controlled values against each other —
    // it never inspects the actual file content. A client could declare
    // Content-Type: image/jpeg consistently at both the presign step and
    // the real PUT while uploading bytes that aren't a JPEG at all.
    // file-type reads the real magic-number signature from the object's
    // first few KB (fetched via a Range request, not the full file — cheap
    // even for a 200MB video) and we reject on a mismatch the same way a
    // size/header mismatch is already rejected above.
    //
    // ALLOWED_MIME_TYPES excludes SVG, which closes off the single most
    // common version of this vulnerability class (an SVG with embedded
    // <script>, served back as "an image"). This check closes the
    // remaining gap for the other allowed types, particularly `document`
    // (which accepts PDF alongside several image formats).
    const sniffRange = await s3.send(
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: asset.storageKey,
        Range: 'bytes=0-4100',
      }),
    );
    const sniffBytes = sniffRange.Body ? await sniffRange.Body.transformToByteArray() : new Uint8Array();
    const sniffed = await fileTypeFromBuffer(sniffBytes);

    if (!sniffed || sniffed.mime !== asset.mimeType) {
      await this.rejectUpload(asset.id, asset.storageKey, asset.thumbnailKey);
      throw createAppError(
        'VALIDATION_ERROR',
        sniffed
          ? `The uploaded file's actual content (${sniffed.mime}) does not match the declared type (${asset.mimeType}).`
          : `The uploaded file's content could not be verified as a valid ${asset.mimeType} file.`,
        400,
      );
    }

    // If the actual size differs from the client-declared size (but is
    // within limits), correct the stored value so storage-quota accounting
    // reflects reality rather than a value the client could have understated.
    const sizeBytes = actualSize > 0 ? actualSize : asset.sizeBytes;

    // Increment tree media count and user storage using the VERIFIED size
    await Promise.all([
      db
        .update(trees)
        .set({ mediaCount: sql`${trees.mediaCount} + 1` })
        .where(eq(trees.id, treeId)),
      db
        .update(users)
        .set({ totalStorageUsedBytes: sql`${users.totalStorageUsedBytes} + ${sizeBytes}` })
        .where(eq(users.id, asset.uploadedBy)),
      db
        .update(mediaAssets)
        .set({ sizeBytes })
        .where(eq(mediaAssets.id, asset.id)),
    ]);

    // Enqueue background processing (thumbnail, OCR, etc.)
    await mediaProcessingQueue.add(
      'process-media',
      { assetId: asset.id, treeId, storageKey: asset.storageKey, type: asset.type },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    );

    return { ...asset, sizeBytes };
  }

  /**
   * Removes a media asset that failed post-upload verification: deletes the
   * object(s) from storage (best-effort) and hard-deletes the placeholder DB
   * row, since it never counted toward quotas and shouldn't appear in listings.
   */
  private async rejectUpload(assetId: string, storageKey: string, thumbnailKey: string | null) {
    const { db } = getDb();

    await db.delete(mediaAssets).where(eq(mediaAssets.id, assetId));

    const keysToDelete = [storageKey, thumbnailKey].filter((k): k is string => !!k);
    await mediaDeletionQueue.add('delete-media', { storageKeys: keysToDelete });
  }

  // ─── Get presigned download URL ────────────────────────────────────────────

  async getDownloadUrl(storageKey: string, expiresIn = 3600, options: { forceDownload?: boolean } = {}): Promise<string> {
    // If using public CDN, return direct URL. Note: forceDownload has no
    // effect on this branch — a direct CDN URL carries no per-request
    // response-header override, so Content-Disposition there is whatever
    // the CDN/bucket's own static configuration sets. Confirm that
    // configuration separately if CDN delivery is enabled for document
    // assets.
    if (env.STORAGE_PUBLIC_URL) {
      return `${env.STORAGE_PUBLIC_URL}/${storageKey}`;
    }

    // Defaults to forcing a download (audit finding S3): a presigned GET is
    // the only control point the application has over how a browser
    // handles the response, since these URLs point directly at S3/MinIO,
    // not through this API. Without this, a maliciously-typed document
    // (see the magic-byte check in confirmUpload above) that somehow still
    // got this far would be served with whatever Content-Type ended up
    // stored, and some browsers render certain types inline by default.
    // Callers that genuinely need inline rendering — actual photos and
    // thumbnails — pass forceDownload: false explicitly.
    const forceDownload = options.forceDownload ?? true;

    const s3 = getS3();
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: storageKey,
        ...(forceDownload && { ResponseContentDisposition: 'attachment' }),
      }),
      { expiresIn },
    );
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteAsset(assetId: string, treeId: string, userId: string) {
    const { db } = getDb();

    const [asset] = await db
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.treeId, treeId)))
      .limit(1);

    if (!asset) throw createAppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);

    // Soft-delete DB record
    await db
      .update(mediaAssets)
      .set({ deletedAt: new Date() })
      .where(eq(mediaAssets.id, assetId));

    // Update counters
    await Promise.all([
      db
        .update(trees)
        .set({ mediaCount: sql`GREATEST(${trees.mediaCount} - 1, 0)` })
        .where(eq(trees.id, treeId)),
      db
        .update(users)
        .set({
          totalStorageUsedBytes: sql`GREATEST(${users.totalStorageUsedBytes} - ${asset.sizeBytes}, 0)`,
        })
        .where(eq(users.id, asset.uploadedBy)),
    ]);

    // Delete from storage via a retryable queue (audit finding B3). The
    // previous fire-and-forget `.catch()` here meant a single failed
    // attempt was unrecoverable: the DB row holding the only reference to
    // this storageKey gets hard-deleted by the 7-day cron regardless,
    // after which there is nothing left to retry against and the object
    // sits in the bucket, orphaned, forever.
    const keysToDelete = [asset.storageKey, asset.thumbnailKey].filter(
      (k): k is string => !!k,
    );
    await mediaDeletionQueue.add('delete-media', { storageKeys: keysToDelete });

    await cacheDelPattern(`media:${treeId}:*`);
  }
}
