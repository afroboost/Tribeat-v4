/**
 * Page Admin - Éditeur de Thème
 */

import { ThemeEditor } from '@/components/admin/ThemeEditor';
import { getUISettingsByCategory } from '@/actions/ui-settings';

// FORCE DYNAMIC
export const dynamic = 'force-dynamic';

export default async function AdminThemePage() {
  let themeSettings: any[] = [];
  let pwaSettings: any[] = [];

  try {
    const [themeResult, pwaResult] = await Promise.all([
      getUISettingsByCategory('THEME'),
      getUISettingsByCategory('PWA'),
    ]);
    themeSettings = themeResult.success ? (themeResult.data || []) : [];
    pwaSettings = pwaResult.success ? (pwaResult.data || []) : [];
  } catch (e) {
    console.error('DB Error:', e);
  }

  return (
    <div className="space-y-6">
      <h1 style={{ color: 'red', fontSize: '24px', fontWeight: 'bold' }}>RENDER OK — THEME</h1>
      
      <div>
        <h2 className="text-3xl font-bold text-gray-900">🎨 Éditeur de Thème</h2>
        <p className="mt-2 text-gray-600">Personnalisez les couleurs et paramètres PWA.</p>
      </div>

      <ThemeEditor
        initialThemeSettings={themeSettings}
        initialPwaSettings={pwaSettings}
      />
    </div>
  );
}
