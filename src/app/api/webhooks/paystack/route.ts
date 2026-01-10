import { NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    const result = await handleWebhook('MOBILE_MONEY', request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[PAYSTACK][WEBHOOK] Unhandled error', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

