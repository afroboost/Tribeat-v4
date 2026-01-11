'use client';

import { signOut } from 'next-auth/react';
import { Inter } from 'next/font/google';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {/* 🔴 BARRE ADMIN FIXE */}
        <div
          style={{
            padding: '12px 16px',
            background: '#000',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          <span>ADMIN</span>

          <button
            onClick={() =>
              signOut({
                redirect: true,
                callbackUrl: '/login',
              })
            }
            style={{
              padding: '6px 12px',
              background: 'red',
              color: 'white',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            SE DÉCONNECTER
          </button>
        </div>

        {children}
      </body>
    </html>
  );
}
