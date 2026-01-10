/**
 * Dashboard Coach - COACH + SUPER_ADMIN
 * Route protégée par middleware
 */

import { getAuthSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getActiveCoachSubscription } from '@/lib/monetization';

export const dynamic = 'force-dynamic';

export default async function CoachDashboardPage() {
  // Double sécurité : vérification côté serveur
  const session = await getAuthSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connexion requise</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Connectez-vous pour accéder au dashboard coach.
            </p>
            <div className="flex gap-3">
              <Link href="/auth/login?callbackUrl=/coach/dashboard">
                <Button>Se connecter</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Accueil</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <div className="flex gap-3">
              <Link href="/"><Button>Accueil</Button></Link>
              <Link href="/sessions"><Button variant="outline">Sessions</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // COACH subscription is mandatory (admins bypass)
  if (session.user.role === 'COACH') {
    const sub = await getActiveCoachSubscription(session.user.id);
    if (!sub) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Abonnement requis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pour accéder aux fonctionnalités coach (dashboard, création de sessions), un abonnement actif est requis.
              </p>
              <div className="flex gap-3">
                <Link href="/"><Button>Accueil</Button></Link>
                <Link href="/sessions"><Button variant="outline">Sessions</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Earnings summary (coach-only; admins see platform admin pages)
  const coachId = session.user.id;
  const balance = await prisma.coachBalance
    .findUnique({ where: { coachId } })
    .catch(() => null);
  const revenueBySession = await prisma.sessionPayment
    .groupBy({
      by: ['sessionId'],
      where: { session: { coachId }, status: 'PAID' },
      _sum: { amount: true, coachCut: true, platformCut: true },
      _count: { _all: true },
    })
    .catch(() => []);
  const sessions = await prisma.session
    .findMany({
      where: { coachId },
      select: { id: true, title: true, status: true, scheduledAt: true },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
    })
    .catch(() => []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎯 Coach Dashboard
          </h1>
          <Link href="/">
            <Button variant="outline" data-testid="coach-home-button">
              Retour Accueil
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle>Bienvenue, {session.user.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Vous êtes connecté en tant que <strong>Coach</strong>.
              </p>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Revenus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Total gagné</p>
                  <p className="text-2xl font-bold">
                    {((balance?.totalEarned ?? 0) / 100).toFixed(2)} {balance?.currency ?? 'CHF'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">Disponible</p>
                  <p className="text-2xl font-bold">
                    {((balance?.availableAmount ?? 0) / 100).toFixed(2)} {balance?.currency ?? 'CHF'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <p className="text-sm text-gray-500">En attente</p>
                  <p className="text-2xl font-bold">
                    {((balance?.pendingAmount ?? 0) / 100).toFixed(2)} {balance?.currency ?? 'CHF'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Session</th>
                      <th className="text-right py-2">Paiements</th>
                      <th className="text-right py-2">Coach</th>
                      <th className="text-right py-2">Plateforme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const agg = revenueBySession.find((r) => r.sessionId === s.id);
                      return (
                        <tr key={s.id} className="border-b">
                          <td className="py-2">
                            <div className="font-medium">{s.title}</div>
                            <div className="text-xs text-gray-500">{s.status}</div>
                          </td>
                          <td className="py-2 text-right">{agg?._count?._all ?? 0}</td>
                          <td className="py-2 text-right">
                            {(((agg?._sum?.coachCut ?? 0) as number) / 100).toFixed(2)}
                          </td>
                          <td className="py-2 text-right">
                            {(((agg?._sum?.platformCut ?? 0) as number) / 100).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
