/**
 * Liste des Sessions - TOUS UTILISATEURS AUTHENTIFIÉS
 * Route protégée par middleware
 */

import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SessionsPage() {
  // Double sécurité : vérification côté serveur
  const session = await getAuthSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎬 Sessions Live
          </h1>
          <Link href="/">
            <Button variant="outline" data-testid="sessions-home-button">
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
                Découvrez et rejoignez les sessions live disponibles.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Phase 5 : Liste et accès aux sessions sera implémenté prochainement.
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
                <li>Liste des sessions live (LIVE, SCHEDULED, COMPLETED)</li>
                <li>Rejoindre une session en un clic</li>
                <li>Lecture vidéo/audio synchronisée</li>
                <li>Chat en temps réel avec les participants</li>
                <li>Notifications de début de session</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
