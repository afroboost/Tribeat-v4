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
import { checkUserAccess } from '@/actions/access';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LiveSessionClient } from '@/components/session/LiveSessionClient';
import { Suspense } from 'react';

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
    redirect(`/auth/login?callbackUrl=/session/${id}`);
  }
  
  // Récupérer la session live avec participants
  const liveSession = await prisma.session.findUnique({
    where: { id },
    include: {
      coach: { 
        select: { 
          id: true, 
          name: true, 
          avatar: true 
        } 
      },
      participants: {
        include: {
          user: { 
            select: { 
              id: true, 
              name: true, 
              avatar: true 
            } 
          }
        }
      }
    }
  }).catch(() => null);

  if (!liveSession) {
    notFound();
  }

  // ENFORCEMENT SERVER-SIDE: accès requis (participant OU accès payant OU free access), avec exceptions (coach/admin, public live)
  const access = await checkUserAccess(authSession.user.id, liveSession.id);
  if (!access.hasAccess) {
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
          />
        </Suspense>
      </main>
    </div>
  );
}
