import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authConfig';
import { prisma } from '@/lib/prisma';
import { isStripeConfigured } from '@/lib/stripe';
import { isPusherConfigured } from '@/lib/realtime/pusher';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function checkDb(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Works for both Postgres and SQLite.
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'db_error';
    // No secrets: truncate aggressively.
    return { ok: false, error: msg.slice(0, 120) };
  }
}

export default async function AdminSystemStatusPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/login?callbackUrl=/admin/system/status');
  if (session.user.role !== 'SUPER_ADMIN') redirect('/403');

  const stripeEnabled = isStripeConfigured();
  const pusherEnabled = isPusherConfigured();
  const db = await checkDb();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
        <p className="mt-2 text-gray-600">Vérifications runtime (sans secrets).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Stripe</div>
          <div className={`mt-1 font-semibold ${stripeEnabled ? 'text-green-700' : 'text-red-700'}`}>
            {stripeEnabled ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Pusher</div>
          <div className={`mt-1 font-semibold ${pusherEnabled ? 'text-green-700' : 'text-red-700'}`}>
            {pusherEnabled ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-gray-500">Database</div>
          <div className={`mt-1 font-semibold ${db.ok ? 'text-green-700' : 'text-red-700'}`}>
            {db.ok ? 'CONNECTED' : 'ERROR'}
          </div>
          {!db.ok && db.error ? <div className="mt-2 text-xs text-gray-500">{db.error}</div> : null}
        </div>
      </div>
    </div>
  );
}

