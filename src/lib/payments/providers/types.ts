import type { TransactionProvider } from '@prisma/client';

export type ProviderCreatePaymentInput = {
  transactionId: string;
  amount: number; // cents
  currency: string;
  customerEmail?: string | null;
  returnUrl?: string | null;
};

export type ProviderCreatePaymentResult =
  | { kind: 'redirect'; url: string }
  | { kind: 'instructions'; message: string };

export type ProviderWebhookEvent =
  | { status: 'success'; transactionId: string; providerTxId?: string }
  | { status: 'failed'; transactionId: string; providerTxId?: string; reason?: string };

export interface PaymentProviderAdapter {
  provider: TransactionProvider;
  enabled(): boolean;
  createPayment(input: ProviderCreatePaymentInput): Promise<ProviderCreatePaymentResult>;
  parseWebhook(body: unknown, headers: Headers): Promise<ProviderWebhookEvent>;
}

