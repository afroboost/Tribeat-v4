/**
 * Live Chat API
 * - GET: fetch persisted messages (reconnect-safe)
 * - POST: create message (auth + access required) then broadcast via Pusher
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { checkUserAccess } from '@/actions/access';
import { getChannelName, getPusherServer, isPusherConfigured, LIVE_EVENTS } from '@/lib/realtime/pusher';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const access = await checkUserAccess(session.user.id, sessionId);
  if (!access.hasAccess) return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));
  const cursor = searchParams.get('cursor'); // ChatMessage.id

  const liveSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, chatEnabled: true },
  });
  if (!liveSession) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1]?.id : null;
  return NextResponse.json({
    chatEnabled: liveSession.chatEnabled,
    messages: messages
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        userId: m.userId,
        userName: m.user.name,
        userRole: m.user.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    nextCursor,
  });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const liveSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, coachId: true, chatEnabled: true },
  });
  if (!liveSession) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  const isAdmin = session.user.role === 'SUPER_ADMIN';
  const isCoach = liveSession.coachId === session.user.id;
  const access = await checkUserAccess(session.user.id, sessionId);

  // Security: only coach/participants with access; admin override
  if (!isAdmin && !isCoach && !access.hasAccess) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }
  if (!liveSession.chatEnabled && !isAdmin) {
    return NextResponse.json({ error: 'Chat désactivé pour cette session' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content ?? '').trim();
  if (!content) return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: 'Message trop long' }, { status: 400 });

  const msg = await prisma.chatMessage.create({
    data: { sessionId, userId: session.user.id, content },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  if (isPusherConfigured()) {
    try {
      const pusher = getPusherServer();
      await pusher.trigger(getChannelName(sessionId), LIVE_EVENTS.CHAT_MESSAGE, {
        id: msg.id,
        sessionId,
        userId: msg.userId,
        userName: msg.user.name,
        userRole: msg.user.role,
        content: msg.content,
        timestamp: msg.timestamp,
      });
    } catch (e) {
      // Best-effort realtime: message is persisted, clients will catch up on refresh/reconnect.
      console.error('[LIVE CHAT] Pusher trigger failed:', e);
    }
  }

  return NextResponse.json({ message: { id: msg.id } }, { status: 201 });
}

