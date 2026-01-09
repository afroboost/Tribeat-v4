/**
 * Admin Layout - STATIQUE
 * ZÉRO getServerSession() bloquant
 * L'auth est gérée par le middleware + composant client
 */

import { ReactNode, Suspense } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminSkeleton } from '@/components/admin/AdminSkeleton';

export default function AdminLayout({ children }: { children: ReactNode }) {
  // Layout STATIQUE - render immédiat
  // Le middleware a déjà vérifié l'auth et redirigé si nécessaire
  // Ici on render TOUJOURS
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>
        {children}
      </AdminShell>
    </Suspense>
  );
}
