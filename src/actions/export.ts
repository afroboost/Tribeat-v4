/**
 * Server Actions - Export Data
 * 
 * Sécurité Production :
 * - SUPER_ADMIN uniquement
 * - Export CSV et JSON
 * - Formats standardisés
 */

'use server';

import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/auth';

// ========================================
// HELPERS
// ========================================

/**
 * Convertit un tableau d'objets en CSV
 */
function arrayToCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // Header
  csvRows.push(headers.join(','));
  
  // Rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Escape commas and quotes
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// ========================================
// EXPORT USERS
// ========================================

/**
 * Exporte tous les utilisateurs (CSV ou JSON)
 * SUPER_ADMIN uniquement
 */
export async function exportUsers(format: 'csv' | 'json' = 'csv') {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Récupération des données
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format CSV
    if (format === 'csv') {
      const headers = ['id', 'email', 'name', 'role', 'createdAt'];
      const csv = arrayToCSV(users, headers);
      return { success: true, data: csv, filename: 'users.csv' };
    }

    // Format JSON
    return { success: true, data: JSON.stringify(users, null, 2), filename: 'users.json' };
  } catch (error) {
    console.error('Error exporting users:', error);
    return { success: false, error: "Erreur lors de l'export" };
  }
}

// ========================================
// EXPORT SESSIONS
// ========================================

/**
 * Exporte toutes les sessions (CSV ou JSON)
 * SUPER_ADMIN uniquement
 */
export async function exportSessions(format: 'csv' | 'json' = 'csv') {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Récupération des données
    const sessions = await prisma.session.findMany({
      include: {
        coach: {
          select: { name: true, email: true },
        },
        _count: {
          select: { participants: true, messages: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    });

    // Aplatir les données pour CSV
    const flatSessions = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      coachName: s.coach.name,
      coachEmail: s.coach.email,
      status: s.status,
      scheduledAt: s.scheduledAt,
      participantsCount: s._count.participants,
      messagesCount: s._count.messages,
      mediaUrl: s.mediaUrl || '',
      mediaType: s.mediaType || '',
    }));

    // Format CSV
    if (format === 'csv') {
      const headers = [
        'id',
        'title',
        'coachName',
        'coachEmail',
        'status',
        'scheduledAt',
        'participantsCount',
        'messagesCount',
        'mediaUrl',
        'mediaType',
      ];
      const csv = arrayToCSV(flatSessions, headers);
      return { success: true, data: csv, filename: 'sessions.csv' };
    }

    // Format JSON
    return { success: true, data: JSON.stringify(sessions, null, 2), filename: 'sessions.json' };
  } catch (error) {
    console.error('Error exporting sessions:', error);
    return { success: false, error: "Erreur lors de l'export" };
  }
}

// ========================================
// EXPORT UI SETTINGS
// ========================================

/**
 * Exporte tous les UI_Settings (JSON uniquement)
 * SUPER_ADMIN uniquement
 */
export async function exportUISettings() {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Récupération des données
    const settings = await prisma.uI_Settings.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    return {
      success: true,
      data: JSON.stringify(settings, null, 2),
      filename: 'ui-settings.json',
    };
  } catch (error) {
    console.error('Error exporting UI settings:', error);
    return { success: false, error: "Erreur lors de l'export" };
  }
}

// ========================================
// EXPORT TRANSLATIONS
// ========================================

/**
 * Exporte toutes les traductions (JSON uniquement)
 * SUPER_ADMIN uniquement
 */
export async function exportTranslations() {
  try {
    // Sécurité : Vérification SUPER_ADMIN
    const isAdmin = await isSuperAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Non autorisé' };
    }

    // Récupération des données
    const translations = await prisma.translation.findMany({
      orderBy: [{ key: 'asc' }, { language: 'asc' }],
    });

    return {
      success: true,
      data: JSON.stringify(translations, null, 2),
      filename: 'translations.json',
    };
  } catch (error) {
    console.error('Error exporting translations:', error);
    return { success: false, error: "Erreur lors de l'export" };
  }
}
