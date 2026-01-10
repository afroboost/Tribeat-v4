/**
 * LiveSessionClient - Composant principal de session live
 * 
 * Composant CLIENT qui orchestre:
 * - Connexion temps réel (Pusher)
 * - AudioEngine
 * - UI Coach vs Participant
 * 
 * ARCHITECTURE PRODUCTION:
 * - État persisté en DB
 * - Broadcast via Pusher
 * - Auth sécurisée
 */

'use client';

import { useLiveSession } from '@/hooks/useLiveSession';
import { LiveStatus } from './LiveStatus';
import { CoachControls } from './CoachControls';
import { ParticipantPlayer } from './ParticipantPlayer';
import { LiveInteractions } from './LiveInteractions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

interface Coach {
  id: string;
  name: string;
  avatar?: string | null;
}

interface LiveSessionClientProps {
  sessionId: string;
  sessionTitle: string;
  sessionStatus: string;
  mediaUrl: string | null;
  coach: Coach;
  participants: Participant[];
  currentUserId: string;
  currentUserRole: string;
}

export function LiveSessionClient({
  sessionId,
  sessionTitle,
  sessionStatus,
  mediaUrl,
  coach,
  participants: initialParticipants,
  currentUserId,
  currentUserRole,
}: LiveSessionClientProps) {
  
  // Déterminer le rôle
  const isCoachUser = coach.id === currentUserId || currentUserRole === 'SUPER_ADMIN';
  const userRole = isCoachUser ? 'COACH' : 'PARTICIPANT';
  
  // Hook temps réel (Pusher + DB)
  const {
    isConnected,
    connectionError,
    liveState,
    audioState,
    participants: liveParticipants,
    participantCount,
    play,
    pause,
    seek,
    setVolume,
    endSession,
    refreshState,
    isCoach,
    chatEnabled,
    messages,
    sendMessage,
    likesCount,
    sendLike,
  } = useLiveSession({
    sessionId,
    userId: currentUserId,
    userName: isCoachUser ? coach.name : 'Participant',
    userRole: userRole as 'COACH' | 'PARTICIPANT',
    mediaUrl,
    onError: (error) => toast.error(error),
  });
  
  // Combiner participants
  const allParticipants = liveParticipants.length > 0 
    ? liveParticipants 
    : initialParticipants.map(p => ({
        id: p.userId,
        name: p.user.name,
        role: 'PARTICIPANT',
      }));
  
  // État dérivé
  const currentStatus = sessionStatus === 'COMPLETED' ? 'ENDED' : 
                        liveState?.isPlaying ? 'LIVE' : 'PAUSED';
  
  const isPlaying = liveState?.isPlaying || false;
  const volume = liveState?.volume || 80;
  
  // Handler fin de session
  const handleEndSession = async () => {
    if (confirm('Êtes-vous sûr de vouloir terminer cette session ?')) {
      await endSession();
      toast.success('Session terminée');
    }
  };
  
  return (
    <div className="space-y-6" data-testid="live-session-container">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <LiveStatus
          status={currentStatus}
          participantCount={participantCount + 1}
          isConnected={isConnected}
          connectionError={connectionError}
        />
        
        {/* Bouton refresh état */}
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshState}
          className="text-gray-400 hover:text-white"
          title="Rafraîchir l'état depuis le serveur"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Zone principale */}
        <div className="lg:col-span-3 space-y-4">
          {/* Lecteur / Zone média */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                {currentStatus === 'ENDED' ? (
                  <div className="text-center text-white">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg font-medium">Session terminée</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Merci d'avoir participé
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-white p-8">
                    {/* Visualisation audio */}
                    <div className={`w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center transition-all ${
                      isPlaying 
                        ? 'bg-blue-600/30 scale-110' 
                        : 'bg-gray-700/50 scale-100'
                    }`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        isPlaying 
                          ? 'bg-blue-600 animate-pulse' 
                          : 'bg-gray-600'
                      }`}>
                        {isPlaying ? (
                          <div className="flex gap-1">
                            {[...Array(4)].map((_, i) => (
                              <div 
                                key={i}
                                className="w-1 bg-white rounded animate-bounce"
                                style={{ 
                                  height: `${20 + Math.random() * 20}px`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-2xl">🎵</span>
                        )}
                      </div>
                    </div>
                    
                    <h2 className="text-xl font-bold">{sessionTitle}</h2>
                    <p className="text-gray-400 mt-1">
                      {isPlaying ? 'Lecture en cours' : 'En attente'}
                    </p>
                    
                    {!mediaUrl && (
                      <p className="text-yellow-500 text-sm mt-4">
                        Aucun média associé à cette session
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Contrôles selon le rôle */}
          {currentStatus !== 'ENDED' && (
            <>
              {isCoach ? (
                <CoachControls
                  isPlaying={isPlaying}
                  audioState={audioState}
                  onPlay={play}
                  onPause={pause}
                  onSeek={seek}
                  onVolumeChange={setVolume}
                  onEndSession={handleEndSession}
                  disabled={!isConnected}
                />
              ) : (
                <ParticipantPlayer
                  isPlaying={isPlaying}
                  audioState={audioState}
                  volume={volume}
                  sessionTitle={sessionTitle}
                />
              )}
            </>
          )}
        </div>
        
        {/* Sidebar - Participants */}
        <div className="space-y-4">
          <LiveInteractions
            isConnected={isConnected}
            chatEnabled={chatEnabled}
            messages={messages}
            likesCount={likesCount}
            onSendMessage={async (content) => {
              await sendMessage(content);
            }}
            onLike={async () => {
              await sendLike();
            }}
          />

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participants ({participantCount + 1})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Coach */}
              <div className="flex items-center gap-3 p-2 bg-blue-900/30 rounded-lg border border-blue-700/50">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {coach.name}
                    {coach.id === currentUserId && ' (vous)'}
                  </p>
                  <p className="text-xs text-blue-400">Coach</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full" title="En ligne" />
              </div>
              
              {/* Participants */}
              {allParticipants.length > 0 ? (
                allParticipants
                  .filter(p => p.id !== coach.id)
                  .map((p) => (
                    <div 
                      key={p.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30"
                    >
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {p.name}
                          {p.id === currentUserId && ' (vous)'}
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="En ligne" />
                    </div>
                  ))
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  Aucun autre participant
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Info rôle */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="py-4">
              <p className="text-xs text-gray-400 text-center">
                {isCoach ? (
                  <>Vous êtes le <span className="text-blue-400 font-medium">Coach</span></>
                ) : (
                  <>Vous êtes <span className="text-green-400 font-medium">Participant</span></>
                )}
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                État persisté • Pusher
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
