/**
 * Admin System Status (no secrets).
 * GET /api/admin/system/status
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { isStripeConfigured, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe';
import { isPusherConfigured } from '@/lib/realtime/pusher';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  let dbOk = false;
  try {
    // Lightweight DB check (does not leak data)
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    console.error('[SYSTEM STATUS] DB check failed:', e);
    dbOk = false;
  }

  return NextResponse.json({
    ok: true,
    env: process.env.NODE_ENV || 'unknown',
    db: { configured: !!process.env.DATABASE_URL, ok: dbOk },
    stripe: {
      configured: isStripeConfigured(),
      webhookSecretConfigured: !!STRIPE_WEBHOOK_SECRET,
    },
    pusher: { configured: isPusherConfigured() },
  });
}

