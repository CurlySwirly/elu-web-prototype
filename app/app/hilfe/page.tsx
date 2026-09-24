'use client';

import { useState } from 'react';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { getAppPageMeta } from '@/lib/app-page-meta';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';

const TOPICS = [
  { value: 'frage', label: 'Frage' },
  { value: 'wunsch', label: 'Wunsch / Anregung' },
  { value: 'beschwerde', label: 'Beschwerde' },
  { value: 'technisch', label: 'Technisches Problem' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const;

export default function HilfePage() {
  const { user } = useAuth();
  const meta = getAppPageMeta('/app/hilfe');
  const [topic, setTopic] = useState<string>('frage');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError('Bitte Betreff und Nachricht ausfüllen.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 500));
      setSent(true);
      setSubject('');
      setMessage('');
      setTopic('frage');
    } catch {
      setError('Senden fehlgeschlagen. Bitte später erneut versuchen.');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppPageShell>
      <AppPageHeader title={meta?.title} description={meta?.description} />

      <div className="max-w-3xl">
        <Card className="border-2">
          <CardHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 space-y-1.5">
            <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">
              Kontaktformular
            </CardTitle>
            <CardDescription className="font-body text-sm leading-relaxed max-w-2xl">
              Schreib uns bei Fragen, Wünschen, Anregungen oder Beschwerden. Wir melden uns in der
              Regel innerhalb von 1–2 Werktagen.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6">
            {sent ? (
              <Alert className="border-primary-green/40 bg-primary-green/10">
                <CheckCircle2 className="h-4 w-4 text-primary-green" />
                <AlertDescription className="font-body text-sm text-text-dark">
                  Danke – deine Nachricht ist bei uns angekommen.
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 ml-1 text-primary-blue"
                    onClick={() => setSent(false)}
                  >
                    Weitere Nachricht senden
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-body text-sm font-medium text-text-dark">E-Mail</Label>
                  <Input
                    value={user?.email || ''}
                    disabled
                    className="font-body h-11 text-sm bg-gray-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="font-body text-sm font-medium text-text-dark">Thema</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger className="h-11 font-body text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="font-body text-sm">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="help-subject" className="font-body text-sm font-medium text-text-dark">
                      Betreff
                    </Label>
                    <Input
                      id="help-subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="font-body h-11 text-sm"
                      placeholder="Worum geht es?"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help-message" className="font-body text-sm font-medium text-text-dark">
                    Nachricht
                  </Label>
                  <Textarea
                    id="help-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                    className="font-body text-sm min-h-[180px] resize-y"
                    placeholder="Beschreibe dein Anliegen…"
                  />
                </div>

                {error && <p className="text-sm text-red-600 font-body">{error}</p>}

                <Button
                  type="submit"
                  disabled={sending || !canSubmit}
                  className="w-full sm:w-auto sm:min-w-[200px] h-11 font-body bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? 'Wird gesendet…' : 'Absenden'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
