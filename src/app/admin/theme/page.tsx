/**
 * Page Admin - Éditeur de Thème
 */

import { ThemeEditor } from '@/components/admin/ThemeEditor';
import { getUISettingsByCategory } from '@/actions/ui-settings';

export const dynamic = 'force-dynamic';

export default async function AdminThemePage() {
  const [themeResult, pwaResult] = await Promise.all([
    getUISettingsByCategory('THEME').catch(() => ({ success: false, data: [] })),
    getUISettingsByCategory('PWA').catch(() => ({ success: false, data: [] })),
  ]);

  const themeSettings = themeResult.success ? (themeResult.data || []) : [];
  const pwaSettings = pwaResult.success ? (pwaResult.data || []) : [];
  const hasLoadError = !themeResult.success || !pwaResult.success;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎨 Éditeur de Thème</h1>
        <p className="mt-2 text-gray-600">Personnalisez les couleurs et paramètres PWA.</p>
      </div>

      {hasLoadError && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Impossible de charger tous les paramètres. Rafraîchissez la page pour réessayer.
        </div>
      )}

      <ThemeEditor
        initialThemeSettings={themeSettings}
        initialPwaSettings={pwaSettings}
      />
    </div>
  );
}
