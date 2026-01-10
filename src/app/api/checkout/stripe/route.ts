/**
 * API Route: Create Stripe Checkout Session
 * POST /api/checkout/stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { validatePromoForOffer } from '@/lib/promos/promoService';

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

    // 2. Vérifier que Stripe est configuré
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json(
        { error: 'Stripe non configuré. Contactez l\'administrateur.' },
        { status: 503 }
      );
    }

    // 3. Parser la requête
    const body = await request.json();
    const { offerId, originUrl, promoCode } = body;

    if (!offerId || !originUrl) {
      return NextResponse.json(
        { error: 'offerId et originUrl requis' },
        { status: 400 }
      );
    }

    // 4. Récupérer l'offre depuis la DB (JAMAIS depuis le frontend)
    const offer = await prisma.offer.findUnique({
      where: { id: offerId, isActive: true },
      include: { session: { select: { title: true } } },
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'Offre non trouvée ou inactive' },
        { status: 404 }
      );
    }

    // 5. Promo (optional): validate once, no duplication
    let promo: any = null;
    let finalAmount = offer.price;
    let discountAmount = 0;
    if (promoCode) {
      const validation = await validatePromoForOffer({
        code: String(promoCode),
        userId: session.user.id,
        offer: { id: offer.id, price: offer.price, currency: offer.currency, sessionId: offer.sessionId },
      });
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      promo = { id: validation.promo.id, code: validation.promo.code, type: validation.promo.type };
      finalAmount = validation.finalAmount;
      discountAmount = validation.discountAmount;

      // FULL_FREE: bypass ALL payments (server-side)
      if (validation.promo.type === 'FULL_FREE') {
        await prisma.promoRedemption.create({
          data: {
            promoCodeId: validation.promo.id,
            userId: session.user.id,
            promoType: validation.promo.type,
            sessionId: validation.promo.sessionId ?? null,
            discountAmount,
            finalAmount: 0,
            currency: offer.currency,
          },
        });

        return NextResponse.json({
          bypassed: true,
          promo: { code: validation.promo.code, type: validation.promo.type },
          sessionId: offer.sessionId,
        });
      }
    }

    // 6. Créer la transaction PENDING en DB
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        offerId: offer.id,
        amount: finalAmount,
        currency: offer.currency,
        provider: 'STRIPE',
        status: 'PENDING',
        metadata: {
          offerName: offer.name,
          sessionTitle: offer.session?.title || null,
          userEmail: session.user.email,
          promo: promo
            ? {
                promoCodeId: promo.id,
                promoCode: promo.code,
                type: promo.type,
                originalAmount: offer.price,
                discountAmount,
                finalAmount,
              }
            : null,
        },
      },
    });

    // 7. Construire les URLs de redirection
    const successUrl = `${originUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${originUrl}/checkout/cancel`;

    // 8. Créer la Stripe Checkout Session (amount already discounted)
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: offer.currency.toLowerCase(),
            product_data: {
              name: offer.name,
              description: offer.description || undefined,
            },
            unit_amount: finalAmount, // Déjà en centimes (promo applied)
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: session.user.email || undefined,
      metadata: {
        transactionId: transaction.id,
        offerId: offer.id,
        userId: session.user.id,
      },
    });

    // 9. Mettre à jour la transaction avec l'ID Stripe
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { providerTxId: checkoutSession.id },
    });

    // 10. Retourner l'URL de checkout
    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      transactionId: transaction.id,
    });

  } catch (error) {
    console.error('[STRIPE CHECKOUT ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
