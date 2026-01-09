/**
 * Middleware SIMPLIFIÉ
 * Fait UNIQUEMENT : vérifier existence token
 * AUCUNE logique métier, AUCUNE DB
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Vérifier la présence d'un cookie de session NextAuth
  const sessionToken = 
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  // Routes admin : token requis
  if (path.startsWith('/admin')) {
    if (!sessionToken) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
    // Le rôle sera vérifié côté serveur dans le layout
  }

  // Routes protégées : token requis
  if (path.startsWith('/sessions') || path.startsWith('/session/')) {
    if (!sessionToken) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/sessions',
    '/session/:path*',
  ],
};
