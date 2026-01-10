/**
 * API Route: Stripe Webhook Handler
 * POST /api/webhooks/stripe
 * 
 * SÉCURISÉ: Vérification de signature Stripe obligatoire
 */

import { NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    const result = await handleWebhook('STRIPE', request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[STRIPE][WEBHOOK] Unhandled error', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
