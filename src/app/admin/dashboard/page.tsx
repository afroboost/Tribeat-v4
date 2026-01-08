/**
 * Dashboard Admin - DEBUG MODE
 */

export default function AdminDashboardPage() {
  console.log('========== DASHBOARD PAGE RENDERED ==========');
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-green-600">
        DASHBOARD PAGE OK - DEBUG MODE
      </h2>
      <p className="text-gray-700">
        Si vous voyez ce texte, le layout et la page fonctionnent.
      </p>
    </div>
  );
}
