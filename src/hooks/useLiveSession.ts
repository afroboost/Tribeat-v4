/**
 * Hook: useLiveSession (Pusher Production)
 * 
 * Gère la connexion temps réel à une session live via Pusher
 * - État persisté en DB (survit aux redémarrages)
 * - Auth sécurisée
 * - Reconnexion automatique
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPusherClient, getChannelName, LIVE_EVENTS } from '@/lib/realtime/pusher';
import { getAudioEngine, AudioEngineState } from '@/lib/realtime/audioEngine';
import type { PresenceChannel, Members } from 'pusher-js';

// ========================================
// TYPES
// ========================================

export interface LiveState {
  sessionId: string;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  lastEventAt?: Date;
}

export interface LiveParticipant {
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
  // Connexion
  isConnected: boolean;
  connectionError: string | null;
  
  // État
  liveState: LiveState | null;
  audioState: AudioEngineState | null;
  
  // Participants
  participants: LiveParticipant[];
  participantCount: number;
  
  // Actions (Coach uniquement)
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (time: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  endSession: () => Promise<void>;
  
  // Refresh état depuis DB
  refreshState: () => Promise<void>;
  
  // Info
  isCoach: boolean;
}

function safeNumber(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ========================================
// HOOK
// ========================================

export function useLiveSession(options: UseLiveSessionOptions): UseLiveSessionReturn {
  const { sessionId, userId, userName, userRole, mediaUrl, onError } = options;
  
  // Refs
  const channelRef = useRef<PresenceChannel | null>(null);
  const audioEngineRef = useRef<ReturnType<typeof getAudioEngine> | null>(null);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [audioState, setAudioState] = useState<AudioEngineState | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  
  const isCoach = userRole === 'COACH' || userRole === 'SUPER_ADMIN';
  const debug = process.env.NODE_ENV !== 'production';
  const hasHydratedRef = useRef(false);

  const applyIncomingState = useCallback(
    (incoming: Partial<LiveState> & { sessionId?: string }) => {
      // Defensive: ignore events for the wrong session
      if (incoming.sessionId && incoming.sessionId !== sessionId) return;
      setLiveState((prev) => {
        const base: LiveState =
          prev ??
          ({
            sessionId,
            isPlaying: false,
            currentTime: 0,
            volume: 80,
          } satisfies LiveState);

        const currentTime = safeNumber((incoming as any).currentTime, base.currentTime);
        const volume = Math.max(0, Math.min(100, safeNumber((incoming as any).volume, base.volume)));

        return {
          ...base,
          ...incoming,
          sessionId,
          currentTime,
          volume,
        };
      });
    },
    [sessionId]
  );
  
  // ========================================
  // FETCH INITIAL STATE FROM DB
  // ========================================
  
  const refreshState = useCallback(async (reason: string = 'resync') => {
    try {
      const response = await fetch(`/api/live/${sessionId}/event?reason=${encodeURIComponent(reason)}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.error || 'Impossible de récupérer l\'état';
        throw new Error(message);
      }
      
      const data = await response.json();
      
      if (data.success && data.state) {
        setLiveState(data.state);
        
        // Synchroniser l'audio
        const audioEngine = audioEngineRef.current;
        if (audioEngine && !isCoach) {
          audioEngine.setVolume(data.state.volume);
          audioEngine.seek(data.state.currentTime);
          if (data.state.isPlaying) {
            audioEngine.play();
          } else {
            audioEngine.pause();
          }
        }
        
        if (debug) {
          console.log('[LIVE] État récupéré depuis DB:', data.state);
        }
        hasHydratedRef.current = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de synchronisation';
      setConnectionError(message);
      onError?.(message);
      console.error('[LIVE] Erreur refresh state:', error);
    }
  }, [sessionId, isCoach, debug, onError]);
  
  // ========================================
  // PUSHER CONNECTION
  // ========================================
  
  useEffect(() => {
    let channel: PresenceChannel;
    
    const connectPusher = async () => {
      try {
        const pusher = getPusherClient();
        const channelName = getChannelName(sessionId);
        
        // DB = source of truth: hydrater AVANT de s'abonner (late join safe)
        await refreshState('join:pre-subscribe');

        if (debug) {
          console.log('[LIVE] Connexion à', channelName);
        }
        
        channel = pusher.subscribe(channelName) as PresenceChannel;
        channelRef.current = channel;

        // Resync on reconnect
        const handleConnected = () => {
          // Si on s'est déjà hydraté une fois, chaque reconnexion doit resynchroniser
          if (hasHydratedRef.current) {
            refreshState('resync:reconnect');
          }
        };
        pusher.connection.bind('connected', handleConnected);
        
        // Subscription réussie
        channel.bind('pusher:subscription_succeeded', (members: Members) => {
          setIsConnected(true);
          setConnectionError(null);
          
          // Récupérer les membres
          const memberList: LiveParticipant[] = [];
          members.each((member: { id: string; info: { name: string; role: string } }) => {
            memberList.push({
              id: member.id,
              name: member.info?.name || 'Utilisateur',
              role: member.info?.role || 'PARTICIPANT',
            });
          });
          setParticipants(memberList);
          
          if (debug) {
            console.log('[LIVE] Connecté -', memberList.length, 'participants');
          }
          
          // Re-synchroniser après subscription (évite les races entre fetch et subscribe)
          refreshState('join:post-subscribe');
        });
        
        // Erreur de subscription
        channel.bind('pusher:subscription_error', (error: Error) => {
          setConnectionError('Impossible de rejoindre la session');
          console.error('[LIVE] Subscription error:', error);
        });
        
        // Membre rejoint
        channel.bind('pusher:member_added', (member: { id: string; info: { name: string; role: string } }) => {
          setParticipants(prev => {
            if (prev.find(p => p.id === member.id)) return prev;
            return [...prev, {
              id: member.id,
              name: member.info?.name || 'Utilisateur',
              role: member.info?.role || 'PARTICIPANT',
            }];
          });
          if (debug) {
            console.log('[LIVE] Participant rejoint:', member.info?.name);
          }
        });
        
        // Membre parti
        channel.bind('pusher:member_removed', (member: { id: string }) => {
          setParticipants(prev => prev.filter(p => p.id !== member.id));
          if (debug) {
            console.log('[LIVE] Participant parti:', member.id);
          }
        });
        
        // ========================================
        // ÉVÉNEMENTS LIVE
        // ========================================
        
        channel.bind(LIVE_EVENTS.PLAY, (data: LiveState & { timestamp: number }) => {
          if (debug) {
            console.log('[LIVE] PLAY reçu:', data);
          }
          applyIncomingState({ ...data, isPlaying: true });
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.seek(safeNumber(data.currentTime, 0));
            audioEngine.play();
          }
        });
        
        channel.bind(LIVE_EVENTS.PAUSE, (data: LiveState & { timestamp: number }) => {
          if (debug) {
            console.log('[LIVE] PAUSE reçu:', data);
          }
          applyIncomingState({ ...data, isPlaying: false });
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.pause();
            audioEngine.seek(safeNumber(data.currentTime, 0));
          }
        });
        
        channel.bind(LIVE_EVENTS.SEEK, (data: LiveState & { timestamp: number }) => {
          if (debug) {
            console.log('[LIVE] SEEK reçu:', data);
          }
          applyIncomingState(data);
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.seek(safeNumber(data.currentTime, 0));
          }
        });
        
        channel.bind(LIVE_EVENTS.VOLUME, (data: LiveState & { timestamp: number }) => {
          if (debug) {
            console.log('[LIVE] VOLUME reçu:', data);
          }
          applyIncomingState(data);
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.setVolume(Math.max(0, Math.min(100, safeNumber(data.volume, 80))));
          }
        });
        
        channel.bind(LIVE_EVENTS.END, () => {
          if (debug) {
            console.log('[LIVE] SESSION TERMINÉE');
          }
          setLiveState(prev => prev ? { ...prev, isPlaying: false } : null);
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine) {
            audioEngine.pause();
          }
        });
        
        // Cleanup for pusher connection bind
        const cleanupConnectionBindings = () => {
          pusher.connection.unbind('connected', handleConnected);
        };
        // Store on channel for cleanup path
        // @ts-expect-error - internal marker for cleanup
        channel.__tribeatCleanup = cleanupConnectionBindings;
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur de connexion';
        setConnectionError(message);
        onError?.(message);
        console.error('[LIVE] Connection error:', error);
      }
    };
    
    connectPusher();
    
    // Cleanup
    return () => {
      if (channel) {
        // @ts-expect-error - internal marker for cleanup
        channel.__tribeatCleanup?.();
        channel.unbind_all();
        try {
          const pusher = getPusherClient();
          pusher.unsubscribe(getChannelName(sessionId));
        } catch {
          // ignore: pusher may be misconfigured
        }
      }
      channelRef.current = null;

      // Server-side LEAVE log (best-effort, no new endpoint)
      // keepalive helps during tab close/navigation
      try {
        fetch(`/api/live/${sessionId}/event?reason=leave`, { method: 'GET', keepalive: true });
      } catch {
        // ignore
      }
    };
  }, [sessionId, isCoach, refreshState, onError, debug, applyIncomingState]);
  
  // ========================================
  // AUDIO ENGINE
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
  // COACH ACTIONS (API CALLS)
  // ========================================
  
  const sendEvent = useCallback(async (type: string, data: object = {}) => {
    if (!isCoach) {
      onError?.('Seul le coach peut contrôler la session');
      throw new Error('FORBIDDEN');
    }
    
    try {
      const response = await fetch(`/api/live/${sessionId}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur serveur');
      }
      
      const result = await response.json();
      if (debug) {
        console.log(`[LIVE] ${type} envoyé - processing: ${result.metrics?.processingTime}ms`);
      }
      if (result?.state) {
        // DB is the source of truth: align local UI state to persisted state
        setLiveState(result.state);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(message);
      console.error('[LIVE] Send error:', error);
      // Always resync after a failed emit (avoid desync)
      await refreshState('resync:emit-failed');
      throw error;
    }
  }, [sessionId, isCoach, onError, debug, refreshState]);
  
  const play = useCallback(async () => {
    const audioEngine = audioEngineRef.current;
    const currentTime = audioEngine?.state.currentTime || 0;
    
    // Action locale immédiate (UX), mais DB reste la source de vérité
    audioEngine?.play();
    try {
      await sendEvent('play', { currentTime });
    } catch {
      audioEngine?.pause();
    }
  }, [sendEvent]);
  
  const pause = useCallback(async () => {
    const audioEngine = audioEngineRef.current;
    const currentTime = audioEngine?.state.currentTime || 0;
    
    audioEngine?.pause();
    try {
      await sendEvent('pause', { currentTime });
    } catch {
      // rollback best-effort: state will be rehydrated
    }
  }, [sendEvent]);
  
  const seek = useCallback(async (time: number) => {
    const audioEngine = audioEngineRef.current;
    
    audioEngine?.seek(time);
    try {
      await sendEvent('seek', { currentTime: time });
    } catch {
      // rollback via resync in sendEvent
    }
  }, [sendEvent]);
  
  const setVolume = useCallback(async (volume: number) => {
    const audioEngine = audioEngineRef.current;
    
    audioEngine?.setVolume(volume);
    try {
      await sendEvent('volume', { volume });
    } catch {
      // rollback via resync in sendEvent
    }
  }, [sendEvent]);
  
  const endSession = useCallback(async () => {
    const audioEngine = audioEngineRef.current;
    audioEngine?.pause();
    
    await sendEvent('end');
  }, [sendEvent]);
  
  // ========================================
  // RETURN
  // ========================================
  
  return {
    isConnected,
    connectionError,
    liveState,
    audioState,
    participants,
    participantCount: participants.length,
    play,
    pause,
    seek,
    setVolume,
    endSession,
    refreshState: () => refreshState('manual:refresh'),
    isCoach,
  };
}
