import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { getChannelName, getPusherServer, isPusherConfigured, LIVE_EVENTS } from '@/lib/realtime/pusher';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Accès admin requis' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body?.enabled);

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data: { chatEnabled: enabled },
    select: { id: true, chatEnabled: true },
  });

  if (isPusherConfigured()) {
    try {
      const pusher = getPusherServer();
      await pusher.trigger(getChannelName(sessionId), LIVE_EVENTS.CHAT_STATUS, {
        sessionId,
        chatEnabled: updated.chatEnabled,
        timestamp: Date.now(),
        by: session.user.id,
      });
    } catch (e) {
      console.error('[ADMIN CHAT] Pusher trigger failed:', e);
    }
  }

  return NextResponse.json({ session: updated });
}

