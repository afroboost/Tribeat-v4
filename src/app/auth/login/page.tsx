'use client';

/**
 * Page de Connexion - NextAuth
 */

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
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
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (min. 6 caractères)'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou mot de passe incorrect');
        toast.error('Échec de la connexion');
        return;
      }

      if (result?.ok) {
        toast.success('Connexion réussie !');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue');
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tribeat</h1>
          <p className="text-gray-600 dark:text-gray-400">Connexion à votre compte</p>
        </div>

        {error && (
          <Alert variant="destructive">
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
                      placeholder="coach@tribeat.com"
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
                      placeholder="••••••••"
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
              disabled={isLoading}
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

        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
              S'inscrire
            </Link>
          </p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400">
            <p className="font-semibold mb-2">Comptes de démonstration :</p>
            <ul className="space-y-1">
              <li>• Admin: admin@tribeat.com / Admin123!</li>
              <li>• Coach: coach@tribeat.com / Demo123!</li>
              <li>• Participant: participant@tribeat.com / Demo123!</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link href="/" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-blue-600" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
