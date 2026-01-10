'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type Provider = 'STRIPE' | 'TWINT' | 'MOBILE_MONEY';

export interface CheckoutOffer {
  id: string;
  name: string;
  description?: string | null;
  price: number; // cents
  currency: string;
}

export function CheckoutOptions({
  offers,
  enabledProviders,
}: {
  offers: CheckoutOffer[];
  enabledProviders: Partial<Record<Provider, boolean>>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const anyProviderEnabled = Object.values(enabledProviders).some(Boolean);

  const start = async (offerId: string, provider: Provider) => {
    if (!enabledProviders[provider]) {
      toast.error('Paiement temporairement indisponible');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, provider }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        toast.error(data?.error || 'Paiement temporairement indisponible');
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      toast.error('Erreur lors du démarrage du paiement');
    } finally {
      setIsLoading(false);
    }
  };

  if (!offers.length) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Accès requis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          Aucun plan d&apos;achat n&apos;est disponible pour cette session. Contactez un administrateur.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!anyProviderEnabled && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          Paiement temporairement indisponible (aucun provider activé).
        </div>
      )}

      {offers.map((offer) => (
        <Card key={offer.id} className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{offer.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {offer.description && <p className="text-sm text-gray-300">{offer.description}</p>}
            <p className="text-sm text-gray-200 font-mono">
              {(offer.price / 100).toFixed(2)} {offer.currency}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!enabledProviders.STRIPE || isLoading}
                onClick={() => start(offer.id, 'STRIPE')}
              >
                Payer par carte (Stripe)
              </Button>
              <Button
                variant="outline"
                disabled={!enabledProviders.TWINT || isLoading}
                onClick={() => start(offer.id, 'TWINT')}
              >
                TWINT
              </Button>
              <Button
                variant="secondary"
                disabled={!enabledProviders.MOBILE_MONEY || isLoading}
                onClick={() => start(offer.id, 'MOBILE_MONEY')}
              >
                Mobile Money (MTN / Orange)
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

