/**
 * Page Session Live - Production
 */

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, User } from 'lucide-react';

// FORCE DYNAMIC
export const dynamic = 'force-dynamic';

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  const session = await getAuthSession();

  if (!session) {
    redirect(`/auth/login?callbackUrl=/session/${id}`);
  }

  let liveSession: any = null;
  
  try {
    liveSession = await prisma.session.findUnique({
      where: { id },
      include: {
        coach: { select: { id: true, name: true, avatar: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    });
  } catch (e) {
    console.error('DB Error:', e);
  }

  if (!liveSession) {
    notFound();
  }

  const isCoach = liveSession.coachId === session.user.id;
  const isParticipant = liveSession.participants.some((p: any) => p.userId === session.user.id);
  const isAdmin = session.user.role === 'SUPER_ADMIN';
  const hasAccess = isCoach || isParticipant || isAdmin || liveSession.status === 'LIVE';

  if (!hasAccess) {
    redirect('/sessions');
  }

  const statusConfig: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    LIVE: { label: 'En direct', color: 'bg-red-500', variant: 'destructive' },
    SCHEDULED: { label: 'Planifiée', color: 'bg-yellow-500', variant: 'secondary' },
    COMPLETED: { label: 'Terminée', color: 'bg-gray-500', variant: 'outline' },
    DRAFT: { label: 'Brouillon', color: 'bg-gray-400', variant: 'outline' },
  };

  const status = statusConfig[liveSession.status] || statusConfig.DRAFT;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/sessions">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{liveSession.title}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-sm text-gray-400">Coach : {liveSession.coach.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span>{liveSession.participants.length + 1}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Zone principale - Contenu Live */}
          <div className="lg:col-span-3 space-y-4">
            {/* Zone média */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
                  {liveSession.status === 'LIVE' ? (
                    <div className="text-center text-white">
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                      </div>
                      <p className="text-lg font-medium">Session en cours</p>
                      <p className="text-sm text-gray-400 mt-2">
                        Le contenu média sera affiché ici
                      </p>
                    </div>
                  ) : liveSession.status === 'SCHEDULED' ? (
                    <div className="text-center text-white">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                      <p className="text-lg font-medium">Session planifiée</p>
                      {liveSession.scheduledAt && (
                        <p className="text-sm text-gray-400 mt-2">
                          Début prévu : {new Date(liveSession.scheduledAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400">
                      <p>Session terminée</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {liveSession.description && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{liveSession.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Participants */}
          <div className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Coach */}
                <div className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{liveSession.coach.name}</p>
                    <p className="text-xs text-blue-400">Coach</p>
                  </div>
                </div>

                {/* Participants */}
                {liveSession.participants.length > 0 ? (
                  liveSession.participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm text-white">{p.user.name}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Aucun participant inscrit
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Actions Coach */}
            {isCoach && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Actions Coach</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {liveSession.status === 'SCHEDULED' && (
                    <Button className="w-full" data-testid="start-session-button">
                      Démarrer la session
                    </Button>
                  )}
                  {liveSession.status === 'LIVE' && (
                    <Button variant="destructive" className="w-full" data-testid="end-session-button">
                      Terminer la session
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
