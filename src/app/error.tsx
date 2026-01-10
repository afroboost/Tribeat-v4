/* eslint-disable react/no-unescaped-entities */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log for production debugging (visible in Vercel logs)
  useEffect(() => {
    console.error('[APP ERROR]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Une erreur est survenue</h1>
        <p className="text-sm text-gray-600">
          La page a rencontré un problème. Vous pouvez réessayer sans perdre l'application.
        </p>
        {error?.digest && (
          <p className="text-xs text-gray-400">Error digest: {error.digest}</p>
        )}
        <div className="flex gap-3">
          <Button onClick={reset}>Réessayer</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recharger
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

