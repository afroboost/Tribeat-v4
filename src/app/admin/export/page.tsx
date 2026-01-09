/**
 * Page Admin - Export de Données
 */

import { ExportPanel } from '@/components/admin/ExportPanel';

export default function AdminExportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📥 Export de Données</h1>
        <p className="mt-2 text-gray-600">Exportez vos données au format CSV ou JSON.</p>
      </div>

      <ExportPanel />
    </div>
  );
}
