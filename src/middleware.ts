/**
 * Middleware - Protection des routes
 * 
 * RÈGLES:
 * - Ne bloque QUE si route protégée ET pas de cookie
 * - Ne bloque JAMAIS les routes de login/auth
 * - Logs pour debug
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const sessionToken = 
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  // Routes admin : cookie requis
  if (path.startsWith('/admin')) {
    if (!sessionToken) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Routes sessions : cookie requis
  if (path.startsWith('/sessions') || path.match(/^\/session\/[^/]+/)) {
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
