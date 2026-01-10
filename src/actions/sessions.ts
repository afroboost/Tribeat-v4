/**
 * Server Actions - Sessions
 * 
 * Sécurité Production :
 * - SUPER_ADMIN ou COACH pour création/édition
 * - Validation Zod
 * - Gestion des participants
 * - Revalidation cache
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isCoachOrAdmin, getAuthSession } from '@/lib/auth';
import { checkUserAccess } from '@/actions/access';
import { z } from 'zod';
import { SessionStatus, MediaType } from '@prisma/client';

// ========================================
// VALIDATION
// ========================================

const sessionSchema = z.object({
  title: z.string().min(3, 'Titre trop court'),
  description: z.string().optional(),
  coachId: z.string(),
  mediaUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  mediaType: z.enum(['VIDEO', 'AUDIO', 'IMAGE']).optional(),
  scheduledAt: z.string().or(z.date()),
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
  maxParticipants: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
});

// ========================================
// READ
// ========================================

/**
 * Récupère toutes les sessions
 */
export async function getAllSessions() {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        coach: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { participants: true, messages: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    return { success: true, data: sessions };
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return { success: false, error: 'Erreur lors de la récupération' };
  }
}

/**
 * Récupère une session par ID
 */
export async function getSessionById(id: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        coach: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
    return { success: true, data: session };
  } catch (error) {
    console.error('Error fetching session:', error);
    return { success: false, error: 'Session introuvable' };
  }
}

// ========================================
// CREATE
// ========================================

/**
 * Crée une nouvelle session
 * COACH ou SUPER_ADMIN uniquement
 */
export async function createSession(data: z.infer<typeof sessionSchema>) {
  try {
    // Sécurité : Vérification COACH ou ADMIN
    const canCreate = await isCoachOrAdmin();
    if (!canCreate) {
      return { success: false, error: 'Non autorisé' };
    }

    // Validation
    const validatedData = sessionSchema.parse(data);

    // Conversion date si nécessaire
    const scheduledAt =
      typeof validatedData.scheduledAt === 'string'
        ? new Date(validatedData.scheduledAt)
        : validatedData.scheduledAt;

    // Création session
    const session = await prisma.session.create({
      data: {
        ...validatedData,
        scheduledAt,
        status: validatedData.status || 'SCHEDULED',
        isPublic: validatedData.isPublic ?? true,
      },
    });

    // Revalidation cache
    revalidatePath('/admin/sessions');
    revalidatePath('/sessions');

    return { success: true, data: session };
  } catch (error) {
    console.error('Error creating session:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides' };
    }
    return { success: false, error: 'Erreur lors de la création' };
  }
}

// ========================================
// UPDATE
// ========================================

/**
 * Met à jour une session
 * COACH propriétaire ou SUPER_ADMIN uniquement
 */
export async function updateSession(id: string, data: Partial<z.infer<typeof sessionSchema>>) {
  try {
    // Sécurité : Vérification permissions
    const session = await getAuthSession();
    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que l'utilisateur est le coach de cette session ou admin
    const existingSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return { success: false, error: 'Session introuvable' };
    }

    const isOwner = existingSession.coachId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Conversion date si nécessaire
    const updateData: any = { ...data };
    if (data.scheduledAt) {
      updateData.scheduledAt =
        typeof data.scheduledAt === 'string' ? new Date(data.scheduledAt) : data.scheduledAt;
    }

    // Update
    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateData,
    });

    // Revalidation cache
    revalidatePath('/admin/sessions');
    revalidatePath('/sessions');
    revalidatePath(`/session/${id}`);

    return { success: true, data: updatedSession };
  } catch (error) {
    console.error('Error updating session:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

// ========================================
// DELETE
// ========================================

/**
 * Supprime une session
 * COACH propriétaire ou SUPER_ADMIN uniquement
 */
export async function deleteSession(id: string) {
  try {
    // Sécurité : Vérification permissions
    const session = await getAuthSession();
    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    const existingSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return { success: false, error: 'Session introuvable' };
    }

    const isOwner = existingSession.coachId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Suppression (cascade défini dans Prisma)
    await prisma.session.delete({
      where: { id },
    });

    // Revalidation cache
    revalidatePath('/admin/sessions');
    revalidatePath('/sessions');

    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}

// ========================================
// SESSION LIVE CONTROLS
// ========================================

/**
 * Démarre une session (passe en LIVE)
 * COACH propriétaire ou SUPER_ADMIN uniquement
 */
export async function startSession(id: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    const existingSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return { success: false, error: 'Session introuvable' };
    }

    const isOwner = existingSession.coachId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    if (existingSession.status === 'LIVE') {
      return { success: false, error: 'Session déjà en cours' };
    }

    if (existingSession.status === 'COMPLETED') {
      return { success: false, error: 'Session déjà terminée' };
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: 'LIVE',
        startedAt: new Date(),
      },
    });

    revalidatePath('/admin/sessions');
    revalidatePath('/sessions');
    revalidatePath(`/session/${id}`);

    return { success: true, data: updatedSession };
  } catch (error) {
    console.error('Error starting session:', error);
    return { success: false, error: 'Erreur lors du démarrage' };
  }
}

