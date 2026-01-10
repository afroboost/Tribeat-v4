/**
 * Auth Helper - Server-side session verification
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';

export interface AuthResult {
  authenticated: boolean;
  isAdmin: boolean;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  error?: string;
}

/**
 * Vérifier l'authentification et le rôle admin
 * À utiliser dans CHAQUE Server Action critique
 */
export async function requireAdmin(): Promise<AuthResult> {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('[AUTH] requireAdmin getServerSession failed', error);
    session = null;
  }
  
  if (!session?.user) {
    return {
      authenticated: false,
      isAdmin: false,
      error: 'Non authentifié',
    };
  }

  const isAdmin = session.user.role === 'SUPER_ADMIN';
  
  return {
    authenticated: true,
    isAdmin,
    userId: session.user.id,
    userEmail: session.user.email || undefined,
    userRole: session.user.role,
    error: isAdmin ? undefined : 'Accès admin requis',
  };
}

/**
 * Vérifier l'authentification simple (user connecté)
 */
export async function requireAuth(): Promise<AuthResult> {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('[AUTH] requireAuth getServerSession failed', error);
    session = null;
  }
  
  if (!session?.user) {
    return {
      authenticated: false,
      isAdmin: false,
      error: 'Non authentifié',
    };
  }

  return {
    authenticated: true,
    isAdmin: session.user.role === 'SUPER_ADMIN',
    userId: session.user.id,
    userEmail: session.user.email || undefined,
    userRole: session.user.role,
  };
}

/**
 * Logger les actions admin (audit minimal)
 */
export function logAdminAction(
  action: string,
  userId: string,
  details?: Record<string, unknown>
): void {
  console.log(`[ADMIN ACTION] ${new Date().toISOString()} | ${action} | User: ${userId}`, details || '');
}
