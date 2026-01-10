/**
 * API Route: Create Stripe Checkout Session
 * POST /api/checkout/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { startCheckout, isProviderEnabled } from '@/lib/payments';

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    // Deprecated endpoint kept for backward compatibility.
    // Prefer POST /api/checkout/start
    if (!isProviderEnabled('STRIPE')) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
    }

    const origin = request.headers.get('origin');
    if (!origin) {
      return NextResponse.json({ error: 'Origin manquant' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const offerId = body?.offerId as string | undefined;
    if (!offerId) {
      return NextResponse.json({ error: 'offerId requis' }, { status: 400 });
    }

    const result = await startCheckout({
      offerId,
      provider: 'STRIPE',
      userId: session.user.id,
      userEmail: session.user.email || '',
      origin,
    });

    return NextResponse.json({ url: result.checkoutUrl, reference: result.providerReference });

  } catch (error) {
    console.error('[STRIPE CHECKOUT ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
