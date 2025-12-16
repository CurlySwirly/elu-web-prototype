'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ExpertSignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, fullName, 'expert');
      router.push('/onboarding/expert');
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

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
            Expert:in werden
          </CardTitle>
          <CardDescription className="text-center font-body text-gray-600">
            Registriere dich und biete deine Wellness-Services an
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-body font-medium text-text-dark">Vollständiger Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Max Mustermann"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-body font-medium text-text-dark">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-body font-medium text-text-dark">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="font-body"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body font-semibold"
              disabled={loading}
            >
              {loading ? 'Wird registriert...' : 'Registrieren'}
            </Button>

            <div className="text-center text-sm text-gray-600 font-body">
              Bereits registriert?{' '}
              <Link href="/login" className="text-primary-blue hover:underline font-semibold">
                Jetzt anmelden
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600 font-body pt-2 border-t">
              Du bist Kund:in?{' '}
              <Link href="/signup/client" className="text-primary-blue hover:underline">
                Als Kund:in registrieren
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
