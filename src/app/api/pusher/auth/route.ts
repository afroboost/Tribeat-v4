/**
 * API Route: Pusher Auth
 * POST /api/pusher/auth
 * 
 * Authentifie les utilisateurs pour les channels presence
 * SÉCURITÉ: Vérifie l'accès à la session avant autorisation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { getPusherServer, isPusherConfigured } from '@/lib/realtime/pusher';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    
    // 2. Vérifier configuration Pusher
    if (!isPusherConfigured()) {
      return NextResponse.json(
        { error: 'Pusher non configuré' },
        { status: 503 }
      );
    }
    
    // 3. Parser le body (format URL-encoded de Pusher)
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;
    
    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: 'socket_id et channel_name requis' },
        { status: 400 }
      );
    }
    
    // 4. Pour les channels presence-session-*, vérifier l'accès
    if (channelName.startsWith('presence-session-')) {
      const sessionId = channelName.replace('presence-session-', '');
      
      // Vérifier que la session existe
      const liveSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { 
          id: true, 
          coachId: true, 
          status: true,
          isPublic: true,
        },
      });
      
      if (!liveSession) {
        return NextResponse.json(
          { error: 'Session introuvable' },
          { status: 404 }
        );
      }
      
      // Vérifier les droits d'accès
      const isCoach = liveSession.coachId === session.user.id;
      const isAdmin = session.user.role === 'SUPER_ADMIN';
      
      if (!liveSession.isPublic && !isCoach && !isAdmin) {
        // Vérifier si participant inscrit
        const isParticipant = await prisma.sessionParticipant.findUnique({
          where: {
            userId_sessionId: {
              userId: session.user.id,
              sessionId: sessionId,
            },
          },
        });
        
        if (!isParticipant) {
          return NextResponse.json(
            { error: 'Accès non autorisé à cette session' },
            { status: 403 }
          );
        }
      }
      
      // Log l'accès
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PUSHER AUTH] ${session.user.name} (${session.user.role}) → ${channelName}`);
      }
    }
    
    // 5. Déterminer le rôle dans la session
    let userRole = session.user.role;
    if (channelName.startsWith('presence-session-')) {
      const sessionId = channelName.replace('presence-session-', '');
      const liveSession = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { coachId: true },
      });
      
      if (liveSession?.coachId === session.user.id) {
        userRole = 'COACH';
      }
    }
    
    // 6. Générer l'auth Pusher
    const pusher = getPusherServer();
    
    const presenceData = {
      user_id: session.user.id,
      user_info: {
        name: session.user.name || 'Utilisateur',
        role: userRole,
        avatar: session.user.avatar || null,
      },
    };
    
    const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);
    
    return NextResponse.json(authResponse);
    
  } catch (error) {
    console.error('[PUSHER AUTH] Error:', error);
    return NextResponse.json(
      { error: 'Erreur d\'authentification' },
      { status: 500 }
    );
  }
}
