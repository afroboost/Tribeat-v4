/**
 * NextAuth Type Definitions
 * Typage strict pour garantir la sécurité et la cohérence des rôles
 */

import { UserRole } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extension de la Session NextAuth
   * Le rôle est NON optionnel pour éviter les erreurs runtime
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole; // SUPER_ADMIN | COACH | PARTICIPANT (non optionnel)
      avatar?: string;
    };
  }

  /**
   * Extension de l'objet User NextAuth
   */
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extension du JWT Token
   * Utilisé par le middleware pour la vérification Edge-compatible
   */
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole; // Stocké dans le token pour accès rapide
    avatar?: string;
  }
}
