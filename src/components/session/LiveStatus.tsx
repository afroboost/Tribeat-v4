/**
 * LiveStatus - Affiche l'état de la session en temps réel
 * 
 * - Statut (LIVE / PAUSED / ENDED)
 * - Nombre de participants connectés
 * - Indicateur de connexion
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff, Circle } from 'lucide-react';

interface LiveStatusProps {
  status: 'LIVE' | 'PAUSED' | 'ENDED';
  participantCount: number;
  isConnected: boolean;
  connectionError?: string | null;
}

export function LiveStatus({ 
  status, 
  participantCount, 
  isConnected,
  connectionError,
}: LiveStatusProps) {
  
  const statusConfig = {
    LIVE: {
      label: 'EN DIRECT',
      color: 'bg-red-500',
      textColor: 'text-red-500',
      pulse: true,
    },
    PAUSED: {
      label: 'EN PAUSE',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      pulse: false,
    },
    ENDED: {
      label: 'TERMINÉE',
      color: 'bg-gray-500',
      textColor: 'text-gray-500',
      pulse: false,
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 rounded-lg">
      {/* Statut session */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Circle 
            className={`w-3 h-3 fill-current ${config.textColor}`}
          />
          {config.pulse && (
            <Circle 
              className={`w-3 h-3 fill-current ${config.textColor} absolute top-0 left-0 animate-ping`}
            />
          )}
        </div>
        <span className={`text-sm font-bold ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      
      {/* Séparateur */}
      <div className="w-px h-4 bg-gray-600" />
      
      {/* Participants */}
      <div className="flex items-center gap-1.5 text-gray-300">
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">{participantCount}</span>
      </div>
      
      {/* Connexion Pusher */}
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-500">Pusher</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-500">
              {connectionError || 'Déconnecté'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
