'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setLoading(true);

    try {
      await signIn(email.trim(), password);

      const emailLower = email.trim().toLowerCase();
      const isAdminEmail = emailLower.includes('admin@') || emailLower.startsWith('admin');
      const target = isAdminEmail ? '/admin' : '/app';

      // Hard navigation so auth session is always picked up after login
      window.location.assign(target);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen';
      setError(message);
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
            Willkommen zurück
          </CardTitle>
          <CardDescription className="text-center font-body text-gray-600">
            Melde dich mit deinem Account an
          </CardDescription>
          <p className="text-center text-xs text-gray-400 font-body pt-1">
            Mock: expert@test.com / client@test.com — Passwort beliebig
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="font-body font-medium text-text-dark">
                E-Mail
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="expert@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-body font-medium text-text-dark">
                Passwort
              </Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="test"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-body"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body font-semibold"
              disabled={loading}
            >
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </Button>

            <div className="text-center text-sm text-gray-600 font-body">
              Noch kein Account?{' '}
              <Link href="/signup" className="text-primary-blue hover:underline font-semibold">
                Jetzt registrieren
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
