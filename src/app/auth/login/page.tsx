'use client';

/**
 * Page de Connexion - DEBUG VERSION
 * Affiche clairement l'état auth et les erreurs
 */

import { Suspense, useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
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
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/sessions';

  // DEBUG: Afficher l'état de session
  useEffect(() => {
  }, [session, status, callbackUrl]);

  // Si déjà connecté, rediriger
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl);
    }
  }, [status, session, callbackUrl, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);


    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      setDebugInfo(JSON.stringify(result, null, 2));

      if (result?.error) {
        console.error('[LOGIN] Erreur:', result.error);
        setError(result.error === 'CredentialsSignin' 
          ? 'Email ou mot de passe incorrect' 
          : result.error);
        toast.error('Échec de la connexion');
        return;
      }

      if (result?.ok) {
        toast.success('Connexion réussie');
        
        // Forcer le refresh avant redirection
        router.refresh();
        
        // Petite pause pour laisser le cookie s'installer
        setTimeout(() => {
          router.push(callbackUrl);
        }, 500);
      }
    } catch (err) {
      console.error('[LOGIN] Exception:', err);
      setError('Une erreur est survenue');
      setDebugInfo(String(err));
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* DEBUG BANNER */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg text-xs font-mono">
        <div className="flex items-center gap-2 mb-2">
          {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
          {status === 'authenticated' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {status === 'unauthenticated' && <XCircle className="w-4 h-4 text-red-500" />}
          <span className="text-white">Status: <span className={
            status === 'authenticated' ? 'text-green-400' :
            status === 'loading' ? 'text-yellow-400' : 'text-red-400'
          }>{status}</span></span>
        </div>
        {session && (
          <div className="text-green-400">
            User: {session.user?.email} ({session.user?.role})
          </div>
        )}
        {debugInfo && (
          <pre className="text-gray-400 text-xs mt-2 overflow-auto max-h-20">
            {debugInfo}
          </pre>
        )}
      </div>

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
                      disabled={isLoading}
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
                      disabled={isLoading}
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

        {/* Comptes de test */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Comptes de test :</p>
          <div className="space-y-1 text-xs text-gray-400">
            <div>Admin: admin@tribeat.com / Admin123!</div>
            <div>Coach: coach@tribeat.com / Demo123!</div>
          </div>
        </div>
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
