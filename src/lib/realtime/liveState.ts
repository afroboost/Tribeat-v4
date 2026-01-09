/**
 * Live Session State Service
 * 
 * Gère l'état persisté des sessions live en DB
 * AUCUNE donnée en mémoire volatile
 */

import { prisma } from '@/lib/prisma';

export interface LiveState {
  sessionId: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  lastEventBy: string | null;
  lastEventAt: Date;
}

/**
 * Récupère l'état actuel d'une session (ou crée un état par défaut)
 */
export async function getLiveState(sessionId: string): Promise<LiveState> {
  let state = await prisma.liveSessionState.findUnique({
    where: { sessionId },
  });
  
  if (!state) {
    // Créer un état par défaut
    state = await prisma.liveSessionState.create({
      data: {
        sessionId,
        isPlaying: false,
        currentTime: 0,
        volume: 80,
      },
    });
  }
  
  return {
    sessionId: state.sessionId,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    volume: state.volume,
    lastEventBy: state.lastEventBy,
    lastEventAt: state.lastEventAt,
  };
}

/**
 * Met à jour l'état PLAY
 */
export async function setPlayState(
  sessionId: string, 
  currentTime: number, 
  userId: string
): Promise<LiveState> {
  const state = await prisma.liveSessionState.upsert({
    where: { sessionId },
    update: {
      isPlaying: true,
      currentTime,
      lastEventBy: userId,
      lastEventAt: new Date(),
    },
    create: {
      sessionId,
      isPlaying: true,
      currentTime,
      volume: 80,
      lastEventBy: userId,
    },
  });
  
  return {
    sessionId: state.sessionId,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    volume: state.volume,
    lastEventBy: state.lastEventBy,
    lastEventAt: state.lastEventAt,
  };
}

/**
 * Met à jour l'état PAUSE
 */
export async function setPauseState(
  sessionId: string, 
  currentTime: number, 
  userId: string
): Promise<LiveState> {
  const state = await prisma.liveSessionState.upsert({
    where: { sessionId },
    update: {
      isPlaying: false,
      currentTime,
      lastEventBy: userId,
      lastEventAt: new Date(),
    },
    create: {
      sessionId,
      isPlaying: false,
      currentTime,
      volume: 80,
      lastEventBy: userId,
    },
  });
  
  return {
    sessionId: state.sessionId,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    volume: state.volume,
    lastEventBy: state.lastEventBy,
    lastEventAt: state.lastEventAt,
  };
}

/**
 * Met à jour la position (SEEK)
 */
export async function setSeekState(
  sessionId: string, 
  currentTime: number, 
  userId: string
): Promise<LiveState> {
  const state = await prisma.liveSessionState.upsert({
    where: { sessionId },
    update: {
      currentTime,
      lastEventBy: userId,
      lastEventAt: new Date(),
    },
    create: {
      sessionId,
      isPlaying: false,
      currentTime,
      volume: 80,
      lastEventBy: userId,
    },
  });
  
  return {
    sessionId: state.sessionId,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    volume: state.volume,
    lastEventBy: state.lastEventBy,
    lastEventAt: state.lastEventAt,
  };
}

/**
 * Met à jour le volume
 */
export async function setVolumeState(
  sessionId: string, 
  volume: number, 
  userId: string
): Promise<LiveState> {
  const state = await prisma.liveSessionState.upsert({
    where: { sessionId },
    update: {
      volume: Math.max(0, Math.min(100, volume)),
      lastEventBy: userId,
      lastEventAt: new Date(),
    },
    create: {
      sessionId,
      isPlaying: false,
      currentTime: 0,
      volume: Math.max(0, Math.min(100, volume)),
      lastEventBy: userId,
    },
  });
  
  return {
    sessionId: state.sessionId,
    isPlaying: state.isPlaying,
    currentTime: state.currentTime,
    volume: state.volume,
    lastEventBy: state.lastEventBy,
    lastEventAt: state.lastEventAt,
  };
}

/**
 * Réinitialise l'état (fin de session)
 */
export async function resetLiveState(sessionId: string): Promise<void> {
  await prisma.liveSessionState.deleteMany({
    where: { sessionId },
  });
}
