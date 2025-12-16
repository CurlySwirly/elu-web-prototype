'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ProviderSignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main signup page after a brief delay
    const timer = setTimeout(() => {
      router.push('/signup');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 py-12">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="text-center mb-4">
            <Link href="/" className="text-3xl font-heading font-bold text-text-dark">
              elu
            </Link>
          </div>
          <CardTitle className="text-2xl font-heading text-center text-text-dark">
            Anbieter-Registrierung nicht verfügbar
          </CardTitle>
          <CardDescription className="text-center font-body text-gray-600">
            Die Plattform konzentriert sich derzeit auf Client- und Expert-Rollen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-2 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="ml-2 text-yellow-900 font-body">
              Die Anbieter-Rolle ist vorübergehend nicht verfügbar. Du wirst zur Hauptregistrierungsseite weitergeleitet.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push('/signup')}
            className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body font-semibold"
          >
            Zur Registrierung
          </Button>

          <div className="text-center text-sm text-gray-600 font-body mt-4">
            Bereits registriert?{' '}
            <Link href="/login" className="text-primary-blue hover:underline font-semibold">
              Jetzt anmelden
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
