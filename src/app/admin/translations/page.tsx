/**
 * Page Admin - Gestion des Traductions
 * Éditeur i18n FR/EN/DE en temps réel
 */

import { AdminLayout } from '@/components/admin/AdminLayout';
import { TranslationEditor } from '@/components/admin/TranslationEditor';
import { getAllTranslations } from '@/actions/translations';

export default async function AdminTranslationsPage() {
  const result = await getAllTranslations();
  const translations = result.success ? result.data : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🌍 Gestion des Traductions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Modifiez les traductions FR/EN/DE. Les changements sont appliqués immédiatement.
          </p>
        </div>

        <TranslationEditor initialTranslations={translations || []} />
      </div>
    </AdminLayout>
  );
}
