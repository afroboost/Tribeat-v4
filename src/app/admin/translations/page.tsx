/**
 * Page Admin - Gestion des Traductions
 */

import { TranslationEditor } from '@/components/admin/TranslationEditor';
import { getAllTranslations } from '@/actions/translations';

export const dynamic = 'force-dynamic';

export default async function AdminTranslationsPage() {
  const result = await getAllTranslations().catch(() => ({ success: false, data: [] }));
  const translations = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🌍 Gestion des Traductions</h1>
        <p className="mt-2 text-gray-600">Modifiez les traductions FR/EN/DE.</p>
      </div>

      <TranslationEditor initialTranslations={translations} />
    </div>
  );
}
