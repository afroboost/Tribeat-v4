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
  
  // ========================================
  // FETCH INITIAL STATE FROM DB
  // ========================================
  
  const refreshState = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/${sessionId}/event`);
      if (!response.ok) {
        throw new Error('Impossible de récupérer l\'état');
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
          }
        }
        
      }
    } catch (error) {
      console.error('[LIVE] Erreur refresh state:', error);
    }
  }, [sessionId, isCoach]);
  
  // ========================================
  // PUSHER CONNECTION
  // ========================================
  
  useEffect(() => {
    let channel: PresenceChannel;
    
    const connectPusher = async () => {
      try {
        const pusher = getPusherClient();
        const channelName = getChannelName(sessionId);
        
        channel = pusher.subscribe(channelName) as PresenceChannel;
        channelRef.current = channel;
        
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
          
          // Récupérer l'état depuis la DB
          refreshState();
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
        });
        
        // Membre parti
        channel.bind('pusher:member_removed', (member: { id: string }) => {
          setParticipants(prev => prev.filter(p => p.id !== member.id));
        });
        
        // ========================================
        // ÉVÉNEMENTS LIVE
        // ========================================
        
        channel.bind(LIVE_EVENTS.PLAY, (data: LiveState & { timestamp: number }) => {
          setLiveState(prev => ({ ...prev, ...data, isPlaying: true }));
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.seek(data.currentTime);
            audioEngine.play();
          }
        });
        
        channel.bind(LIVE_EVENTS.PAUSE, (data: LiveState & { timestamp: number }) => {
          setLiveState(prev => ({ ...prev, ...data, isPlaying: false }));
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.pause();
            audioEngine.seek(data.currentTime);
          }
        });
        
        channel.bind(LIVE_EVENTS.SEEK, (data: LiveState & { timestamp: number }) => {
          setLiveState(prev => ({ ...prev, ...data }));
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.seek(data.currentTime);
          }
        });
        
        channel.bind(LIVE_EVENTS.VOLUME, (data: LiveState & { timestamp: number }) => {
          setLiveState(prev => ({ ...prev, ...data }));
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine && !isCoach) {
            audioEngine.setVolume(data.volume);
          }
        });
        
        channel.bind(LIVE_EVENTS.END, () => {
          setLiveState(prev => prev ? { ...prev, isPlaying: false } : null);
          
          const audioEngine = audioEngineRef.current;
          if (audioEngine) {
            audioEngine.pause();
          }
        });
        
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
        channel.unbind_all();
        const pusher = getPusherClient();
        pusher.unsubscribe(getChannelName(sessionId));
      }
      channelRef.current = null;
    };
  }, [sessionId, isCoach, refreshState, onError]);
  
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
      return;
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(message);
      console.error('[LIVE] Send error:', error);
    }
  }, [sessionId, isCoach, onError]);
  
  const play = useCallback(async () => {
    const audioEngine = audioEngineRef.current;
    const currentTime = audioEngine?.state.currentTime || 0;
    
    // Action locale immédiate
    audioEngine?.play();
    setLiveState(prev => prev ? { ...prev, isPlaying: true } : null);
    
    // Envoyer via API
    await sendEvent('play', { currentTime });
  }, [sendEvent]);
  
  const pause = useCallback(async () => {
    const audioEngine = audioEngineRef.current;
    const currentTime = audioEngine?.state.currentTime || 0;
    
    audioEngine?.pause();
    setLiveState(prev => prev ? { ...prev, isPlaying: false } : null);
    
    await sendEvent('pause', { currentTime });
  }, [sendEvent]);
  
  const seek = useCallback(async (time: number) => {
    const audioEngine = audioEngineRef.current;
    
    audioEngine?.seek(time);
    setLiveState(prev => prev ? { ...prev, currentTime: time } : null);
    
    await sendEvent('seek', { currentTime: time });
  }, [sendEvent]);
  
  const setVolume = useCallback(async (volume: number) => {
    const audioEngine = audioEngineRef.current;
    
    audioEngine?.setVolume(volume);
    setLiveState(prev => prev ? { ...prev, volume } : null);
    
    await sendEvent('volume', { volume });
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
    refreshState,
    isCoach,
  };
}
