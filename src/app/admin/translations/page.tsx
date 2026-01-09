/**
 * Page Admin - Gestion des Traductions
 */

import { TranslationEditor } from '@/components/admin/TranslationEditor';
import { getAllTranslations } from '@/actions/translations';

// FORCE DYNAMIC
export const dynamic = 'force-dynamic';

export default async function AdminTranslationsPage() {
  let translations: any[] = [];

  try {
    const result = await getAllTranslations();
    translations = result.success ? (result.data || []) : [];
  } catch (e) {
    console.error('DB Error:', e);
  }

  return (
    <div className="space-y-6">
      <h1 style={{ color: 'red', fontSize: '24px', fontWeight: 'bold' }}>RENDER OK — TRANSLATIONS</h1>
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900">🌍 Gestion des Traductions</h2>
        <p className="mt-2 text-gray-600">Modifiez les traductions FR/EN/DE.</p>
      </div>

      <TranslationEditor initialTranslations={translations} />
    </div>
  );
}
