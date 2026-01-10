import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ transactionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const { transactionId } = await params;

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { userAccess: { select: { id: true, status: true } } },
    });

    if (!tx) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    const isOwner = tx.userId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: tx.id,
        provider: tx.provider,
        status: tx.status,
        providerTxId: tx.providerTxId,
        amount: tx.amount,
        currency: tx.currency,
        createdAt: tx.createdAt,
      },
      access: tx.userAccess ? { id: tx.userAccess.id, status: tx.userAccess.status } : null,
    });
  } catch (error) {
    console.error('[CHECKOUT][TX] Error', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

