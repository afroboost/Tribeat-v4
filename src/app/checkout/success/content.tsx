'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type PaymentStatus = 'loading' | 'success' | 'pending' | 'failed';

export function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('tx');
  const legacySessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10;

  useEffect(() => {
    const tx = transactionId;
    if (!tx && !legacySessionId) {
      setStatus('failed');
      return;
    }

    const pollStatus = async () => {
      try {
        // New flow: poll by internal transaction id (provider-agnostic)
        if (tx) {
          const response = await fetch(`/api/checkout/transaction/${tx}`);
          const data = await response.json();
          if (!response.ok) {
            setStatus('failed');
            return;
          }
          if (data.transaction?.status === 'COMPLETED' && data.access?.status === 'ACTIVE') {
            setStatus('success');
            return;
          }
          if (data.transaction?.status === 'FAILED' || data.transaction?.status === 'CANCELLED') {
            setStatus('failed');
            return;
          }
        } else if (legacySessionId) {
          // Legacy stripe flow: keep compatibility (no access grant here)
          const response = await fetch(`/api/checkout/status/${legacySessionId}`);
          const data = await response.json();
          if (data.paymentStatus === 'paid') {
            // Success page can show pending if access isn't granted yet (webhook-only rule)
            setStatus('pending');
            return;
          }
          if (data.status === 'expired' || data.status === 'canceled') {
            setStatus('failed');
            return;
          }
        }

        // Continuer le polling
        if (attempts < maxAttempts) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setStatus('failed');
      }
    };

    pollStatus();
  }, [transactionId, legacySessionId, attempts]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
              <CardTitle className="mt-4">Vérification du paiement...</CardTitle>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <CardTitle className="mt-4 text-green-700">Paiement réussi !</CardTitle>
            </>
          )}
          
          {status === 'pending' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto text-yellow-500" />
              <CardTitle className="mt-4 text-yellow-700">Paiement en cours de traitement</CardTitle>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
              <CardTitle className="mt-4 text-red-700">Erreur de paiement</CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <>
              <p className="text-gray-600">
                Merci pour votre achat ! Votre accès a été activé.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/sessions">
                  <Button>Voir mes sessions</Button>
                </Link>
                <Link href="/">
                  <Button variant="outline">Accueil</Button>
                </Link>
              </div>
            </>
          )}
          
          {status === 'pending' && (
            <>
              <p className="text-gray-600">
                Votre paiement est en cours de traitement. 
                Vous recevrez un email de confirmation.
              </p>
              <Link href="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
            </>
          )}
          
          {status === 'failed' && (
            <>
              <p className="text-gray-600">
                Une erreur est survenue lors du paiement. 
                Veuillez réessayer ou contacter le support.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.back()}>Réessayer</Button>
                <Link href="/">
                  <Button variant="outline">Accueil</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
