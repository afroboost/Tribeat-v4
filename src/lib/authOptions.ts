/**
 * NextAuth Configuration
 * 
 * Fichier séparé pour éviter les imports circulaires
 * 
 * Architecture Production :
 * - Prisma Adapter pour gestion sessions DB
 * - Credentials provider avec bcrypt
 * - JWT avec rôles centralisés
 * - Callbacks pour redirections intelligentes
 * - Extensible pour 2FA et Magic Link (future)
 */

import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
  // Prisma Adapter pour sessions en DB
  adapter: PrismaAdapter(prisma),

  // Session strategy: JWT (compatible Edge + rapide)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },

  // Pages personnalisées
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  // Providers
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Identifiants manquants');
        }

        // Récupération utilisateur depuis DB
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Email ou mot de passe incorrect');
        }

        // Vérification password avec bcrypt
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Email ou mot de passe incorrect');
        }

        // Retour user (sera mis dans le JWT)
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar ?? undefined,
        };
      },
    }),
  ],

  // Callbacks pour customisation
  callbacks: {
    /**
     * JWT Callback
     * Ajoute les infos user dans le token (utilisé par middleware)
     */
    async jwt({ token, user, trigger, session }) {
      // Premier login : ajouter user data dans token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.avatar = user.avatar;
      }

      // Update session (ex: changement de rôle)
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.avatar = session.avatar;
      }

      return token;
    },

    /**
     * Session Callback
     * Expose les données dans la session client
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role;
        session.user.avatar = token.avatar as string | undefined;
      }
      return session;
    },

    /**
     * Redirect Callback
     * Redirection intelligente après login selon rôle
     */
    async redirect({ url, baseUrl }) {
      // Si URL relative, utiliser baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Si URL sur même domaine, autoriser
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Sinon, retour home
      return baseUrl;
    },
  },

  // Sécurité
  secret: process.env.NEXTAUTH_SECRET,

  // Debug (désactiver en production)
  debug: process.env.NODE_ENV === 'development',
};
