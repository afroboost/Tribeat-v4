'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { useSession, signOut } from 'next-auth/react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  return (
    <html lang="fr">
      <body className={inter.className}>
        {/* 🔴 BARRE FORCÉE TOUJOURS VISIBLE */}
        <div
          style={{
            padding: '10px 14px',
            background: '#000',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          <span>
            {status === 'loading'
              ? 'Chargement…'
              : session
              ? `Connecté : ${session.user?.email}`
              : 'Non connecté'}
          </span>

          {session && (
            <button
              onClick={() =>
                signOut({
                  redirect: true,
                  callbackUrl: '/login',
                })
              }
              style={{
                padding: '6px 10px',
                background: 'red',
                color: 'white',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              SE DÉCONNECTER
            </button>
          )}
        </div>

        {children}

        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
