/**
 * NextAuth.js Configuration Options
 * CORRIGÉ pour environnement proxy (Emergent/Vercel)
 */

import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  // Vercel/HTTPS: ensure secure cookies when served over HTTPS.
  // (NextAuth v4 does not support `trustHost` — that is a v5 option.)
  useSecureCookies:
    (process.env.NEXTAUTH_URL?.startsWith('https://') ?? false) ||
    process.env.VERCEL === '1',

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[AUTH] JWT créé pour:', user.email);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV !== 'production',
};
