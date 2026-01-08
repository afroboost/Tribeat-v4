import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  // Test connexion DB (sera remplacé plus tard)
  const userCount = await prisma.user.count().catch(() => 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-gray-900 dark:text-white">
              🎵 Tribeat
            </h1>
            <p className="text-2xl text-gray-600 dark:text-gray-300">
              Sessions Live Interactives
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              Plateforme de synchronisation audio/vidéo temps réel pour coachs et participants
            </p>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 py-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{userCount}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Utilisateurs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">0</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Sessions</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/auth/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              S'inscrire
            </Link>
            <Link
              href="/admin"
              className="px-8 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors"
            >
              Admin
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-3">🎥</div>
              <h3 className="font-bold text-lg mb-2">Synchro Vidéo</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lecture synchronisée en temps réel avec latence &lt; 200ms
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-bold text-lg mb-2">Chat Live</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Communication instantanée via Pusher WebSocket
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-3">📱</div>
              <h3 className="font-bold text-lg mb-2">PWA Mobile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Installation sur mobile avec thème dynamique
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mt-16 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h3 className="font-bold text-xl mb-4">Stack Technique</h3>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                Next.js 14
              </span>
              <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                Prisma + PostgreSQL
              </span>
              <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                NextAuth.js
              </span>
              <span className="px-4 py-2 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">
                Pusher WebSocket
              </span>
              <span className="px-4 py-2 bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded-full">
                Web Audio API
              </span>
              <span className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full">
                Tailwind CSS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
