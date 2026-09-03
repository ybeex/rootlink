import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { handleIdempotency } from '../lib/idempotency.js';
import {
  createDnaUploadUrl,
  confirmDnaUpload,
  listDnaKits,
  getDnaKit,
  deleteDnaKit,
  listMatchesForKit,
} from '../services/dna.service.js';

// Mirrors CreateDnaUploadInput in dna.service.ts — kept in sync manually
// since this project doesn't currently share zod schemas for DNA the way
// person/tree schemas live in @rootlink/shared (see continuation plan §2.1;
// no other DNA input schema existed to extend, so this follows
// billing.routes.ts's precedent of an inline schema for a single-route body
// rather than introducing a new shared-package export for one call site).
const uploadUrlSchema = z.object({
  label: z.string().min(1).max(200),
  provider: z.enum(['ancestrydna', '23andme', 'myheritage', 'ftdna', 'other']),
  fileSizeBytes: z.number().int().positive(),
  personId: z.string().uuid().optional().nullable(),
  treeId: z.string().uuid().optional().nullable(),
});

export async function dnaRoutes(app: FastifyInstance) {
  // ── Request a presigned upload URL for a new kit ────────────────────────────
  app.post('/kits/upload-url', { preHandler: [authenticate] }, async (request, reply) => {
    // A kit-creation call, same class of action as createPerson/createTree —
    // follows the same idempotency-key pattern so a retried upload-url
    // request (e.g. a flaky connection on the initial POST) doesn't create
    // a second orphaned kit row.
    await handleIdempotency(request, reply);
    if (reply.sent) return;

    const parsed = uploadUrlSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, {
        fields: formatZodError(parsed.error),
      });
    }

    const result = await createDnaUploadUrl(request.user.sub, request.user.tier, parsed.data);

    return reply.send({
      success: true,
      data: result,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Confirm the raw file actually landed in storage, enqueue processing ────
  app.post<{ Params: { kitId: string } }>(
    '/kits/:kitId/confirm',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await confirmDnaUpload(request.params.kitId, request.user.sub);
      return reply.send({
        success: true,
        data: { confirmed: true },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── List the caller's kits ──────────────────────────────────────────────────
  app.get('/kits', { preHandler: [authenticate] }, async (request, reply) => {
    const kits = await listDnaKits(request.user.sub);
    return reply.send({
      success: true,
      data: kits,
      requestId: request.id,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Get one kit ──────────────────────────────────────────────────────────────
  app.get<{ Params: { kitId: string } }>(
    '/kits/:kitId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const kit = await getDnaKit(request.params.kitId, request.user.sub);
      return reply.send({
        success: true,
        data: kit,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── Delete a kit (soft-delete row + best-effort S3 cleanup) ─────────────────
  app.delete<{ Params: { kitId: string } }>(
    '/kits/:kitId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      await deleteDnaKit(request.params.kitId, request.user.sub);
      return reply.send({
        success: true,
        data: { deleted: true },
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // ── List matches for a kit ──────────────────────────────────────────────────
  app.get<{ Params: { kitId: string } }>(
    '/kits/:kitId/matches',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const matches = await listMatchesForKit(request.params.kitId, request.user.sub);
      return reply.send({
        success: true,
        data: matches,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      });
    },
  );
}
