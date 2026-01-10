import { AsyncLocalStorage } from 'node:async_hooks';

type WalletGuardStore = {
  allowWalletMutation: boolean;
};

const als = new AsyncLocalStorage<WalletGuardStore>();

export function runWithWalletMutationAllowed<T>(fn: () => Promise<T>): Promise<T> {
  return als.run({ allowWalletMutation: true }, fn);
}

export function isWalletMutationAllowed(): boolean {
  return als.getStore()?.allowWalletMutation === true;
}

