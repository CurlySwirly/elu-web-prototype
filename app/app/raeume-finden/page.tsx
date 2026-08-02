'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** Room booking is out of scope for the expert product surface. */
export default function FindRoomsPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/app');
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <Card className="max-w-md mx-auto border-2">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-text-dark text-center">
            Raumbuchung nicht verfügbar
          </CardTitle>
          <CardDescription className="font-body text-center text-gray-600">
            Expert:innen buchen keine Räume über elu. Du wirst zum Dashboard weitergeleitet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={() => router.replace('/app')}
            className="w-full font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
          >
            Zum Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
