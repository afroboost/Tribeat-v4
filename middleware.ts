/**
 * Middleware Next.js - Protection des Routes
 * 
 * Architecture Edge Runtime :
 * - Utilise getToken() au lieu de getServerSession() (Edge compatible)
 * - Pas d'appel DB (ultra-rapide)
 * - Lecture directe du JWT
 * 
 * Sécurité :
 * - Protection /admin (SUPER_ADMIN uniquement)
 * - Protection /coach (COACH + SUPER_ADMIN)
 * - Protection /session (authentifié)
 * - Redirections strictes /login ou /403
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Récupération du token JWT (Edge compatible, pas d'appel DB)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // ========================================
  // PROTECTION /admin - SUPER_ADMIN UNIQUEMENT
  // ========================================
  if (pathname.startsWith('/admin')) {
    // Non authentifié : redirection login
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authentifié mais pas SUPER_ADMIN : accès refusé
    if (token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    // SUPER_ADMIN : accès autorisé
    return NextResponse.next();
  }

  // ========================================
  // PROTECTION /coach - COACH + SUPER_ADMIN
  // ========================================
  if (pathname.startsWith('/coach')) {
    // Non authentifié : redirection login
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Vérification rôle
    if (token.role !== 'COACH' && token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    return NextResponse.next();
  }

  // ========================================
  // PROTECTION /session/[id] - AUTHENTIFIÉ
  // ========================================
  if (pathname.startsWith('/session/')) {
    // Non authentifié : redirection login
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authentifié : accès autorisé
    return NextResponse.next();
  }

  // ========================================
  // REDIRECTION SI DÉJÀ AUTHENTIFIÉ SUR /auth/*
  // ========================================
  if (pathname.startsWith('/auth/') && token) {
    // Redirection intelligente selon rôle
    const redirects: Record<string, string> = {
      SUPER_ADMIN: '/admin/dashboard',
      COACH: '/coach/dashboard',
      PARTICIPANT: '/sessions',
    };

    const redirectUrl = redirects[token.role as string] || '/';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Routes publiques : laisser passer
  return NextResponse.next();
}

// Configuration : routes à protéger
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - api (sauf auth)
     * - _next/static
     * - _next/image
     * - favicon.ico
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
