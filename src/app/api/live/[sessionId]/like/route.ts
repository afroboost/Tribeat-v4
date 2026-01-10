/**
 * API Route: Live Session Likes
 * GET/POST /api/live/[sessionId]/like
 *
 * - Persists likes in DB (SessionLike)
 * - Broadcasts count updates via Pusher
 * - Enforces session access server-side
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

    const [count, mine] = await Promise.all([
      prisma.sessionLike.count({ where: { sessionId } }),
      prisma.sessionLike.findUnique({
        where: { sessionId_userId: { sessionId, userId: session.user.id } },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({ success: true, count, liked: !!mine });
  } catch (error) {
    console.error('[LIKE] GET error:', error);
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

    const access = await canAccessSession({
      sessionId,
      userId: session.user.id,
      userRole: session.user.role,
    });
    if (!access.allowed) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const key = { sessionId, userId: session.user.id };
    const existing = await prisma.sessionLike.findUnique({
      where: { sessionId_userId: key },
      select: { id: true },
    });

    if (existing) {
      await prisma.sessionLike.delete({ where: { sessionId_userId: key } });
    } else {
      await prisma.sessionLike.create({ data: key });
    }

    const count = await prisma.sessionLike.count({ where: { sessionId } });
    const liked = !existing;

    if (isPusherConfigured()) {
      const pusher = getPusherServer();
      await pusher.trigger(getChannelName(sessionId), LIVE_EVENTS.LIKE_UPDATE, {
        sessionId,
        count,
        userId: session.user.id,
        liked,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({ success: true, count, liked });
  } catch (error) {
    console.error('[LIKE] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

