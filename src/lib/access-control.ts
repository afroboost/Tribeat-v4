/**
 * Session access control helpers (server-side).
 *
 * Rules:
 * - SUPER_ADMIN always allowed
 * - Session coach always allowed
 * - Otherwise: must have ACTIVE access (UserAccess) OR be a SessionParticipant
 */

import { prisma } from '@/lib/prisma';

export async function canAccessSession(opts: {
  sessionId: string;
  userId: string;
  userRole?: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  const { sessionId, userId, userRole } = opts;

  if (userRole === 'SUPER_ADMIN') return { allowed: true, reason: 'super_admin' };

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { coachId: true },
  });

  if (!session) return { allowed: false, reason: 'session_not_found' };
  if (session.coachId === userId) return { allowed: true, reason: 'coach' };

  const [access, participant] = await Promise.all([
    prisma.userAccess.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        AND: [
          {
            OR: [{ sessionId }, { sessionId: null }],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
      select: { id: true },
    }),
    prisma.sessionParticipant.findUnique({
      where: { userId_sessionId: { userId, sessionId } },
      select: { id: true },
    }),
  ]);

  if (access) return { allowed: true, reason: 'user_access' };
  if (participant) return { allowed: true, reason: 'participant' };

  return { allowed: false, reason: 'no_access' };
}

export async function requireCoachEntitlement(opts: {
  coachId: string;
  userRole?: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  const { coachId, userRole } = opts;
  if (userRole === 'SUPER_ADMIN') return { allowed: true, reason: 'super_admin' };

  const subscription = await prisma.coachSubscription.findUnique({
    where: { coachId },
    select: { status: true, expiresAt: true },
  });

  if (
    subscription?.status === 'ACTIVE' &&
    (!subscription.expiresAt || subscription.expiresAt > new Date())
  ) {
    return { allowed: true, reason: 'active_subscription' };
  }

  // "Admin free-grant" is represented as a global ACTIVE UserAccess (sessionId null)
  const freeGrant = await prisma.userAccess.findFirst({
    where: {
      userId: coachId,
      sessionId: null,
      status: 'ACTIVE',
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });

  if (freeGrant) return { allowed: true, reason: 'admin_free_grant' };

  // Promo-based entitlement: any redemption by this user with an active, non-expired promo code
  // and a completed transaction (idempotent / validated).
  const promo = await prisma.promoRedemption.findFirst({
    where: {
      userId: coachId,
      promoCode: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      transaction: {
        status: 'COMPLETED',
      },
    },
    select: { id: true },
  });

  if (promo) return { allowed: true, reason: 'promo_entitlement' };

  return { allowed: false, reason: 'no_entitlement' };
}

