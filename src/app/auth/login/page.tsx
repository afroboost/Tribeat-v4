'use client';

/**
 * Page de Connexion
 * Objectif: login stable (tous rôles) + redirection fiable + pas de debug en prod
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { getSession, signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const redirectByRole: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  COACH: '/coach/dashboard',
  PARTICIPANT: '/sessions',
};

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') || '', [searchParams]);
  const defaultRedirect = useMemo(() => {
    const role = session?.user?.role ? String(session.user.role) : '';
    return redirectByRole[role] || '/sessions';
  }, [session?.user?.role]);

  // Si déjà connecté, rediriger
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace(callbackUrl || defaultRedirect);
    }
  }, [status, session, callbackUrl, defaultRedirect, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      // Éviter tout "hang" silencieux (réseau/NextAuth misconfig)
      const result = await withTimeout(
        signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
        }),
        15000,
        'La connexion a expiré (timeout). Vérifiez votre connexion et réessayez.'
      );

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' 
          ? 'Email ou mot de passe incorrect' 
          : result.error);
        toast.error('Échec de la connexion');
        return;
      }

      if (result?.ok) {
        toast.success('Connexion réussie');

        // Récupérer la session fraîche (évite les états incohérents au refresh)
        const nextSession = await withTimeout(
          getSession(),
          8000,
          'Connexion réussie, mais la session n’a pas pu être chargée. Rechargez la page et réessayez.'
        );
        if (!nextSession?.user?.role) {
          setError('Connexion réussie, mais aucun rôle n’a été trouvé dans la session.');
          toast.error('Session invalide');
          return;
        }
        const role = nextSession?.user?.role ? String(nextSession.user.role) : '';
        const roleTarget = redirectByRole[role] || '/sessions';

        // callbackUrl (si présent) a priorité
        router.replace(callbackUrl || roleTarget);
        router.refresh();
        return;
      }

      // NextAuth peut retourner ok=false sans error explicit
      setError('Connexion impossible. Vérifiez vos identifiants et réessayez.');
      toast.error('Échec de la connexion');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(message);
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connexion</h1>
          <p className="text-gray-500 dark:text-gray-400">Accédez à votre espace</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Chargement de votre session…
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@tribeat.com"
                      disabled={isLoading || status === 'loading'}
                      data-testid="login-email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Admin123!"
                      disabled={isLoading || status === 'loading'}
                      data-testid="login-password-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || status === 'loading'}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </Form>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          En cas de problème de session (refresh), reconnectez-vous via cette page.
        </p>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-blue-600" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
