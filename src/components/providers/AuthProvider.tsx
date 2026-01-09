/**
 * Auth Provider Component
 * Wrapper SessionProvider pour accès session côté client
 * 
 * NOTE: basePath="/auth-api" car /api/* est intercepté par le proxy Kubernetes
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath="/auth-api">
      {children}
    </SessionProvider>
  );
}
