import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/AuthProvider';

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
  // Layout 100% statique - ZÉRO dépendance externe
  // Render TOUJOURS, même si auth/DB down
  return (
    <html lang="fr">
      <body className={inter.className} style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
