import { NextRequest, NextResponse } from 'next/server';
import { orangeMoneyAdapter } from '@/lib/payments/providers/orange';
import { settleTransactionFromWebhook } from '@/lib/payments/settlement';

export async function POST(request: NextRequest) {
  if (!orangeMoneyAdapter.enabled()) {
    return NextResponse.json({ error: 'Paiement indisponible' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const evt = await orangeMoneyAdapter.parseWebhook(body, request.headers);

    const res = await settleTransactionFromWebhook({
      transactionId: evt.transactionId,
      status: evt.status,
      providerTxId: evt.providerTxId,
    });

    return NextResponse.json({ received: true, result: res });
  } catch (error) {
    console.error('[ORANGE WEBHOOK] Error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}

