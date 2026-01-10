/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('[GLOBAL ERROR]', error);

  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Erreur critique</h1>
            <p className="text-sm text-gray-600">
              Une erreur bloquante est survenue. Vous pouvez réessayer ou revenir à l'accueil.
            </p>
            {error?.digest && (
              <p className="text-xs text-gray-400">Error digest: {error.digest}</p>
            )}
            <div className="flex gap-3">
              <Button onClick={reset}>Réessayer</Button>
              <Button asChild variant="outline">
                <Link href="/">Accueil</Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

