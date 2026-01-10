import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { getCoachAvailableBalance } from '@/lib/ledger/ledgerService';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'Coach requis' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Number(body?.amount);
  const currency = body?.currency ? String(body.currency) : 'CHF';

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: 'amount (cents) invalide' }, { status: 400 });
  }

  try {
    const coachId = session.user.id;

    const payout = await prisma.$transaction(
      async (tx) => {
        // Ledger-derived available balance inside the same transaction for best effort safety.
        const available = await tx.ledgerEntry.aggregate({
          where: {
            currency,
            userId: coachId,
            type: { in: ['COACH_EARNING', 'PAYOUT'] },
          },
          _sum: { amount: true },
        });

        const availableAmount = available._sum.amount || 0;
        if (amount > availableAmount) {
          return { error: 'Solde insuffisant', available: availableAmount } as const;
        }

        const p = await tx.payout.create({
          data: {
            coachId,
            amount,
            currency,
            status: 'PENDING',
          },
        });

        // Immutable PAYOUT entry MUST be negative.
        await tx.ledgerEntry.create({
          data: {
            type: 'PAYOUT',
            amount: -amount,
            currency,
            userId: coachId,
            transactionId: null,
            payoutId: p.id,
          },
        });

        return { payout: p } as const;
      },
      // Best-effort deterministic behavior on Postgres
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if ('error' in payout) {
      return NextResponse.json(
        { error: payout.error, available: payout.available, requested: amount },
        { status: 400 }
      );
    }

    const availableAfter = await getCoachAvailableBalance(session.user.id, currency);
    return NextResponse.json({ payout: payout.payout, availableAfter }, { status: 201 });
  } catch (error) {
    // If a duplicate payout ledger relation happens, surface a clean response.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Demande déjà enregistrée' }, { status: 409 });
    }
    console.error('[PAYOUT REQUEST] Error:', error);
    return NextResponse.json({ error: 'Erreur lors de la demande' }, { status: 500 });
  }
}

