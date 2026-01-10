/**
 * API Route: Live Session Events
 * POST /api/live/[sessionId]/event
 * 
 * SÉCURITÉ:
 * - Auth obligatoire
 * - Vérification rôle COACH
 * - État persisté en DB
 * - Broadcast via Pusher
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { getPusherServer, getChannelName, LIVE_EVENTS, isPusherConfigured } from '@/lib/realtime/pusher';
import { checkUserAccess } from '@/actions/access';
import { 
  getLiveState, 
  setPlayState, 
  setPauseState, 
  setSeekState, 
  setVolumeState,
  resetLiveState 
} from '@/lib/realtime/liveState';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// Types d'événements autorisés
type EventType = 'play' | 'pause' | 'seek' | 'volume' | 'end';

interface EventPayload {
  type: EventType;
  currentTime?: number;
  volume?: number;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  
  try {
    const { sessionId } = await params;
    
    // 1. AUTH OBLIGATOIRE
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const userRole = session.user.role;
    
    // 2. Vérifier que la session existe
    const liveSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, coachId: true, status: true },
    });
    
    if (!liveSession) {
      return NextResponse.json(
        { error: 'Session introuvable', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // 3. VÉRIFICATION RÔLE COACH
    const isCoach = liveSession.coachId === userId;
    const isAdmin = userRole === 'SUPER_ADMIN';
    
    if (!isCoach && !isAdmin) {
      return NextResponse.json(
        { error: 'Seul le coach peut contrôler la session', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    // 4. Parser le payload
    const body: EventPayload = await request.json();
    const { type, currentTime, volume } = body;
    
    if (!type || !['play', 'pause', 'seek', 'volume', 'end'].includes(type)) {
      return NextResponse.json(
        { error: 'Type d\'événement invalide', code: 'INVALID_TYPE' },
        { status: 400 }
      );
    }
    
    // 5. PERSISTER L'ÉTAT EN DB
    let newState;
    switch (type) {
      case 'play':
        newState = await setPlayState(sessionId, currentTime || 0, userId);
        break;
      case 'pause':
        newState = await setPauseState(sessionId, currentTime || 0, userId);
        break;
      case 'seek':
        if (currentTime === undefined) {
          return NextResponse.json(
            { error: 'currentTime requis pour seek', code: 'INVALID_PAYLOAD' },
            { status: 400 }
          );
        }
        newState = await setSeekState(sessionId, currentTime, userId);
        break;
      case 'volume':
        if (volume === undefined) {
          return NextResponse.json(
            { error: 'volume requis', code: 'INVALID_PAYLOAD' },
            { status: 400 }
          );
        }
        newState = await setVolumeState(sessionId, volume, userId);
        break;
      case 'end':
        await resetLiveState(sessionId);
        await prisma.session.update({
          where: { id: sessionId },
          data: { status: 'COMPLETED', endedAt: new Date() },
        });
        newState = { sessionId, isPlaying: false, currentTime: 0, volume: 80 };
        break;
    }
    
    // 6. BROADCAST VIA PUSHER
    if (isPusherConfigured()) {
      const pusher = getPusherServer();
      const channelName = getChannelName(sessionId);
      
      const eventName = {
        play: LIVE_EVENTS.PLAY,
        pause: LIVE_EVENTS.PAUSE,
        seek: LIVE_EVENTS.SEEK,
        volume: LIVE_EVENTS.VOLUME,
        end: LIVE_EVENTS.END,
      }[type];
      
      const eventData = {
        ...newState,
        timestamp: Date.now(),
        triggeredBy: userId,
      };
      
      await pusher.trigger(channelName, eventName, eventData);
      
      console.log(`[LIVE] ${type.toUpperCase()} broadcast to ${channelName}`, {
        sessionId,
        userId,
        latency: Date.now() - startTime,
      });
    } else {
      console.warn('[LIVE] Pusher non configuré - broadcast désactivé');
    }
    
    // 7. Réponse avec métriques
    return NextResponse.json({
      success: true,
      state: newState,
      metrics: {
        processingTime: Date.now() - startTime,
        pusherEnabled: isPusherConfigured(),
      },
    });
    
  } catch (error) {
    console.error('[LIVE] Event error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/live/[sessionId]/event
 * Récupère l'état actuel (pour JOIN / REFRESH)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    
    // Auth obligatoire
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // ENFORCEMENT SERVER-SIDE: lecture état live réservée aux utilisateurs ayant accès
    const access = await checkUserAccess(session.user.id, sessionId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Accès non autorisé', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    
    // Vérifier que la session existe
    const liveSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { 
        id: true, 
        coachId: true, 
        status: true,
        title: true,
        mediaUrl: true,
      },
    });
    
    if (!liveSession) {
      return NextResponse.json(
        { error: 'Session introuvable', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    
    // Récupérer l'état persisté
    const state = await getLiveState(sessionId);
    
    return NextResponse.json({
      success: true,
      session: {
        id: liveSession.id,
        title: liveSession.title,
        status: liveSession.status,
        mediaUrl: liveSession.mediaUrl,
        coachId: liveSession.coachId,
      },
      state,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('[LIVE] Get state error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
