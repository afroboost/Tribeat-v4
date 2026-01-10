/**
 * ParticipantPlayer - Vue participant (lecture synchronisée)
 * 
 * Le participant NE CONTRÔLE RIEN
 * L'audio est synchronisé automatiquement avec le coach
 * Affiche: progression, volume actuel, état de sync
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Lock, Music2 } from 'lucide-react';
import { AudioEngineState } from '@/lib/realtime/audioEngine';

interface ParticipantPlayerProps {
  isPlaying: boolean;
  audioState: AudioEngineState | null;
  volume: number;
  sessionTitle?: string;
  syncAvailable?: boolean;
}

export function ParticipantPlayer({
  isPlaying,
  audioState,
  volume,
  sessionTitle,
  syncAvailable = true,
}: ParticipantPlayerProps) {
  
  const currentTime = audioState?.currentTime || 0;
  const duration = audioState?.duration || 0;
  const isLoaded = audioState?.isLoaded || false;
  const error = audioState?.error;
  
  // Format time: mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <Card className="bg-gray-800 border-gray-700" data-testid="participant-player">
      <CardContent className="p-6 space-y-4">
        {/* Titre et icône */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isPlaying ? 'bg-blue-600' : 'bg-gray-700'
          }`}>
            <Music2 className={`w-6 h-6 ${isPlaying ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="font-medium text-white">
              {sessionTitle || 'Session audio'}
            </h3>
            <p className="text-sm text-gray-400">
              {isPlaying ? 'Lecture en cours...' : 'En attente du coach'}
            </p>
          </div>
        </div>
        
        {/* Barre de progression (non interactive) */}
        <div className="space-y-2">
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${
                isPlaying ? 'bg-blue-500' : 'bg-gray-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Volume (lecture seule) */}
        <div className="flex items-center gap-3">
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-gray-500" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-400" />
          )}
          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-500"
              style={{ width: `${volume}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{volume}%</span>
        </div>
        
        {/* Message de synchronisation */}
        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-900/50 rounded-lg">
          <Lock className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">
            {syncAvailable ? 'Synchronisé avec le coach' : 'Synchronisation indisponible'}
          </span>
        </div>
        
        {/* Erreur éventuelle */}
        {error && (
          <p className="text-center text-sm text-red-500">
            {error}
          </p>
        )}
        
        {/* Chargement */}
        {!isLoaded && !error && (
          <p className="text-center text-sm text-yellow-500">
            Chargement du média...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
