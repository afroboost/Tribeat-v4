/**
 * NextAuth.js Route Handler
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { NextResponse } from 'next/server';

const handler = NextAuth(authOptions);

function envGuard() {
  // Explicit, visible failures (avoid mysterious crashes)
  if (!process.env.NEXTAUTH_SECRET) {
    return NextResponse.json(
      {
        error: 'NEXTAUTH_SECRET is missing. Configure it in Vercel Environment Variables.',
        code: 'ENV_MISSING_NEXTAUTH_SECRET',
      },
      { status: 500 }
    );
  }
  return null;
}

export async function GET(request: Request, context: unknown) {
  const guard = envGuard();
  if (guard) return guard;
  return handler(request, context);
}

export async function POST(request: Request, context: unknown) {
  const guard = envGuard();
  if (guard) return guard;
  return handler(request, context);
}
