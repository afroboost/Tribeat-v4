import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          {/* Hero */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
              Tribeat
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300">
              Sessions live interactives
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Rejoignez des expériences collectives synchronisées en temps réel.
              Audio, vidéo et interactions unifiées pour des moments partagés uniques.
            </p>
          </div>

          {/* CTA */}
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              data-testid="home-login-button"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-200 rounded-lg font-semibold hover:border-blue-400 hover:bg-blue-50 transition-colors"
              data-testid="home-register-button"
            >
              Créer un compte
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Synchronisation parfaite</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tous les participants voient et entendent le même contenu au même moment.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Interaction en direct</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Échangez en temps réel avec le coach et les autres participants.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Accessible partout</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Participez depuis votre ordinateur, tablette ou smartphone.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-600">
          © 2025 Tribeat
        </p>
      </footer>
    </div>
  );
}
// Build timestamp: 2026-01-09T12:50:00Z - Force cache invalidation
