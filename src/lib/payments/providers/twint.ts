import type { StartCheckoutInput, StartCheckoutResult } from '../types';
import { startStripeCheckout, isTwintProviderEnabled, handleStripeWebhook } from './stripe';

// TWINT is implemented as a Stripe Checkout payment method.
// This keeps the provider abstraction while avoiding a fake "TWINT API" implementation.

export async function startTwintCheckout(input: StartCheckoutInput & { provider: 'TWINT' }): Promise<StartCheckoutResult> {
  if (!isTwintProviderEnabled()) throw new Error('TWINT disabled');
  return startStripeCheckout({ ...input, provider: 'TWINT' });
}

export async function handleTwintWebhook(request: Request) {
  // Same payload/signature as Stripe because TWINT rides on Stripe.
  return handleStripeWebhook(request);
}

export function isTwintEnabled() {
  return isTwintProviderEnabled();
}

