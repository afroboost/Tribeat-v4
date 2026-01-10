import type { PaymentProviderKey, StartCheckoutInput } from './types';
import { startStripeCheckout, handleStripeWebhook, isStripeProviderEnabled, isTwintProviderEnabled } from './providers/stripe';
import { startTwintCheckout, handleTwintWebhook } from './providers/twint';
import { startPaystackCheckout, handlePaystackWebhook, isMobileMoneyEnabled } from './providers/paystack';

export function isProviderEnabled(provider: PaymentProviderKey): boolean {
  switch (provider) {
    case 'STRIPE':
      return isStripeProviderEnabled();
    case 'TWINT':
      return isTwintProviderEnabled();
    case 'MOBILE_MONEY':
      return isMobileMoneyEnabled();
  }
}

export async function startCheckout(input: StartCheckoutInput) {
  switch (input.provider) {
    case 'STRIPE':
      return startStripeCheckout({ ...input, provider: 'STRIPE' });
    case 'TWINT':
      return startTwintCheckout({ ...input, provider: 'TWINT' });
    case 'MOBILE_MONEY':
      return startPaystackCheckout({ ...input, provider: 'MOBILE_MONEY' });
  }
}

export async function handleWebhook(provider: PaymentProviderKey, request: Request) {
  switch (provider) {
    case 'STRIPE':
      return handleStripeWebhook(request);
    case 'TWINT':
      return handleTwintWebhook(request);
    case 'MOBILE_MONEY':
      return handlePaystackWebhook(request);
  }
}

