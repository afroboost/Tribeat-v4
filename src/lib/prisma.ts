import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  // Fail-safe logging: without DATABASE_URL the app cannot access DB at runtime.
  // We intentionally do not throw here to avoid breaking `next build`.
  console.error('[ENV] DATABASE_URL is missing. Configure it in Vercel Environment Variables.');
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
