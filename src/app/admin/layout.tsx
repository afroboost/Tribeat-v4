/**
 * Admin Layout Next.js
 * Layout automatique pour toutes les pages /admin/*
 */

import { getAuthSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export default async function AdminLayout({ children }: { children: ReactNode }) {
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

        {/* Content - RENDU DES CHILDREN */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
