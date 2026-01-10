import type { PaymentProviderAdapter, ProviderCreatePaymentInput, ProviderCreatePaymentResult, ProviderWebhookEvent } from './types';

export const mtnMomoAdapter: PaymentProviderAdapter = {
  provider: 'MTN_MOMO',
  enabled() {
    return process.env.ENABLE_MOBILE_MONEY === 'true';
  },
  async createPayment(_input: ProviderCreatePaymentInput): Promise<ProviderCreatePaymentResult> {
    // TODO(MTN MoMo): integrate MTN collection API (requestToPay / callback URL).
    return { kind: 'instructions', message: 'MTN MoMo: intégration API TODO (transaction créée en PENDING).' };
  },
  async parseWebhook(body: unknown, _headers: Headers): Promise<ProviderWebhookEvent> {
    // TODO(MTN MoMo): verify signature and parse official webhook payload.
    const b = body as any;
    if (!b?.transactionId || !b?.status) throw new Error('Invalid MTN webhook payload');
    if (b.status === 'success') return { status: 'success', transactionId: String(b.transactionId), providerTxId: b.providerTxId ? String(b.providerTxId) : undefined };
    return { status: 'failed', transactionId: String(b.transactionId), providerTxId: b.providerTxId ? String(b.providerTxId) : undefined, reason: b.reason ? String(b.reason) : undefined };
  },
};

