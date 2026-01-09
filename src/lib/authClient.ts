/**
 * Auth Client Utils
 * Wrappers pour les fonctions NextAuth avec basePath personnalisé
 */

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, SignInOptions, SignOutParams } from 'next-auth/react';

// Base path pour NextAuth (doit correspondre à NEXTAUTH_URL)
export const AUTH_BASE_PATH = '/nextauth';

/**
 * Sign in wrapper avec basePath personnalisé
 */
export async function signIn(
  provider?: string,
  options?: SignInOptions,
  authorizationParams?: Record<string, string>
) {
  // Créer une URL complète pour le callback
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  return nextAuthSignIn(provider, {
    ...options,
    // Force redirect to our custom auth path
    callbackUrl: options?.callbackUrl || '/',
  }, authorizationParams);
}

/**
 * Sign out wrapper
 */
export async function signOut(options?: SignOutParams) {
  return nextAuthSignOut({
    ...options,
    callbackUrl: options?.callbackUrl || '/',
  });
}
