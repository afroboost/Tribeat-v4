import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { startCheckout, isProviderEnabled } from '@/lib/payments';
import type { PaymentProviderKey } from '@/lib/payments/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const origin = request.headers.get('origin');
    if (!origin) {
      return NextResponse.json({ error: 'Origin manquant' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const offerId: string | undefined = body?.offerId;
    const provider: PaymentProviderKey | undefined = body?.provider;

    if (!offerId || !provider) {
      return NextResponse.json({ error: 'offerId et provider requis' }, { status: 400 });
    }

    if (!isProviderEnabled(provider)) {
      return NextResponse.json({ error: 'Paiement temporairement indisponible' }, { status: 503 });
    }

    try {
      const result = await startCheckout({
        offerId,
        provider,
        userId: session.user.id,
        userEmail: session.user.email,
        origin,
      });

      return NextResponse.json({ url: result.checkoutUrl, reference: result.providerReference });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Paiement temporairement indisponible';
      const isOfferMissing = message.toLowerCase().includes('offer');
      const status = isOfferMissing ? 404 : 503;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error('[CHECKOUT][START] Error', error);
    return NextResponse.json({ error: 'Erreur lors du démarrage du paiement' }, { status: 500 });
  }
}

