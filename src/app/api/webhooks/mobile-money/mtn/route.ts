import { NextRequest, NextResponse } from 'next/server';
import { mtnMomoAdapter } from '@/lib/payments/providers/mtn';
import { settleTransactionFromWebhook } from '@/lib/payments/settlement';

export async function POST(request: NextRequest) {
  if (!mtnMomoAdapter.enabled()) {
    return NextResponse.json({ error: 'Paiement indisponible' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const evt = await mtnMomoAdapter.parseWebhook(body, request.headers);

    const res = await settleTransactionFromWebhook({
      transactionId: evt.transactionId,
      status: evt.status,
      providerTxId: evt.providerTxId,
    });

    return NextResponse.json({ received: true, result: res });
  } catch (error) {
    console.error('[MTN WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}

