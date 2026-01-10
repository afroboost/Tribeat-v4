export type PaymentProviderKey = 'STRIPE' | 'TWINT' | 'MOBILE_MONEY';

export interface StartCheckoutInput {
  offerId: string;
  provider: PaymentProviderKey;
  userId: string;
  userEmail: string;
  origin: string;
}

export interface StartCheckoutResult {
  checkoutUrl: string;
  providerReference: string;
}

