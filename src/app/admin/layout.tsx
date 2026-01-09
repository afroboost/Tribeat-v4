/**
 * Admin Layout - 100% statique
 * Auth gérée par middleware UNIQUEMENT
 */

import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Récupérer la session pour l'affichage (header)
  // Le middleware a DÉJÀ vérifié l'accès - pas de redirect ici
  const session = await getServerSession(authOptions);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader user={session?.user || null} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
