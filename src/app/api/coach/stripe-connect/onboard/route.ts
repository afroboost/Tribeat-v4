import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Coach requis' }, { status: 403 });
  }
  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const originUrl = body?.originUrl ? String(body.originUrl) : '';
  if (!originUrl) {
    return NextResponse.json({ error: 'originUrl requis' }, { status: 400 });
  }

  try {
    const coach = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, stripeConnectAccountId: true },
    });

    if (!coach) {
      return NextResponse.json({ error: 'Coach introuvable' }, { status: 404 });
    }

    const accountId =
      coach.stripeConnectAccountId ||
      (await (async () => {
        const acct = await stripe.accounts.create({
          type: 'express',
          email: coach.email,
          business_type: 'individual',
          metadata: { coachId: coach.id },
        });

        await prisma.user.update({
          where: { id: coach.id },
          data: { stripeConnectAccountId: acct.id },
        });

        return acct.id;
      })());

    const refreshUrl = `${originUrl}/coach/dashboard?connect=refresh`;
    const returnUrl = `${originUrl}/coach/dashboard?connect=return`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({ accountId, url: link.url });
  } catch (error) {
    console.error('[CONNECT ONBOARD] Error:', error);
    return NextResponse.json({ error: 'Erreur onboarding Connect' }, { status: 500 });
  }
}

