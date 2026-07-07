import type { FastifyInstance } from 'fastify';
import { MediaService } from '../services/media.service.js';
import { uploadMediaSchema, paginationSchema } from '@rootlink/shared';
import { requireTreeRole } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { getDb, mediaAssets } from '@rootlink/db';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function mediaRoutes(app: FastifyInstance) {
  const mediaService = new MediaService();

  // ─── List media ───────────────────────────────────────────────────────────

  app.get<{ Params: { treeId: string }; Querystring: Record<string, string> }>(
    '/',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const pagination = paginationSchema.parse(request.query);
      const { db } = getDb();

      const assets = await db
        .select()
        .from(mediaAssets)
        .where(and(eq(mediaAssets.treeId, request.params.treeId), isNull(mediaAssets.deletedAt)))
        .orderBy(desc(mediaAssets.createdAt))
        .limit(pagination.pageSize)
        .offset((pagination.page - 1) * pagination.pageSize);

      // Resolve URLs
      const withUrls = await Promise.all(
        assets.map(async (a) => ({
          ...a,
          url: await mediaService.getDownloadUrl(a.storageKey, 3600, { forceDownload: a.type !== 'photo' }),
          thumbnailUrl: a.thumbnailKey
            ? await mediaService.getDownloadUrl(a.thumbnailKey, 3600, { forceDownload: false })
            : null,
        })),
      );

      return reply.send({
        success: true,
        data: withUrls,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Request presigned upload URL ─────────────────────────────────────────

  app.post<{
    Params: { treeId: string };
    Body: {
      mimeType: string;
      fileSizeBytes: number;
      filename: string;
      metadata: Record<string, unknown>;
    };
  }>(
    '/upload-url',
    {
      preHandler: [requireTreeRole('contributor')],
      config: { rateLimit: { max: 20, timeWindow: '1h' } },
    },
    async (request, reply) => {
      const { mimeType, fileSizeBytes, filename, metadata } = request.body;

      if (!mimeType || !fileSizeBytes || !filename) {
        throw createAppError('VALIDATION_ERROR', 'mimeType, fileSizeBytes, and filename are required', 400);
      }

      const parsedMetadata = uploadMediaSchema.safeParse(metadata ?? {});
      if (!parsedMetadata.success) {
        throw createAppError('VALIDATION_ERROR', 'Invalid metadata', 400, {
          fields: formatZodError(parsedMetadata.error),
        });
      }

      const result = await mediaService.createPresignedUpload(
        request.params.treeId,
        request.user.sub,
        request.user.tier,
        mimeType,
        fileSizeBytes,
        filename,
        parsedMetadata.data,
      );

      return reply.status(201).send({
        success: true,
        data: result,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Confirm upload ───────────────────────────────────────────────────────

  app.post<{ Params: { treeId: string }; Body: { assetId: string } }>(
    '/confirm-upload',
    { preHandler: [requireTreeRole('contributor')] },
    async (request, reply) => {
      const { assetId } = request.body;
      if (!assetId) throw createAppError('VALIDATION_ERROR', 'assetId is required', 400);

      const asset = await mediaService.confirmUpload(assetId, request.params.treeId, request.user.tier);

      return reply.send({
        success: true,
        data: asset,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Get one ──────────────────────────────────────────────────────────────

  app.get<{ Params: { treeId: string; assetId: string } }>(
    '/:assetId',
    { preHandler: [requireTreeRole('viewer')] },
    async (request, reply) => {
      const { db } = getDb();
      const [asset] = await db
        .select()
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, request.params.assetId),
            eq(mediaAssets.treeId, request.params.treeId),
            isNull(mediaAssets.deletedAt),
          ),
        )
        .limit(1);

      if (!asset) throw createAppError('MEDIA_NOT_FOUND', 'Media asset not found', 404);

      const url = await mediaService.getDownloadUrl(asset.storageKey, 3600, { forceDownload: asset.type !== 'photo' });
      const thumbnailUrl = asset.thumbnailKey
        ? await mediaService.getDownloadUrl(asset.thumbnailKey, 3600, { forceDownload: false })
        : null;

      return reply.send({
        success: true,
        data: { ...asset, url, thumbnailUrl },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ─── Delete ───────────────────────────────────────────────────────────────

  app.delete<{ Params: { treeId: string; assetId: string } }>(
    '/:assetId',
    { preHandler: [requireTreeRole('editor')] },
    async (request, reply) => {
      await mediaService.deleteAsset(
        request.params.assetId,
        request.params.treeId,
        request.user.sub,
      );
      return reply.status(204).send();
    },
  );
}
