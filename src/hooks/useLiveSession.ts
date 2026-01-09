/**
 * Hook: useLiveSession (WebSocket Natif)
 * 
 * Gère la connexion temps réel à une session live
 * Utilise le serveur WebSocket natif (port 3001)
 * ZÉRO simulation - Temps réel RÉEL
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getRealtimeClient, 
  RealtimeClient, 
  WS_EVENTS,
  SessionState 
} from '@/lib/realtime/websocketClient';
import { getAudioEngine, AudioEngineState } from '@/lib/realtime/audioEngine';

// ========================================
// TYPES
// ========================================

export interface LiveSessionUser {
  id: string;
  name: string;
  role: string;
}

export interface UseLiveSessionOptions {
  sessionId: string;
  userId: string;
  userName: string;
  userRole: 'COACH' | 'PARTICIPANT' | 'SUPER_ADMIN';
  mediaUrl?: string | null;
  onError?: (error: string) => void;
}

export interface UseLiveSessionReturn {
  // État connexion
  isConnected: boolean;
  connectionError: string | null;
  latency: number;
  
  // État session
  sessionState: SessionState | null;
  audioState: AudioEngineState | null;
  
  // Participants
  participants: LiveSessionUser[];
  participantCount: number;
  
  // Actions Coach
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  endSession: () => void;
  
  // Info
  isCoach: boolean;
}

// ========================================
// HOOK
// ========================================

export function useLiveSession(options: UseLiveSessionOptions): UseLiveSessionReturn {
  const { sessionId, userId, userName, userRole, mediaUrl, onError } = options;
  
  // Refs
  const clientRef = useRef<RealtimeClient | null>(null);
  const audioEngineRef = useRef<ReturnType<typeof getAudioEngine> | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  
  // État
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [latency, setLatency] = useState(0);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [audioState, setAudioState] = useState<AudioEngineState | null>(null);
  const [participants, setParticipants] = useState<LiveSessionUser[]>([]);
  
  const isCoach = userRole === 'COACH' || userRole === 'SUPER_ADMIN';
  
  // ========================================
  // CONNEXION WEBSOCKET
  // ========================================
  
  useEffect(() => {
    const client = getRealtimeClient();
    clientRef.current = client;
    
    // Se connecter
    client.connect()
      .then(() => {
        setIsConnected(true);
        setConnectionError(null);
        
        // Rejoindre la session
        client.joinSession(sessionId, userId, userName, userRole);
        
        // Mesurer la latence
        client.ping();
      })
      .catch((err) => {
        setConnectionError('Impossible de se connecter au serveur temps réel');
        onError?.('Connexion WebSocket échouée');
        console.error('[useLiveSession] Connection error:', err);
      });
    
    // S'abonner aux événements
    const unsubs: Array<() => void> = [];
    
    // État initial de la session
    unsubs.push(client.on(WS_EVENTS.STATE, (data: SessionState) => {
      console.log('[useLiveSession] Received STATE:', data);
      setSessionState(data);
      setParticipants(data.participants.map(p => ({
        id: p.userId,
        name: p.userName,
        role: p.role,
      })));
      
      // Calculer la latence
      if (data.latencyTest) {
        const lat = Date.now() - data.latencyTest;
        setLatency(lat);
        console.log(`[useLiveSession] Initial latency: ${lat}ms`);
      }
      
      // Synchroniser l'audio pour les nouveaux arrivants
      const audioEngine = audioEngineRef.current;
      if (audioEngine && !isCoach) {
        audioEngine.setVolume(data.volume);
        if (data.isPlaying) {
          audioEngine.seek(data.currentTime);
          audioEngine.play();
        }
      }
    }));
    
    // Play
    unsubs.push(client.on(WS_EVENTS.PLAY, (data) => {
      console.log('[useLiveSession] Received PLAY:', data);
      const receiveTime = Date.now();
      const eventLatency = data.timestamp ? receiveTime - data.timestamp : 0;
      console.log(`[useLiveSession] PLAY event latency: ${eventLatency}ms`);
      
      setSessionState(prev => prev ? { 
        ...prev, 
        isPlaying: true, 
        currentTime: data.currentTime 
      } : null);
      
      // Synchroniser l'audio (participants uniquement)
      const audioEngine = audioEngineRef.current;
      if (audioEngine && !isCoach) {
        audioEngine.seek(data.currentTime);
        audioEngine.play();
      }
    }));
    
    // Pause
    unsubs.push(client.on(WS_EVENTS.PAUSE, (data) => {
      console.log('[useLiveSession] Received PAUSE:', data);
      
      setSessionState(prev => prev ? { 
        ...prev, 
        isPlaying: false, 
        currentTime: data.currentTime 
      } : null);
      
      const audioEngine = audioEngineRef.current;
      if (audioEngine && !isCoach) {
        audioEngine.pause();
        audioEngine.seek(data.currentTime);
      }
    }));
    
    // Seek
    unsubs.push(client.on(WS_EVENTS.SEEK, (data) => {
      console.log('[useLiveSession] Received SEEK:', data);
      
      setSessionState(prev => prev ? { 
        ...prev, 
        currentTime: data.currentTime 
      } : null);
      
      const audioEngine = audioEngineRef.current;
      if (audioEngine && !isCoach) {
        audioEngine.seek(data.currentTime);
      }
    }));
    
    // Volume
    unsubs.push(client.on(WS_EVENTS.VOLUME, (data) => {
      console.log('[useLiveSession] Received VOLUME:', data);
      
      setSessionState(prev => prev ? { 
        ...prev, 
        volume: data.volume 
      } : null);
      
      const audioEngine = audioEngineRef.current;
      if (audioEngine && !isCoach) {
        audioEngine.setVolume(data.volume);
      }
    }));
    
    // End
    unsubs.push(client.on(WS_EVENTS.END, () => {
      console.log('[useLiveSession] Received END');
      
      setSessionState(prev => prev ? { 
        ...prev, 
        status: 'ENDED', 
        isPlaying: false 
      } : null);
      
      const audioEngine = audioEngineRef.current;
      if (audioEngine) {
        audioEngine.pause();
      }
    }));
    
    // Participant joined
    unsubs.push(client.on(WS_EVENTS.PARTICIPANT_JOINED, (data) => {
      console.log('[useLiveSession] Participant joined:', data);
      setParticipants(prev => {
        if (prev.find(p => p.id === data.userId)) return prev;
        return [...prev, { id: data.userId, name: data.userName, role: data.role }];
      });
    }));
    
    // Participant left
    unsubs.push(client.on(WS_EVENTS.PARTICIPANT_LEFT, (data) => {
      console.log('[useLiveSession] Participant left:', data);
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
    }));
    
    // Error
    unsubs.push(client.on(WS_EVENTS.ERROR, (data) => {
      console.error('[useLiveSession] Server error:', data);
      onError?.(data.message || 'Erreur serveur');
    }));
    
    // Pong (latency measurement)
    unsubs.push(client.on(WS_EVENTS.PONG, (data) => {
      if (data.serverTime) {
        const lat = Date.now() - data.serverTime;
        setLatency(lat);
      }
    }));
    
    unsubscribersRef.current = unsubs;
    
    // Cleanup
    return () => {
      unsubs.forEach(unsub => unsub());
      client.leaveSession();
    };
  }, [sessionId, userId, userName, userRole, isCoach, onError]);
  
  // ========================================
  // AUDIO ENGINE SETUP
  // ========================================
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const audioEngine = getAudioEngine();
    audioEngineRef.current = audioEngine;
    
    const unsubscribe = audioEngine.subscribe((state) => {
      setAudioState(state);
    });
    
    if (mediaUrl) {
      audioEngine.load(mediaUrl);
    }
    
    return () => {
      unsubscribe();
    };
  }, [mediaUrl]);
  
  // ========================================
  // ACTIONS COACH
  // ========================================
  
  const play = useCallback(() => {
    if (!isCoach) return;
    
    const audioEngine = audioEngineRef.current;
    const client = clientRef.current;
    const currentTime = audioEngine?.state.currentTime || 0;
    
    // Action locale immédiate
    audioEngine?.play();
    
    // Envoyer via WebSocket
    client?.play(currentTime);
    
    console.log(`[useLiveSession] PLAY sent at ${currentTime}s`);
  }, [isCoach]);
  
  const pause = useCallback(() => {
    if (!isCoach) return;
    
    const audioEngine = audioEngineRef.current;
    const client = clientRef.current;
    const currentTime = audioEngine?.state.currentTime || 0;
    
    audioEngine?.pause();
    client?.pause(currentTime);
    
    console.log(`[useLiveSession] PAUSE sent at ${currentTime}s`);
  }, [isCoach]);
  
  const seek = useCallback((time: number) => {
    if (!isCoach) return;
    
    const audioEngine = audioEngineRef.current;
    const client = clientRef.current;
    
    audioEngine?.seek(time);
    client?.seek(time);
    
    console.log(`[useLiveSession] SEEK sent to ${time}s`);
  }, [isCoach]);
  
  const setVolume = useCallback((volume: number) => {
    if (!isCoach) return;
    
    const audioEngine = audioEngineRef.current;
    const client = clientRef.current;
    
    audioEngine?.setVolume(volume);
    client?.setVolume(volume);
    
    console.log(`[useLiveSession] VOLUME sent: ${volume}%`);
  }, [isCoach]);
  
  const endSession = useCallback(() => {
    if (!isCoach) return;
    
    const audioEngine = audioEngineRef.current;
    const client = clientRef.current;
    
    audioEngine?.pause();
    client?.endSession();
    
    console.log(`[useLiveSession] END sent`);
  }, [isCoach]);
  
  // ========================================
  // RETURN
  // ========================================
  
  return {
    isConnected,
    connectionError,
    latency,
    sessionState,
    audioState,
    participants,
    participantCount: participants.length,
    play,
    pause,
    seek,
    setVolume,
    endSession,
    isCoach,
  };
}
