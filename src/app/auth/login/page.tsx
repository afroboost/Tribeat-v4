'use client';

/**
 * Page de Connexion
 * 
 * Architecture Production :
 * - Validation Zod côté client
 * - Toast notifications (Sonner)
 * - Gestion erreurs NextAuth
 * - Redirection intelligente après login
 * - Design moderne et accessible
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

// Schéma de validation Zod
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

  // Callback URL pour redirection après login
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  // Form avec react-hook-form + Zod
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Submit handler
  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      // Tentative de connexion via NextAuth
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        // Erreur d'authentification
        setError('Email ou mot de passe incorrect');
        toast.error('Échec de la connexion');
        return;
      }

      if (result?.ok) {
        // Succès : afficher toast et rediriger
        toast.success('Connexion réussie !');
        
        // Redirection intelligente (géré par NextAuth callback)
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Une erreur est survenue. Veuillez réessayer.');
      toast.error('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎵 Tribeat</h1>
          <p className="text-gray-600 dark:text-gray-400">Connexion à votre compte</p>
        </div>

        {/* Erreur globale */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulaire */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
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

            {/* Password */}
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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="login-submit-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </Form>

        {/* Footer */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Lien inscription */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
              S'inscrire
            </Link>
          </p>

          {/* Comptes de démo */}
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

      {/* Retour accueil */}
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
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
