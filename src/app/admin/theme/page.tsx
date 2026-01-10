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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🎨 Éditeur de Thème</h1>
        <p className="mt-2 text-gray-600">Personnalisez les couleurs et paramètres PWA.</p>
      </div>

      <ThemeEditor
        initialThemeSettings={themeSettings}
        initialPwaSettings={pwaSettings}
      />
    </div>
  );
}
