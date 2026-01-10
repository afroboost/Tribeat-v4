/**
 * Live Likes API
 * - GET: current likesCount (reconnect-safe)
 * - POST: rate-limited like (auth + access required), persists, increments counter, broadcasts new count
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

const MIN_INTERVAL_MS = 2000; // 1 like / 2s
const WINDOW_MS = 60_000; // 60s window
const MAX_PER_WINDOW = 30; // 30 likes/minute/user

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const access = await checkUserAccess(session.user.id, sessionId);
  if (!access.hasAccess) return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });

  const liveSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, likesCount: true },
  });
  if (!liveSession) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  return NextResponse.json({ likesCount: liveSession.likesCount });
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const liveSession = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, coachId: true },
  });
  if (!liveSession) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  const isAdmin = session.user.role === 'SUPER_ADMIN';
  const isCoach = liveSession.coachId === session.user.id;
  const access = await checkUserAccess(session.user.id, sessionId);
  if (!isAdmin && !isCoach && !access.hasAccess) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const result = await prisma.$transaction(async (tx) => {
    const last = await tx.sessionLike.findFirst({
      where: { sessionId, userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (last && now.getTime() - last.createdAt.getTime() < MIN_INTERVAL_MS) {
      return { ok: false as const, error: 'Trop rapide' };
    }

    const count = await tx.sessionLike.count({
      where: { sessionId, userId: session.user.id, createdAt: { gt: windowStart } },
    });
    if (count >= MAX_PER_WINDOW) {
      return { ok: false as const, error: 'Rate limit' };
    }

    await tx.sessionLike.create({ data: { sessionId, userId: session.user.id } });
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { likesCount: { increment: 1 } },
      select: { likesCount: true },
    });

    return { ok: true as const, likesCount: updated.likesCount };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 429 });
  }

  if (isPusherConfigured()) {
    try {
      const pusher = getPusherServer();
      await pusher.trigger(getChannelName(sessionId), LIVE_EVENTS.LIKES_UPDATED, {
        sessionId,
        likesCount: result.likesCount,
        timestamp: Date.now(),
      });
    } catch (e) {
      // Best-effort realtime: counter is persisted, clients will catch up on refresh/reconnect.
      console.error('[LIVE LIKES] Pusher trigger failed:', e);
    }
  }

  return NextResponse.json({ likesCount: result.likesCount }, { status: 201 });
}

