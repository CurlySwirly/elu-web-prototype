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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
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

      <Card className="border border-gray-200 shadow-sm max-w-xl">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-2">
          <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
            Kontaktformular
          </CardTitle>
          <CardDescription className="font-body text-xs sm:text-sm">
            Schreib uns bei Fragen, Wünschen, Anregungen oder Beschwerden. Wir melden uns in der
            Regel innerhalb von 1–2 Werktagen.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-5">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-body text-sm">E-Mail</Label>
                <Input
                  value={user?.email || ''}
                  disabled
                  className="font-body h-9 text-sm bg-gray-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-body text-sm">Thema</Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger className="h-9 font-body text-sm">
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
              <div className="space-y-1.5">
                <Label htmlFor="help-subject" className="font-body text-sm">
                  Betreff
                </Label>
                <Input
                  id="help-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="font-body h-9 text-sm"
                  placeholder="Worum geht es?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="help-message" className="font-body text-sm">
                  Nachricht
                </Label>
                <Textarea
                  id="help-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="font-body text-sm"
                  placeholder="Beschreibe dein Anliegen…"
                />
              </div>
              {error && <p className="text-sm text-red-600 font-body">{error}</p>}
              <Button
                type="submit"
                disabled={sending}
                className="h-9 font-body text-sm bg-gradient-to-r from-primary-blue to-primary-green text-white"
              >
                {sending ? 'Wird gesendet…' : 'Absenden'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AppPageShell>
  );
}
