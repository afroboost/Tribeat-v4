'use server';

/**
 * Server Actions pour l'authentification
 * Gestion côté serveur pour éviter les problèmes de proxy
 */

import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'tribeat-secret-key'
);

interface LoginResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Action de connexion serveur
 */
export async function loginAction(email: string, password: string): Promise<LoginResult> {
  try {
    // Recherche utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    // Vérification mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Email ou mot de passe incorrect' };
    }

    // Créer JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Stocker dans un cookie
    const cookieStore = await cookies();
    cookieStore.set('tribeat-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 jours
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}

/**
 * Action de déconnexion
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('tribeat-auth');
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}

/**
 * Récupérer la session courante
 */
export async function getSessionAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('tribeat-auth')?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    return {
      user: {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as string,
      },
    };
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

/**
 * Action d'inscription
 */
export async function registerAction(name: string, email: string, password: string): Promise<LoginResult> {
  try {
    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Cet email est déjà utilisé' };
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'PARTICIPANT',
      },
    });

    // Créer JWT token (auto-login)
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Stocker dans un cookie
    const cookieStore = await cookies();
    cookieStore.set('tribeat-auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: 'Une erreur est survenue' };
  }
}
