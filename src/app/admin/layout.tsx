/**
 * Admin Layout - Ghost Access
 * 
 * Accès admin SECRET :
 * - Aucun lien visible dans l'UI publique
 * - Accessible uniquement via URL directe /admin
 * - ou via lien discret dans le footer (copyright)
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Récupérer la session côté serveur
  const session = await getServerSession(authOptions);

  // Debug log
  console.log('[ADMIN LAYOUT] Session check:', {
    hasSession: !!session,
    userEmail: session?.user?.email,
    userRole: session?.user?.role,
  });

  // Pas de session → page de login (avec message discret)
  if (!session) {
    console.log('[ADMIN LAYOUT] No session - redirecting to login');
    redirect('/auth/login?callbackUrl=/admin/dashboard');
  }

  // Session mais pas SUPER_ADMIN → accès refusé
  if (session.user?.role !== 'SUPER_ADMIN') {
    console.log('[ADMIN LAYOUT] Not SUPER_ADMIN - access denied');
    redirect('/403');
  }

  console.log('[ADMIN LAYOUT] Access granted');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
