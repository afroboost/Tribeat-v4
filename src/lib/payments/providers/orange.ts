import type { PaymentProviderAdapter, ProviderCreatePaymentInput, ProviderCreatePaymentResult, ProviderWebhookEvent } from './types';

export const orangeMoneyAdapter: PaymentProviderAdapter = {
  provider: 'ORANGE_MONEY',
  enabled() {
    return process.env.ENABLE_MOBILE_MONEY === 'true';
  },
  async createPayment(_input: ProviderCreatePaymentInput): Promise<ProviderCreatePaymentResult> {
    // TODO(Orange Money): integrate Orange Money API (payment request + callback).
    return { kind: 'instructions', message: 'Orange Money: intégration API TODO (transaction créée en PENDING).' };
  },
  async parseWebhook(body: unknown, _headers: Headers): Promise<ProviderWebhookEvent> {
    // TODO(Orange Money): verify signature and parse official webhook payload.
    const b = body as any;
    if (!b?.transactionId || !b?.status) throw new Error('Invalid Orange Money webhook payload');
    if (b.status === 'success') return { status: 'success', transactionId: String(b.transactionId), providerTxId: b.providerTxId ? String(b.providerTxId) : undefined };
    return { status: 'failed', transactionId: String(b.transactionId), providerTxId: b.providerTxId ? String(b.providerTxId) : undefined, reason: b.reason ? String(b.reason) : undefined };
  },
};

