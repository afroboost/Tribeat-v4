import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  const DISALLOWED_WALLET_MUTATIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);
  const DISALLOWED_LEDGER_MUTATIONS = new Set(['update', 'updateMany', 'upsert', 'delete', 'deleteMany']);

  const wrapDelegate = (delegate: any, modelName: string) =>
    new Proxy(delegate, {
      get(target, prop, receiver) {
        const orig = Reflect.get(target, prop, receiver);
        if (typeof prop === 'string' && typeof orig === 'function') {
          // Ledger must be immutable: INSERT only.
          if (modelName === 'LedgerEntry' && DISALLOWED_LEDGER_MUTATIONS.has(prop)) {
            return () => {
              throw new Error(`LEDGER_IMMUTABLE: ${modelName}.${prop} is forbidden`);
            };
          }

          // Balances must be derived from ledger sums: wallets cannot be mutated directly.
          if ((modelName === 'CoachWallet' || modelName === 'PlatformWallet') && DISALLOWED_WALLET_MUTATIONS.has(prop)) {
            return () => {
              throw new Error(`BALANCE_MUTATION_FORBIDDEN: ${modelName}.${prop} is forbidden (derived from ledger)`);
            };
          }
        }
        return orig;
      },
    });

  const wrapClient = (c: any) =>
    new Proxy(c, {
      get(target, prop, receiver) {
        if (prop === 'coachWallet') {
          return wrapDelegate(Reflect.get(target, prop, receiver), 'CoachWallet');
        }
        if (prop === 'platformWallet') {
          return wrapDelegate(Reflect.get(target, prop, receiver), 'PlatformWallet');
        }
        if (prop === 'ledgerEntry') {
          return wrapDelegate(Reflect.get(target, prop, receiver), 'LedgerEntry');
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
