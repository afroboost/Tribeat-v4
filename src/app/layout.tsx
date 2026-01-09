import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

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
  // Layout 100% statique - ZÉRO DB, ZÉRO auth
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
