import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { getChannelName, getPusherServer, isPusherConfigured, LIVE_EVENTS } from '@/lib/realtime/pusher';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sessionLike.deleteMany({ where: { sessionId } });
    return await tx.session.update({
      where: { id: sessionId },
      data: { likesCount: 0 },
      select: { id: true, likesCount: true },
    });
  });

  if (isPusherConfigured()) {
    const pusher = getPusherServer();
    await pusher.trigger(getChannelName(sessionId), LIVE_EVENTS.LIKES_UPDATED, {
      sessionId,
      likesCount: updated.likesCount,
      timestamp: Date.now(),
      by: session.user.id,
    });
  }

  return NextResponse.json({ session: updated });
}

