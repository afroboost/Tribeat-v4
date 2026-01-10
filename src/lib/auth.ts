/**
 * Authentication Utilities
 * Centralisation de la logique d'authentification et de redirection
 */

import { UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { requireCoachEntitlement } from '@/lib/access-control';

/**
 * Redirections par rôle - CENTRALISÉ
 * Utilisé après login pour rediriger intelligemment
 */
export const ROLE_REDIRECTS: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  COACH: '/coach/dashboard',
  PARTICIPANT: '/sessions',
};

/**
 * Récupère la redirection appropriée selon le rôle
 */
export function getRedirectByRole(role: UserRole): string {
  return ROLE_REDIRECTS[role];
}

/**
 * Récupère la session serveur (Server Components uniquement)
 * Retourne null si non authentifié
 */
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

/**
 * Vérifie si l'utilisateur est authentifié (Server Components)
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAuthSession();
  return !!session?.user;
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique (Server Components)
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const session = await getAuthSession();
  return session?.user?.role === role;
}

/**
 * Vérifie si l'utilisateur est Super Admin (Server Components)
 */
export async function isSuperAdmin(): Promise<boolean> {
  return await hasRole('SUPER_ADMIN');
}

/**
 * Vérifie si l'utilisateur est Coach ou Admin (Server Components)
 */
export async function isCoachOrAdmin(): Promise<boolean> {
  const session = await getAuthSession();
  if (!session?.user) return false;
  if (session.user.role === 'SUPER_ADMIN') return true;
  if (session.user.role !== 'COACH') return false;
  const entitlement = await requireCoachEntitlement({
    coachId: session.user.id,
    userRole: session.user.role,
  });
  return entitlement.allowed;
}

/**
 * Routes publiques (pas de protection middleware)
 */
export const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/register'];

/**
 * Routes protégées avec leurs rôles requis
 */
export const PROTECTED_ROUTES = {
  '/admin': ['SUPER_ADMIN'],
  '/coach': ['COACH', 'SUPER_ADMIN'],
  '/session': ['COACH', 'PARTICIPANT', 'SUPER_ADMIN'],
} as const;
