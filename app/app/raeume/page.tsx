'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ProviderRoomsPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/app');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="p-8">
      <Card className="max-w-md mx-auto border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-heading text-center text-text-dark">
            Räume-Verwaltung nicht verfügbar
          </CardTitle>
          <CardDescription className="text-center font-body text-gray-600">
            Die Anbieter-Rolle ist vorübergehend nicht verfügbar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-2 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="ml-2 text-yellow-900 font-body">
              Die Plattform konzentriert sich derzeit auf Client- und Expert-Rollen. Du wirst zum Dashboard weitergeleitet.
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => router.push('/app')}
            className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body font-semibold"
          >
            Zum Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
