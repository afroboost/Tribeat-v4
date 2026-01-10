/**
 * Middleware - Protection des routes
 * 
 * RÈGLES:
 * - NE DOIT JAMAIS bloquer le rendu (pas de redirect hard côté middleware)
 * - Best-effort uniquement (headers), la protection réelle se fait dans:
 *   - UI (fallbacks) + Server Actions / API (vérification session + rôle)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  try {
    // Best-effort: indiquer présence d'un token (sans vérification/IO)
    const hasSessionToken =
      !!request.cookies.get('next-auth.session-token')?.value ||
      !!request.cookies.get('__Secure-next-auth.session-token')?.value;

    const response = NextResponse.next();
    response.headers.set('x-tribeat-has-auth-cookie', hasSessionToken ? '1' : '0');
    return response;
  } catch {
    // Ne jamais casser le rendu
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/sessions',
    '/session/:path*',
  ],
};
