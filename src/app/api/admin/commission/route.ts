import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

const KEY = 'platform_commission_percent';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return NextResponse.json({ error: auth.error }, { status: 403 });

  const setting = await prisma.uI_Settings.findUnique({ where: { key: KEY } });
  return NextResponse.json({ success: true, value: setting?.value ?? '20' });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.isAdmin) return NextResponse.json({ error: auth.error }, { status: 403 });

  const body = await request.json().catch(() => null);
  const value = Number(body?.value);
  if (!Number.isFinite(value)) {
    return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 });
  }
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  await prisma.uI_Settings.upsert({
    where: { key: KEY },
    update: { value: String(pct), category: 'GENERAL' as any },
    create: { key: KEY, value: String(pct), category: 'GENERAL' as any },
  });

  return NextResponse.json({ success: true, value: String(pct) });
}

