/**
 * Server Actions - Users
 * 
 * Sécurité Production :
 * - SUPER_ADMIN uniquement
 * - Gestion des rôles
 * - Pas de suppression de son propre compte
 */

'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin, getAuthSession } from '@/lib/auth';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// ========================================
// VALIDATION
// ========================================

const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(['SUPER_ADMIN', 'COACH', 'PARTICIPANT']),
});

const updateUserProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
});

// ========================================
// READ
// ========================================

/**
 * Récupère tous les utilisateurs
 * SUPER_ADMIN uniquement
 */
export async function getAllUsers() {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            coachedSessions: true,
            sessionRoles: true,
            messages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Erreur lors de la récupération' };
  }
}

/**
 * Récupère un utilisateur par ID
 * SUPER_ADMIN uniquement
 */
export async function getUserById(id: string) {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        coachedSessions: {
          select: {
            id: true,
            title: true,
            status: true,
            scheduledAt: true,
          },
        },
        sessionRoles: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data: user };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Utilisateur introuvable' };
  }
}

// ========================================
// UPDATE
// ========================================

/**
 * Change le rôle d'un utilisateur
 * SUPER_ADMIN uniquement
 */
export async function updateUserRole(data: z.infer<typeof updateUserRoleSchema>) {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const session = await getAuthSession();
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Non autorisé' };
    }

    // Validation
    const validatedData = updateUserRoleSchema.parse(data);

    // Empêcher de changer son propre rôle
    if (validatedData.userId === session.user.id) {
      return { success: false, error: 'Impossible de modifier votre propre rôle' };
    }

    // Update
    const user = await prisma.user.update({
      where: { id: validatedData.userId },
      data: { role: validatedData.role },
    });

    // Revalidation cache
    revalidatePath('/admin/users');

    return { success: true, data: user };
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides' };
    }
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

/**
 * Met à jour le profil d'un utilisateur
 * L'utilisateur lui-même ou SUPER_ADMIN
 */
export async function updateUserProfile(
  userId: string,
  data: z.infer<typeof updateUserProfileSchema>
) {
  try {
    // Sécurité : Vérification
    const session = await getAuthSession();
    if (!session) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que c'est son propre profil ou admin
    const isOwnProfile = session.user.id === userId;
    const isAdmin = session.user.role === 'SUPER_ADMIN';

    if (!isOwnProfile && !isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Validation
    const validatedData = updateUserProfileSchema.parse(data);

    // Update
    const user = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
    });

    // Revalidation cache
    revalidatePath('/admin/users');

    return { success: true, data: user };
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Données invalides' };
    }
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
}

// ========================================
// DELETE
// ========================================

/**
 * Supprime un utilisateur
 * SUPER_ADMIN uniquement
 */
export async function deleteUser(userId: string) {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const session = await getAuthSession();
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Non autorisé' };
    }

    // Empêcher de supprimer son propre compte
    if (userId === session.user.id) {
      return { success: false, error: 'Impossible de supprimer votre propre compte' };
    }

    // Suppression (cascade défini dans Prisma)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Revalidation cache
    revalidatePath('/admin/users');

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}
