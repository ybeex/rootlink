import Stripe from 'stripe';
import { getDb, users } from '@rootlink/db';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { createAppError } from '../lib/errors.js';
import { emailQueue } from '../workers/queues.js';

type PaidTier = 'plus' | 'pro';

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw createAppError(
      'VALIDATION_ERROR',
      'Billing is not configured on this instance yet. Set STRIPE_SECRET_KEY to enable it.',
      503,
    );
  }
  _stripe ??= new Stripe(env.STRIPE_SECRET_KEY);
  return _stripe;
}

function priceIdForTier(tier: PaidTier): string {
  const id = tier === 'plus' ? env.STRIPE_PRICE_ID_PLUS : env.STRIPE_PRICE_ID_PRO;
  if (!id) {
    throw createAppError(
      'VALIDATION_ERROR',
      `No Stripe price is configured for the ${tier} tier (set STRIPE_PRICE_ID_${tier.toUpperCase()}).`,
      503,
    );
  }
  return id;
}

function tierForPriceId(priceId: string): PaidTier | null {
  if (priceId === env.STRIPE_PRICE_ID_PLUS) return 'plus';
  if (priceId === env.STRIPE_PRICE_ID_PRO) return 'pro';
  return null;
}

/**
 * Subscription items carry their own billing period as of Stripe API
 * version 2025-03-31 ("basil") — the subscription-level current_period_end
 * field this integration might otherwise reach for first is deprecated.
 * RootLink subscriptions are always exactly one item (one price per user),
 * so the first item's period is the only one that matters here.
 */
function currentPeriodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items.data[0];
  return item ? new Date(item.current_period_end * 1000) : null;
}

export class BillingService {
  /** Creates a Stripe Checkout session for a tier upgrade. Returns the URL to redirect the user to. */
  async createCheckoutSession(userId: string, email: string, tier: PaidTier): Promise<string> {
    const stripe = getStripe();
    const priceId = priceIdForTier(tier);

    const { db } = getDb();
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the existing Stripe customer if this user has one (e.g.
      // upgrading again, or re-subscribing after a cancellation) so
      // payment history stays attached to a single customer record rather
      // than fragmenting across multiple Stripe customers per person.
      ...(user?.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: email }),
      client_reference_id: userId,
      success_url: `${env.APP_URL}/settings?billing=success`,
      cancel_url: `${env.APP_URL}/settings?billing=canceled`,
      subscription_data: { metadata: { userId, tier } },
      metadata: { userId, tier },
    });

    if (!session.url) {
      throw createAppError('VALIDATION_ERROR', 'Stripe did not return a checkout URL.', 502);
    }
    return session.url;
  }

  /** Creates a Stripe Billing Portal session so a user can update payment method, change plan, or cancel. */
  async createPortalSession(userId: string): Promise<string> {
    const stripe = getStripe();
    const { db } = getDb();
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.stripeCustomerId) {
      throw createAppError(
        'VALIDATION_ERROR',
        'No billing account exists for this user yet — upgrade to a paid plan first.',
        400,
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.APP_URL}/settings`,
    });
    return session.url;
  }

  /**
   * Verifies and processes a Stripe webhook event. Callers MUST pass the
   * exact raw request bytes (not a re-serialized/re-parsed body) — Stripe's
   * signature covers the literal bytes it sent, and re-serializing JSON
   * (even with identical-looking content) produces a different byte
   * sequence that fails verification.
   */
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = getStripe();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw createAppError('VALIDATION_ERROR', 'STRIPE_WEBHOOK_SECRET is not configured.', 503);
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw createAppError('VALIDATION_ERROR', 'Invalid webhook signature.', 400);
    }

    const { db } = getDb();

    switch (event.type) {
      // Fires once, right after a successful checkout. The immediately
      // following customer.subscription.created/updated event (handled
      // below) carries the authoritative period end; this handler's job is
      // just to flip the tier and attach the Stripe customer ID without
      // waiting on that second event to arrive.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const tier = session.metadata?.tier as PaidTier | undefined;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        if (!userId || !tier || !customerId) break;

        await db
          .update(users)
          .set({ stripeCustomerId: customerId, subscriptionTier: tier })
          .where(eq(users.id, userId));
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const priceId = sub.items.data[0]?.price.id;
        const tier = priceId ? tierForPriceId(priceId) : null;
        if (!userId || !tier) break;

        const isActive = sub.status === 'active' || sub.status === 'trialing';
        await db
          .update(users)
          .set({
            subscriptionTier: isActive ? tier : 'free',
            subscriptionExpiresAt: currentPeriodEnd(sub),
          })
          .where(eq(users.id, userId));
        break;
      }

      // Subscription fully ended (canceled immediately, or ran out a
      // cancel-at-period-end window). Distinct from a payment merely
      // failing — Stripe retries failed payments for a configurable window
      // before the subscription actually reaches this state.
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await db
          .update(users)
          .set({ subscriptionTier: 'free', subscriptionExpiresAt: null })
          .where(eq(users.id, userId));
        break;
      }

      // Does not change tier by itself — Stripe's own retry schedule
      // handles that escalation, eventually reaching
      // customer.subscription.deleted above if every retry fails. This
      // just gets a heads-up to the user via the existing email queue
      // rather than leaving the first they hear of it be a sudden downgrade.
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        const [user] = await db
          .select({ email: users.email, firstName: users.firstName })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .limit(1);
        if (!user) break;

        await emailQueue.add('payment-failed', {
          to: user.email,
          subject: 'There was a problem with your RootLink payment',
          templateId: 'payment-failed',
          templateData: { firstName: user.firstName },
        });
        break;
      }

      default:
        break;
    }
  }
}

export const billingService = new BillingService();
