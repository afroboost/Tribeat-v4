'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Offer = {
  id: string;
  name: string;
  description: string | null;
  price: number; // cents
  currency: string;
};

export function BuySessionAccessClient(props: {
  sessionId: string;
  sessionTitle: string;
  coachName: string;
  offers: Offer[];
}) {
  const router = useRouter();
  const [promoCode, setPromoCode] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState<string>(props.offers[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedOffer = useMemo(
    () => props.offers.find((o) => o.id === selectedOfferId) || null,
    [props.offers, selectedOfferId]
  );

  async function startCheckout() {
    if (!selectedOfferId) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: selectedOfferId,
          originUrl: window.location.origin,
          promoCode: promoCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.error || 'Erreur');
        return;
      }

      if (data?.bypassed) {
        setMessage('Accès activé (promo gratuit).');
        router.push(`/session/${props.sessionId}`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setMessage('Réponse inattendue.');
    } catch (e) {
      setMessage('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Acheter l’accès</CardTitle>
          <CardDescription>
            Session: <strong>{props.sessionTitle}</strong> — Coach: {props.coachName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {props.offers.length === 0 ? (
            <p className="text-sm text-gray-600">Aucune offre disponible pour cette session.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Offre</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                  disabled={loading}
                >
                  {props.offers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} — {(o.price / 100).toFixed(2)} {o.currency}
                    </option>
                  ))}
                </select>
                {selectedOffer?.description ? (
                  <p className="text-xs text-gray-500">{selectedOffer.description}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Code promo</Label>
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="EX: FREE100"
                  disabled={loading}
                />
              </div>

              {message ? <p className="text-sm text-gray-700">{message}</p> : null}

              <Button onClick={startCheckout} disabled={loading || !selectedOfferId} className="w-full">
                {loading ? 'Chargement…' : 'Continuer'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

