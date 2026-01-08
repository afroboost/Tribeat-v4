/**
 * Admin Layout Component
 * 
 * Layout réutilisable pour toutes les pages admin
 * - Sidebar navigation
 * - Header avec user info
 * - Double sécurité (middleware + serveur)
 */

import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

interface AdminLayoutProps {
  children: ReactNode;
}

export async function AdminLayout({ children }: AdminLayoutProps) {
  // Double sécurité : vérification serveur
  const session = await getAuthSession();

  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/403');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <AdminHeader user={session.user} />

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
