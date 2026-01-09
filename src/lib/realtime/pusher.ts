/**
 * Configuration Pusher - Temps Réel Tribeat
 * 
 * SERVER: pusherServer pour émettre des événements
 * CLIENT: getPusherClient() singleton pour recevoir
 */

import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// ========================================
// CONFIGURATION
// ========================================

const PUSHER_CONFIG = {
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
};

// ========================================
// SERVER-SIDE PUSHER (API Routes / Server Actions)
// ========================================

let _pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  // Check for missing or placeholder values
  const isPlaceholder = (val: string) => !val || val.includes('placeholder');
  
  if (isPlaceholder(PUSHER_CONFIG.appId) || isPlaceholder(PUSHER_CONFIG.key) || isPlaceholder(PUSHER_CONFIG.secret)) {
    console.warn('[Pusher Server] Configuration incomplète ou placeholder - Mode développement');
    return null;
  }
  
  if (!_pusherServer) {
    _pusherServer = new Pusher({
      appId: PUSHER_CONFIG.appId,
      key: PUSHER_CONFIG.key,
      secret: PUSHER_CONFIG.secret,
      cluster: PUSHER_CONFIG.cluster,
      useTLS: true,
    });
  }
  
  return _pusherServer;
}

// Export direct pour compatibilité
export const pusherServer = getPusherServer();

// ========================================
// CLIENT-SIDE PUSHER (Components)
// ========================================

let _pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') return null;
  
  if (!PUSHER_CONFIG.key) {
    console.warn('[Pusher Client] Clé non configurée - Mode développement');
    return null;
  }
  
  if (!_pusherClient) {
    _pusherClient = new PusherClient(PUSHER_CONFIG.key, {
      cluster: PUSHER_CONFIG.cluster,
      authEndpoint: '/api/pusher/auth',
      forceTLS: true,
    });
    
    // Debug en développement
    if (process.env.NODE_ENV === 'development') {
      _pusherClient.connection.bind('connected', () => {
        console.log('[Pusher] Connecté');
      });
      _pusherClient.connection.bind('error', (err: any) => {
        console.error('[Pusher] Erreur:', err);
      });
    }
  }
  
  return _pusherClient;
}

// ========================================
// VÉRIFICATION CONFIGURATION
// ========================================

export function isPusherConfigured(): boolean {
  return !!(PUSHER_CONFIG.appId && PUSHER_CONFIG.key && PUSHER_CONFIG.secret);
}

export function isPusherClientConfigured(): boolean {
  return !!PUSHER_CONFIG.key;
}
