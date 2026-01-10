import { NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/payments';

// TWINT rides on Stripe; we expose this endpoint for provider symmetry.
export async function POST(request: Request) {
  try {
    const result = await handleWebhook('TWINT', request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[TWINT][WEBHOOK] Unhandled error', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

