/**
 * Auth Provider Component
 * Wrapper SessionProvider pour accès session côté client
 * 
 * NOTE: basePath="/nextauth" car /api/* est intercepté par le proxy Kubernetes
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

// Chemin personnalisé pour NextAuth (évite le conflit avec proxy /api/*)
const AUTH_BASE_PATH = '/nextauth';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider 
      basePath={AUTH_BASE_PATH}
      refetchInterval={0} // Disable auto-refresh to avoid 404 errors
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}

// Export for use in signIn/signOut calls
export { AUTH_BASE_PATH };
