'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DEMO_ACCOUNTS = [
  {
    email: 'client@test.com',
    label: 'Klient',
    hint: 'Aktives Client-Dashboard',
  },
  {
    email: 'onboarding@test.com',
    label: 'Expert:in · Verifizierung',
    hint: 'Offene Checkliste, Profil offline',
  },
  {
    email: 'expert@test.com',
    label: 'Expert:in · Aktiv',
    hint: 'Verifiziertes, buchbares Profil',
  },
] as const;

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isMock = getBackendMode() === 'mock';
  const demoPassword = isMock ? 'beliebig' : 'Test1234!';

  const resolvePostLoginPath = (role: string) => {
    if (role === 'admin') return '/admin';
    // client → ClientDashboard, expert (verified or open verification) → ExpertDashboard
    return '/app';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.');
      return;
    }

    setLoading(true);

    try {
      const user = await signIn(email.trim(), password);
      window.location.assign(resolvePostLoginPath(user.role));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen';
      setError(message);
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    if (!isMock) setPassword('Test1234!');
    else if (!password) setPassword('demo');
    setError('');
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
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
              <p className="text-[11px] font-body font-semibold uppercase tracking-wide text-gray-500">
                Demo-Zugänge · Passwort {demoPassword}
              </p>
              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account.email)}
                    className="w-full text-left rounded-md border border-gray-200 bg-white px-2.5 py-2 hover:border-primary-blue/50 hover:bg-info-bg/40 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-body font-semibold text-text-dark">
                        {account.label}
                      </span>
                      <span className="text-[11px] font-mono text-primary-blue truncate">
                        {account.email}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-body mt-0.5">{account.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-body font-medium text-text-dark">
                E-Mail
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="client@test.com"
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
                placeholder={demoPassword}
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
