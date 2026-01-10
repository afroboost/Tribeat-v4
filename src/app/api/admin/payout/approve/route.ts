import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const payoutId = String(body?.payoutId ?? '');
  if (!payoutId) {
    return NextResponse.json({ error: 'payoutId requis' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { id: payoutId },
        include: { ledgerEntry: true },
      });

      if (!payout) return { error: 'Payout introuvable', status: 404 as const };
      if (payout.status !== 'PENDING') return { error: 'Payout déjà traité', status: 409 as const };
      if (!payout.ledgerEntry) return { error: 'Ledger manquant', status: 500 as const };

      // Ledger consistency checks (ledger is immutable)
      const le = payout.ledgerEntry;
      if (le.type !== 'PAYOUT') return { error: 'Type ledger invalide', status: 500 as const };
      if (le.userId !== payout.coachId) return { error: 'Coach ledger mismatch', status: 500 as const };
      if (le.currency !== payout.currency) return { error: 'Devise ledger invalide', status: 500 as const };
      if (le.amount !== -payout.amount) return { error: 'Montant ledger invalide', status: 500 as const };

      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedById: session.user.id,
        },
      });

      return { payout: updated, status: 200 as const };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ payout: result.payout }, { status: result.status });
  } catch (error) {
    console.error('[PAYOUT APPROVE] Error:', error);
    return NextResponse.json({ error: 'Erreur lors de l’approbation' }, { status: 500 });
  }
}

