/**
 * Liste des Sessions
 */

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Play, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
  const session = await getAuthSession();

  // Si pas de session, le middleware redirige déjà
  if (!session) {
    return null;
  }

  const sessions = await prisma.session.findMany({
    where: {
      OR: [
        { status: 'LIVE' },
        { status: 'SCHEDULED' },
        { participants: { some: { userId: session.user.id } } },
        { coachId: session.user.id }
      ]
    },
    include: {
      coach: { select: { name: true } },
      _count: { select: { participants: true } }
    },
    orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }]
  }).catch(() => []);

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    LIVE: { label: 'En direct', variant: 'destructive' },
    SCHEDULED: { label: 'Planifiée', variant: 'secondary' },
    COMPLETED: { label: 'Terminée', variant: 'outline' },
    DRAFT: { label: 'Brouillon', variant: 'outline' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
            <p className="text-sm text-gray-500">Bienvenue, {session.user.name}</p>
          </div>
          <Link href="/"><Button variant="outline">Accueil</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {sessions.length === 0 ? (
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <CardTitle>Aucune session disponible</CardTitle>
              <CardDescription>Revenez plus tard ou contactez votre coach.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <Card key={s.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                    <Badge variant={statusLabels[s.status]?.variant || 'outline'}>
                      {statusLabels[s.status]?.label || s.status}
                    </Badge>
                  </div>
                  {s.description && <CardDescription className="line-clamp-2">{s.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{s._count.participants} participant{s._count.participants > 1 ? 's' : ''}</span>
                    </div>
                    {s.scheduledAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(s.scheduledAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">Coach : {s.coach.name}</div>
                  <Link href={`/session/${s.id}`} className="block">
                    <Button className="w-full" variant={s.status === 'LIVE' ? 'default' : 'outline'}>
                      {s.status === 'LIVE' ? <><Play className="w-4 h-4 mr-2" />Rejoindre</> : 'Voir les détails'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
