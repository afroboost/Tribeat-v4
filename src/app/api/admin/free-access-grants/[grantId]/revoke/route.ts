import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ grantId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const { grantId } = await params;

  try {
    const grant = await prisma.freeAccessGrant.findUnique({
      where: { id: grantId },
      select: { id: true, revokedAt: true },
    });

    if (!grant) {
      return NextResponse.json({ error: 'Grant introuvable' }, { status: 404 });
    }

    if (grant.revokedAt) {
      return NextResponse.json({ success: true, revoked: true, alreadyRevoked: true });
    }

    await prisma.freeAccessGrant.update({
      where: { id: grantId },
      data: {
        revokedAt: new Date(),
        revokedById: session.user.id,
      },
    });

    return NextResponse.json({ success: true, revoked: true });
  } catch (error) {
    console.error('[ADMIN FREE ACCESS] Revoke error:', error);
    return NextResponse.json({ error: 'Erreur lors de la révocation' }, { status: 500 });
  }
}

