/**
 * Stripe Configuration - Server-side only
 */

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export function isStripeConfigured(): boolean {
  return !!stripe;
}
