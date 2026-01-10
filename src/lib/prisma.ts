import { PrismaClient } from '@prisma/client';
import { isWalletMutationAllowed } from '@/lib/wallet/walletMutationGuard';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  const walletMutations = new Set([
    'create',
    'createMany',
    'update',
    'updateMany',
    'upsert',
    'delete',
    'deleteMany',
  ]);

  const wrapWalletDelegate = (delegate: any, modelName: 'CoachWallet' | 'PlatformWallet') =>
    new Proxy(delegate, {
      get(target, prop, receiver) {
        const orig = Reflect.get(target, prop, receiver);
        if (typeof prop === 'string' && typeof orig === 'function' && walletMutations.has(prop)) {
          return (...args: any[]) => {
            if (!isWalletMutationAllowed()) {
              throw new Error(`WALLET_MUTATION_BLOCKED: ${modelName}.${prop} must go through WalletService`);
            }
            return orig.apply(target, args);
          };
        }
        return orig;
      },
    });

  const wrapClient = (c: any) =>
    new Proxy(c, {
      get(target, prop, receiver) {
        if (prop === 'coachWallet') {
          return wrapWalletDelegate(Reflect.get(target, prop, receiver), 'CoachWallet');
        }
        if (prop === 'platformWallet') {
          return wrapWalletDelegate(Reflect.get(target, prop, receiver), 'PlatformWallet');
        }

        // Ensure transaction callback receives a guarded tx client as well.
        if (prop === '$transaction') {
          const orig = Reflect.get(target, prop, receiver);
          return (arg: any, options?: any) => {
            if (typeof arg === 'function') {
              return orig((tx: any) => arg(wrapClient(tx)), options);
            }
            return orig(arg, options);
          };
        }

        return Reflect.get(target, prop, receiver);
      },
    });

  return wrapClient(client) as PrismaClient;
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
