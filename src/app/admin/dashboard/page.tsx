/**
 * Dashboard Admin
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Récupérer les stats
  const [userCount, sessionCount, settingsCount, translationsCount] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.session.count().catch(() => 0),
    prisma.uI_Settings.count().catch(() => 0),
    prisma.translation.count().catch(() => 0),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vue d'Ensemble</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Bienvenue dans le dashboard admin Tribeat.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">👥 Utilisateurs</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{userCount}</p>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">🎥 Sessions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{sessionCount}</p>
            <p className="text-sm text-gray-500">Créées</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">⚙️ Paramètres</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{settingsCount}</p>
            <p className="text-sm text-gray-500">UI Settings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">🌍 Traductions</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{translationsCount}</p>
            <p className="text-sm text-gray-500">Clés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/admin/theme" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <h3 className="font-semibold mb-1">🎨 Modifier le Thème</h3>
              <p className="text-sm text-gray-600">Personnalisez couleurs et fonts</p>
            </a>
            <a href="/admin/translations" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <h3 className="font-semibold mb-1">🌍 Gérer Traductions</h3>
              <p className="text-sm text-gray-600">Modifier FR/EN/DE</p>
            </a>
            <a href="/admin/sessions" className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <h3 className="font-semibold mb-1">🎥 Créer Session</h3>
              <p className="text-sm text-gray-600">Nouvelle session live</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
