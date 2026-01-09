/**
 * Pusher Configuration - Production Ready
 * 
 * SERVER: pusherServer pour émettre des événements
 * CLIENT: getPusherClient() singleton pour recevoir
 * 
 * SÉCURITÉ:
 * - Auth obligatoire sur channels presence
 * - Vérification rôle COACH pour émission
 */

import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// ========================================
// CONFIGURATION
// ========================================

const config = {
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
};

// ========================================
// SERVER-SIDE PUSHER
// ========================================

let _pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!config.appId || !config.key || !config.secret) {
    throw new Error(
      'Pusher non configuré. Définissez PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET'
    );
  }
  
  if (!_pusherServer) {
    _pusherServer = new Pusher({
      appId: config.appId,
      key: config.key,
      secret: config.secret,
      cluster: config.cluster,
      useTLS: true,
    });
  }
  
  return _pusherServer;
}

// ========================================
// CLIENT-SIDE PUSHER
// ========================================

let _pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (typeof window === 'undefined') {
    throw new Error('getPusherClient ne peut être appelé que côté client');
  }
  
  if (!config.key) {
    throw new Error('Pusher non configuré. Définissez NEXT_PUBLIC_PUSHER_KEY');
  }
  
  if (!_pusherClient) {
    _pusherClient = new PusherClient(config.key, {
      cluster: config.cluster,
      authEndpoint: '/api/pusher/auth',
      forceTLS: true,
    });
    
    // Debug logging
    _pusherClient.connection.bind('connected', () => {
      console.log('[Pusher] Connecté - Socket ID:', _pusherClient?.connection.socket_id);
    });
    
    _pusherClient.connection.bind('error', (err: Error) => {
      console.error('[Pusher] Erreur connexion:', err);
    });
    
    _pusherClient.connection.bind('disconnected', () => {
      console.log('[Pusher] Déconnecté');
    });
  }
  
  return _pusherClient;
}

// ========================================
// HELPERS
// ========================================

export function isPusherConfigured(): boolean {
  return !!(config.appId && config.key && config.secret);
}

export function getChannelName(sessionId: string): string {
  return `presence-session-${sessionId}`;
}

export const LIVE_EVENTS = {
  STATE_UPDATE: 'state:update',
  PLAY: 'playback:play',
  PAUSE: 'playback:pause',
  SEEK: 'playback:seek',
  VOLUME: 'playback:volume',
  END: 'session:end',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
} as const;
