/**
 * API Route: Check Stripe Checkout Status
 * GET /api/checkout/status/[sessionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { stripe, isStripeEnabled } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    
    // 1. Vérifier authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }

    // 2. Vérifier Stripe (safe mode)
    if (!isStripeEnabled() || !stripe) {
      return NextResponse.json(
        { error: 'Stripe non configuré' },
        { status: 503 }
      );
    }

    // 3. Récupérer la session Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // 4. Récupérer la transaction locale
    const transaction = await prisma.transaction.findFirst({
      where: { providerTxId: sessionId },
      include: {
        offer: true,
        userAccess: true,
      },
    });

    // 5. Vérifier que l'utilisateur est propriétaire
    if (transaction && transaction.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // 6. Si paiement complété et pas encore traité
    if (
      checkoutSession.payment_status === 'paid' &&
      transaction &&
      transaction.status === 'PENDING'
    ) {
      // Mettre à jour la transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED' },
      });

      // Créer l'accès utilisateur si pas déjà fait
      if (!transaction.userAccess) {
        await prisma.userAccess.create({
          data: {
            userId: transaction.userId,
            offerId: transaction.offerId,
            sessionId: transaction.offer?.sessionId || null,
            transactionId: transaction.id,
            status: 'ACTIVE',
            grantedAt: new Date(),
          },
        });
      }
    }

    // 7. Retourner le statut
    return NextResponse.json({
      status: checkoutSession.status,
      paymentStatus: checkoutSession.payment_status,
      amountTotal: checkoutSession.amount_total,
      currency: checkoutSession.currency,
      transactionId: transaction?.id,
      accessGranted: checkoutSession.payment_status === 'paid',
    });

  } catch (error) {
    console.error('[CHECKOUT STATUS ERROR]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    );
  }
}
