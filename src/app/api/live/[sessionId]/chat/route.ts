/**
 * API Route: Live Session Chat
 * GET/POST /api/live/[sessionId]/chat
 *
 * - Persists messages in DB (ChatMessage)
 * - Broadcasts via Pusher
 * - Enforces session access server-side
 * - Allows SUPER_ADMIN bypass
 * - Respects Session.chatDisabled (blocks non-admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { canAccessSession } from '@/lib/access-control';
import { getPusherServer, getChannelName, LIVE_EVENTS, isPusherConfigured } from '@/lib/realtime/pusher';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const access = await canAccessSession({
      sessionId,
      userId: session.user.id,
      userRole: session.user.role,
    });
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });

    return NextResponse.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('[CHAT] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 });
    }

    const sessionRow = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { coachId: true, chatDisabled: true },
    });
    if (!sessionRow) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
    }

    const isAdmin = session.user.role === 'SUPER_ADMIN';
    const isCoach = sessionRow.coachId === session.user.id;

    const access = await canAccessSession({
      sessionId,
      userId: session.user.id,
      userRole: session.user.role,
    });
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    if (sessionRow.chatDisabled && !isAdmin) {
      return NextResponse.json({ error: 'Chat désactivé' }, { status: 403 });
    }

    const msg = await prisma.chatMessage.create({
      data: {
        sessionId,
        userId: session.user.id,
        content,
        timestamp: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });

    if (isPusherConfigured()) {
      const pusher = getPusherServer();
      await pusher.trigger(getChannelName(sessionId), LIVE_EVENTS.CHAT_MESSAGE, {
        id: msg.id,
        sessionId: msg.sessionId,
        content: msg.content,
        timestamp: msg.timestamp,
        user: msg.user,
        triggeredBy: session.user.id,
        isCoach,
        isAdmin,
      });
    }

    return NextResponse.json({ success: true, message: msg });
  } catch (error) {
    console.error('[CHAT] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

