import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { twintAdapter } from '@/lib/payments/providers/twint';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

  if (!twintAdapter.enabled()) {
    return NextResponse.json({ error: 'Paiement indisponible' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const offerId = String(body?.offerId ?? '');
  if (!offerId) return NextResponse.json({ error: 'offerId requis' }, { status: 400 });

  const offer = await prisma.offer.findUnique({
    where: { id: offerId, isActive: true },
    include: { session: { select: { title: true } } },
  });
  if (!offer) return NextResponse.json({ error: 'Offre non trouvée ou inactive' }, { status: 404 });

  const transaction = await prisma.transaction.create({
    data: {
      userId: session.user.id,
      offerId: offer.id,
      amount: offer.price,
      currency: offer.currency,
      provider: 'TWINT',
      status: 'PENDING',
      metadata: {
        offerName: offer.name,
        sessionTitle: offer.session?.title || null,
        userEmail: session.user.email,
        provider: 'TWINT',
        note: 'TODO integrate TWINT API',
      },
    },
  });

  const payment = await twintAdapter.createPayment({
    transactionId: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    customerEmail: session.user.email,
    returnUrl: body?.originUrl ? `${String(body.originUrl)}/checkout/success?transaction_id=${transaction.id}` : null,
  });

  return NextResponse.json({ transactionId: transaction.id, payment }, { status: 202 });
}