/**
 * Termine une session (passe en COMPLETED)
 * COACH propriétaire ou SUPER_ADMIN uniquement
 */
export async function endSessionAction(id: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    const existingSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return { success: false, error: 'Session introuvable' };
    }

    const isOwner = existingSession.coachId === session.user.id;
    const isAdmin = session.user.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    // Money flow: on fin de session, déplacer pending -> available pour ce coach (uniquement les paiements de cette session)
    await prisma.$transaction(async (tx) => {
      const sum = await tx.sessionPayment.aggregate({
        where: {
          sessionId: id,
          status: 'PAID',
          releasedToCoachAt: null,
        },
        _sum: { coachCut: true },
      });

      const coachCutTotal = sum._sum.coachCut || 0;
      if (coachCutTotal <= 0) return;

      // Locking isn't available on sqlite; we rely on atomic updates + releasedToCoachAt marker.
      const wallet = await tx.coachWallet.findUnique({
        where: { coachId: existingSession.coachId },
        select: { id: true },
      });

      if (!wallet) {
        // If wallet doesn't exist, nothing to release (should not happen if there were payments)
        return;
      }

      await tx.coachWallet.update({
        where: { coachId: existingSession.coachId },
        data: {
          pendingAmount: { decrement: coachCutTotal },
          availableAmount: { increment: coachCutTotal },
        },
      });

      await tx.sessionPayment.updateMany({
        where: {
          sessionId: id,
          status: 'PAID',
          releasedToCoachAt: null,
        },
        data: { releasedToCoachAt: new Date() },
      });
    });

    revalidatePath('/admin/sessions');
    revalidatePath('/sessions');
    revalidatePath(`/session/${id}`);

    return { success: true, data: updatedSession };
  } catch (error) {
    console.error('Error ending session:', error);
    return { success: false, error: 'Erreur lors de l\'arrêt' };
  }
}

/**
 * Rejoindre une session en tant que participant
 */
export async function joinSession(sessionId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    const liveSession = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!liveSession) {
      return { success: false, error: 'Session introuvable' };
    }

    // ENFORCEMENT SERVER-SIDE: accès requis (payant OU free access), sauf exceptions (coach/admin, public live)
    const access = await checkUserAccess(session.user.id, sessionId);
    if (!access.hasAccess) {
      return { success: false, error: 'Accès requis pour rejoindre cette session' };
    }

    // Vérifier si déjà participant
    const existing = await prisma.sessionParticipant.findUnique({
      where: {
        userId_sessionId: {
          userId: session.user.id,
          sessionId,
        },
      },
    });

    if (existing) {
      return { success: true, data: existing, message: 'Déjà inscrit' };
    }

    // Vérifier limite participants
    if (liveSession.maxParticipants) {
      const count = await prisma.sessionParticipant.count({
        where: { sessionId },
      });
      if (count >= liveSession.maxParticipants) {
        return { success: false, error: 'Session complète' };
      }
    }

    // Créer le participant
    const participant = await prisma.sessionParticipant.create({
      data: {
        userId: session.user.id,
        sessionId,
        role: 'PARTICIPANT',
      },
    });

    revalidatePath(`/session/${sessionId}`);

    return { success: true, data: participant };
  } catch (error) {
    console.error('Error joining session:', error);
    return { success: false, error: 'Erreur lors de l\'inscription' };
  }
}

