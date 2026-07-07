import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { createAppError, formatZodError } from '../lib/errors.js';
import { billingService } from '../services/billing.service.js';

const checkoutSchema = z.object({
  tier: z.enum(['plus', 'pro']),
});

export async function billingRoutes(app: FastifyInstance) {
  // ─── Create checkout session ─────────────────────────────────────────────

  app.post('/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createAppError('VALIDATION_ERROR', 'Invalid input', 400, { fields: formatZodError(parsed.error) });
    }

    const url = await billingService.createCheckoutSession(
      request.user.sub,
      request.user.email,
      parsed.data.tier,
    );

    return reply.send({ success: true, data: { url }, requestId: request.id, timestamp: new Date().toISOString() });
  });

  // ─── Create billing portal session ─────────────────────────────────────────

  app.post('/portal', { preHandler: [authenticate] }, async (request, reply) => {
    const url = await billingService.createPortalSession(request.user.sub);
    return reply.send({ success: true, data: { url }, requestId: request.id, timestamp: new Date().toISOString() });
  });

  // ─── Stripe webhook ─────────────────────────────────────────────────────────
  //
  // Registered in its own encapsulated sub-context so the raw-buffer
  // content-type parser below applies ONLY to this route, not to the rest
  // of the API (which needs normal parsed-JSON bodies everywhere else).
  // Stripe's signature is computed over the exact bytes it sent; Fastify's
  // default JSON parser would parse-then-the-handler-would-need-to-
  // re-serialize, and a re-serialized body is not byte-identical to the
  // original even when the content looks the same, which fails
  // verification. This route must NOT have the `authenticate` preHandler —
  // Stripe calls it directly with no user session, authenticated instead
  // by the signature itself.
  await app.register(async (webhookApp) => {
    webhookApp.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body);
    });

    webhookApp.post('/webhook', async (request, reply) => {
      const signature = request.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        throw createAppError('VALIDATION_ERROR', 'Missing Stripe-Signature header', 400);
      }

      await billingService.handleWebhookEvent(request.body as Buffer, signature);
      return reply.send({ received: true });
    });
  });
}
