/**
 * Stripe Configuration - Server-side only
 */

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const enableStripe = process.env.ENABLE_STRIPE === 'true';

if (enableStripe && (!stripeSecretKey || !stripePublishableKey)) {
  console.warn(
    '[STRIPE] ENABLE_STRIPE=true but STRIPE keys are missing. Stripe will be disabled.'
  );
}

export const stripe =
  enableStripe && stripeSecretKey && stripePublishableKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export function isStripeConfigured(): boolean {
  return !!stripe;
}

export function isStripeEnabled(): boolean {
  return enableStripe && !!stripe;
}

export function getStripePublishableKey(): string | null {
  return stripePublishableKey || null;
}
