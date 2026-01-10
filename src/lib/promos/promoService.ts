import { prisma } from '@/lib/prisma';
import type { Offer, PromoCode, PromoCodeType } from '@prisma/client';

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export type PromoValidationResult =
  | { ok: true; promo: PromoCode; discountAmount: number; finalAmount: number }
  | { ok: false; error: string };

export async function validatePromoForOffer(params: {
  code: string;
  userId: string;
  offer: Pick<Offer, 'id' | 'price' | 'currency' | 'sessionId'>;
}): Promise<PromoValidationResult> {
  const code = normalizePromoCode(params.code);
  if (!code) return { ok: false, error: 'Code requis' };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.isActive) return { ok: false, error: 'Code invalide' };

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) return { ok: false, error: 'Code pas encore actif' };
  if (promo.endsAt && promo.endsAt < now) return { ok: false, error: 'Code expiré' };

  // Scope rules: promo.sessionId null => global; otherwise must match offer.sessionId
  if (promo.sessionId && promo.sessionId !== params.offer.sessionId) {
    return { ok: false, error: 'Code non valide pour cette offre' };
  }

  // One redemption per user per code (current schema constraint)
  const already = await prisma.promoRedemption.findUnique({
    where: { promoCodeId_userId: { promoCodeId: promo.id, userId: params.userId } },
    select: { id: true },
  });
  if (already) return { ok: false, error: 'Code déjà utilisé' };

  if (promo.maxRedemptions !== null) {
    const count = await prisma.promoRedemption.count({ where: { promoCodeId: promo.id } });
    if (count >= promo.maxRedemptions) return { ok: false, error: 'Code épuisé' };
  }

  const discountAmount = computeDiscountAmount(promo, params.offer.price);
  const finalAmount = Math.max(0, params.offer.price - discountAmount);

  return { ok: true, promo, discountAmount, finalAmount };
}

function computeDiscountAmount(promo: PromoCode, amount: number): number {
  const type: PromoCodeType = promo.type;
  if (type === 'FULL_FREE') return amount;
  if (type === 'PERCENT') {
    const pct = promo.percentOff ?? 0;
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return 0;
    return Math.round((amount * pct) / 100);
  }
  if (type === 'FIXED') {
    const off = promo.amountOff ?? 0;
    if (!Number.isFinite(off) || off <= 0) return 0;
    return Math.min(amount, Math.round(off));
  }
  return 0;
}

