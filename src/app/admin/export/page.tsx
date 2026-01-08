/**
 * Page Admin - Export de Données
 * Export CSV/JSON des données principales
 */

import { ExportPanel } from '@/components/admin/ExportPanel';

export default async function AdminExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          📥 Export de Données
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Exportez vos données au format CSV ou JSON.
        </p>
      </div>

      <ExportPanel />
    </div>
  );
}
