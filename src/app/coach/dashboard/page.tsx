/**
 * Dashboard Coach - COACH + SUPER_ADMIN
 * Route protégée par middleware
 */

import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CoachDashboardPage() {
  // Double sécurité : vérification côté serveur
  const session = await getAuthSession();

  if (!session || (session.user.role !== 'COACH' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/403');
  }

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
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Phase 5 : Dashboard Coach complet sera implémenté prochainement.
              </p>
            </CardContent>
          </Card>

          {/* Coming Soon */}
          <Card>
            <CardHeader>
              <CardTitle>🚧 En Développement - Phase 5</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400">
                Les fonctionnalités suivantes seront disponibles prochainement :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 dark:text-gray-500">
                <li>Créer et gérer vos sessions live</li>
                <li>Importer des médias (vidéo/audio/image)</li>
                <li>Contrôler la lecture synchronisée (play/pause/seek)</li>
                <li>Gérer les participants en temps réel</li>
                <li>Mixer audio (3 micros max)</li>
                <li>Chat en direct avec participants</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
