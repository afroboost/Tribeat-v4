import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tribeat - Sessions Live Interactives',
  description: 'Plateforme de sessions live synchronisées',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout 100% STATIQUE
  // ZÉRO appel auth, ZÉRO appel DB
  // Render TOUJOURS, IMMÉDIATEMENT
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
