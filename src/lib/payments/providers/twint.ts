import type { PaymentProviderAdapter, ProviderCreatePaymentInput, ProviderCreatePaymentResult, ProviderWebhookEvent } from './types';

export const twintAdapter: PaymentProviderAdapter = {
  provider: 'TWINT',
  enabled() {
    return process.env.ENABLE_TWINT === 'true';
  },
  async createPayment(_input: ProviderCreatePaymentInput): Promise<ProviderCreatePaymentResult> {
    // TODO(TWINT): integrate TWINT API to return a payment URL or QR payload.
    return { kind: 'instructions', message: 'TWINT: intégration API TODO (transaction créée en PENDING).' };
  },
  async parseWebhook(body: unknown, _headers: Headers): Promise<ProviderWebhookEvent> {
    // TODO(TWINT): verify signature and parse TWINT webhook payload.
    // Temporary adapter contract:
    // { transactionId: string, status: 'success'|'failed', providerTxId?: string, reason?: string }
    const b = body as any;
    if (!b?.transactionId || !b?.status) throw new Error('Invalid TWINT webhook payload');
    if (b.status === 'success') return { status: 'success', transactionId: String(b.transactionId), providerTxId: b.providerTxId ? String(b.providerTxId) : undefined };
    return { status: 'failed', transactionId: String(b.transactionId), providerTxId: b.providerTxId ? String(b.providerTxId) : undefined, reason: b.reason ? String(b.reason) : undefined };
  },
};

