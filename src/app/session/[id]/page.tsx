/**
 * Page Session Live - /session/[id]
 * 
 * Architecture:
 * - Layout SERVER: Récupère les données initiales (session, participants, user)
 * - Composant CLIENT: Gère le temps réel (Pusher, AudioEngine)
 * 
 * ZÉRO blocage SSR - La page se charge toujours
 */

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LiveSessionClient } from '@/components/session/LiveSessionClient';
import { Suspense } from 'react';
import { isPusherConfigured } from '@/lib/realtime/pusher';

export const dynamic = 'force-dynamic';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

// Loading state pendant le chargement des données
function SessionLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Chargement de la session...</p>
      </div>
    </div>
  );
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  
  // Récupérer la session utilisateur (non bloquant grâce au middleware)
  const authSession = await getAuthSession();
  
  if (!authSession?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl p-6 text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Connexion requise</h1>
          <p className="text-sm text-gray-300">
            Votre session n&apos;a pas pu être chargée. Connectez-vous pour rejoindre la session.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href={`/auth/login?callbackUrl=/session/${id}`}>
              <Button>Se connecter</Button>
            </Link>
            <Link href="/sessions">
              <Button variant="outline" className="text-gray-200 border-gray-600 hover:bg-gray-700">
                Retour
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Récupérer la session live avec participants
  let liveSession: any = null;
  try {
    liveSession = await prisma.session.findUnique({
      where: { id },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('[SESSION] Failed to load session', { id, error });
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl p-6 text-center space-y-4">
          <h1 className="text-xl font-bold text-white">Erreur de chargement</h1>
          <p className="text-sm text-gray-300">
            Impossible de charger cette session pour le moment. Réessayez.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link href={`/session/${id}`}>
              <Button>Réessayer</Button>
            </Link>
            <Link href="/sessions">
              <Button variant="outline" className="text-gray-200 border-gray-600 hover:bg-gray-700">
                Retour
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!liveSession) {
    notFound();
  }

  // Vérifier l'accès
  const isCoach = liveSession.coachId === authSession.user.id;
  const isAdmin = authSession.user.role === 'SUPER_ADMIN';
  const isParticipant = (liveSession.participants as Array<{ userId: string }>).some(
    (p) => p.userId === authSession.user.id
  );
  
  // Accès autorisé si: coach, admin, participant inscrit, ou session publique LIVE
  const hasAccess = isCoach || isAdmin || isParticipant || 
    (liveSession.isPublic && liveSession.status === 'LIVE');

  if (!hasAccess) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-900" data-testid="session-page">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sessions">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-300 hover:text-white"
                data-testid="back-button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">{liveSession.title}</h1>
              <p className="text-sm text-gray-400">Coach : {liveSession.coach.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Client Component */}
      <main className="container mx-auto px-4 py-6">
        <Suspense fallback={<SessionLoading />}>
          <LiveSessionClient
            sessionId={liveSession.id}
            sessionTitle={liveSession.title}
            sessionStatus={liveSession.status}
            mediaUrl={liveSession.mediaUrl}
            coach={liveSession.coach}
            participants={liveSession.participants}
            currentUserId={authSession.user.id}
            currentUserRole={authSession.user.role}
            realtimeEnabled={process.env.ENABLE_LIVE === 'true' && isPusherConfigured()}
          />
        </Suspense>
      </main>
    </div>
  );
}
