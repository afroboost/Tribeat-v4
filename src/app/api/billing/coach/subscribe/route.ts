import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { stripe, isStripeEnabled } from '@/lib/stripe';

// Stripe-only foundation: starts a recurring monthly subscription checkout.
// Future providers (TWINT/MobileMoney) plug into the payment abstraction later.

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    if (!isStripeEnabled() || !stripe) {
      return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
    }

    const priceId = process.env.STRIPE_COACH_MONTHLY_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Subscription price not configured (STRIPE_COACH_MONTHLY_PRICE_ID)' },
        { status: 503 }
      );
    }

    const origin = request.headers.get('origin');
    if (!origin) return NextResponse.json({ error: 'Origin manquant' }, { status: 400 });

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/coach/dashboard?sub=success`,
      cancel_url: `${origin}/coach/dashboard?sub=cancel`,
      metadata: {
        kind: 'coach_subscription',
        userId: session.user.id,
        userEmail: session.user.email,
      },
    });

    if (!checkout.url) {
      return NextResponse.json({ error: 'Stripe checkout unavailable' }, { status: 503 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error('[BILLING][COACH][SUBSCRIBE] error', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

