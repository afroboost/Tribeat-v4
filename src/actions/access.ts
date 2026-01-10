'use server';

/**
 * Server Actions - Gestion des Accès
 * SÉCURISÉ: Vérification admin dans chaque action critique
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin, logAdminAction } from '@/lib/auth-helpers';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Récupérer tous les accès (ADMIN ONLY)
 */
export async function getAccesses(): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const accesses = await prisma.userAccess.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        session: { select: { id: true, title: true } },
        transaction: { select: { id: true, amount: true, provider: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });
    return { success: true, data: accesses };
  } catch (error) {
    console.error('Error fetching accesses:', error);
    return { success: false, error: 'Erreur lors de la récupération' };
  }
}

/**
 * Créer un accès manuel (ADMIN ONLY)
 */
export async function createManualAccess(
  userId: string,
  sessionId?: string,
  expiresAt?: Date
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const access = await prisma.userAccess.create({
      data: {
        userId,
        sessionId: sessionId || null,
        status: 'ACTIVE',
        grantedAt: new Date(),
        expiresAt: expiresAt || null,
      },
      include: {
        user: { select: { name: true, email: true } },
        session: { select: { title: true } },
      },
    });

    logAdminAction('CREATE_MANUAL_ACCESS', auth.userId!, {
      accessId: access.id,
      userId,
      sessionId,
    });

    revalidatePath('/admin/access');
    return { success: true, data: access };
  } catch (error) {
    console.error('Error creating access:', error);
    return { success: false, error: 'Erreur lors de la création' };
  }
}

/**
 * Révoquer un accès (ADMIN ONLY)
 */
export async function revokeAccess(accessId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const access = await prisma.userAccess.findUnique({
      where: { id: accessId },
    });

    if (!access) {
      return { success: false, error: 'Accès non trouvé' };
    }

    if (access.status === 'REVOKED') {
      return { success: false, error: 'Accès déjà révoqué' };
    }

    await prisma.userAccess.update({
      where: { id: accessId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: auth.userId,
      },
    });

    logAdminAction('REVOKE_ACCESS', auth.userId!, {
      accessId,
      userId: access.userId,
    });

    revalidatePath('/admin/access');
    return { success: true };
  } catch (error) {
    console.error('Error revoking access:', error);
    return { success: false, error: 'Erreur lors de la révocation' };
  }
}

/**
 * Réactiver un accès révoqué (ADMIN ONLY)
 */
export async function reactivateAccess(accessId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    await prisma.userAccess.update({
      where: { id: accessId },
      data: {
        status: 'ACTIVE',
        revokedAt: null,
        revokedBy: null,
      },
    });

    logAdminAction('REACTIVATE_ACCESS', auth.userId!, { accessId });

    revalidatePath('/admin/access');
    return { success: true };
  } catch (error) {
    console.error('Error reactivating access:', error);
    return { success: false, error: 'Erreur lors de la réactivation' };
  }
}

/**
 * Supprimer un accès (ADMIN ONLY)
 */
export async function deleteAccess(accessId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.isAdmin) {
    return { success: false, error: auth.error };
  }

  try {
    const access = await prisma.userAccess.findUnique({
      where: { id: accessId },
    });

    if (!access) {
      return { success: false, error: 'Accès non trouvé' };
    }

    await prisma.userAccess.delete({
      where: { id: accessId },
    });

    logAdminAction('DELETE_ACCESS', auth.userId!, {
      accessId,
      userId: access.userId,
    });

    revalidatePath('/admin/access');
    return { success: true };
  } catch (error) {
    console.error('Error deleting access:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

/**
 * Vérifier si un utilisateur a accès à une session
 */
export async function checkUserAccess(
  userId: string,
  sessionId: string
): Promise<{ hasAccess: boolean; reason?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (user?.role === 'SUPER_ADMIN') {
      return { hasAccess: true, reason: 'super_admin' };
    }

    // Charger la session (et son coach) une fois
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { isPublic: true, status: true, coachId: true },
    });

    if (session?.coachId === userId) {
      return { hasAccess: true, reason: 'coach_owner' };
    }

    if (session?.isPublic && session?.status === 'LIVE') {
      return { hasAccess: true, reason: 'public_live_session' };
    }

    // Vérifier FreeAccessGrant (ADMIN ou PROMO CODE) : global ou session, non révoqué, non expiré
    const freeAccess = await prisma.freeAccessGrant.findFirst({
      where: {
        userId,
        revokedAt: null,
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
    });

    if (freeAccess) {
      return { hasAccess: true, reason: 'free_access' };
    }

    // Vérifier PromoRedemption FULL_FREE : global ou session (promo scope figée à la redemption)
    const promoFree = await prisma.promoRedemption.findFirst({
      where: {
        userId,
        promoType: 'FULL_FREE',
        OR: [{ sessionId }, { sessionId: null }],
      },
      select: { id: true },
    });

    if (promoFree) {
      return { hasAccess: true, reason: 'promo_full_free' };
    }

    // Vérifier UserAccess (accès payant) : global ou session, actif, non expiré
    const paidAccess = await prisma.userAccess.findFirst({
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
    });

    if (paidAccess) {
      return { hasAccess: true, reason: 'paid_access' };
    }

    return { hasAccess: false, reason: 'no_access' };
  } catch (error) {
    console.error('Error checking access:', error);
    return { hasAccess: false, reason: 'error' };
  }
}
