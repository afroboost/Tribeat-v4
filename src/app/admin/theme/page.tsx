/**
 * Page Admin - Éditeur de Thème
 * 
 * PRIORITÉ #1 - Pièce maîtresse
 * Permet au Super Admin de modifier le thème en temps réel
 * sans redéploiement
 */

import { ThemeEditor } from '@/components/admin/ThemeEditor';
import { getUISettingsByCategory } from '@/actions/ui-settings';

export default async function AdminThemePage() {
  // Récupérer les settings THEME et PWA
  const [themeResult, pwaResult] = await Promise.all([
    getUISettingsByCategory('THEME'),
    getUISettingsByCategory('PWA'),
  ]);

  const themeSettings = themeResult.success ? themeResult.data : [];
  const pwaSettings = pwaResult.success ? pwaResult.data : [];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🎨 Éditeur de Thème
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Personnalisez les couleurs, fonts et paramètres PWA. Les modifications sont appliquées immédiatement.
          </p>
        </div>

        {/* Editor */}
        <ThemeEditor
          initialThemeSettings={themeSettings || []}
          initialPwaSettings={pwaSettings || []}
        />
      </div>
    </AdminLayout>
  );
}
