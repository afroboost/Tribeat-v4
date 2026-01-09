/**
 * Admin Layout - RENDER TOUJOURS
 * Vérification rôle côté serveur APRÈS render
 * UI dégradée si auth échoue
 */

import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let session = null;
  let authError = false;

  // Récupérer session - NE JAMAIS bloquer le render
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('[ADMIN] Auth error:', error);
    authError = true;
  }

  // Auth échouée → UI dégradée (pas page blanche)
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Service temporairement indisponible</h1>
          <p className="text-gray-600 mb-6">L'authentification est momentanément lente. Veuillez réessayer.</p>
          <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Pas de session → rediriger vers login (le middleware devrait avoir fait ça)
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h1>
          <p className="text-gray-600 mb-6">Veuillez vous connecter pour accéder à l'administration.</p>
          <Link 
            href="/auth/login?callbackUrl=/admin/dashboard" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  // Pas admin → accès refusé
  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-xl font-bold text-red-600 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-2">Connecté: {session.user.email}</p>
          <p className="text-gray-600 mb-6">Rôle requis: SUPER_ADMIN</p>
          <Link href="/" className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Admin OK → render complet
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader user={session.user} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
