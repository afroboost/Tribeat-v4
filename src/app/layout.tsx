import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {/* BARRE GLOBALE SIMPLE */}
        <div
          style={{
            padding: '10px 14px',
            background: '#111',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
          }}
        >
          <span>Session active</span>

          {/* ✅ LOGOUT NEXTAUTH OFFICIEL */}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                padding: '6px 12px',
                background: 'red',
                color: 'white',
                borderRadius: 6,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              SE DÉCONNECTER
            </button>
          </form>
        </div>

        {children}

        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
