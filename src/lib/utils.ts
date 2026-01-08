import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date pour affichage
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// Format montant (centimes -> CHF)
export function formatAmount(cents: number, currency = 'CHF'): string {
  return new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
