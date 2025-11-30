'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GOALS_OPTIONS = [
  'Rückenschmerzen',
  'Stress',
  'Fitness',
  'Langlebigkeit',
  'Energie',
  'Ernährung',
  'Gewichtsmanagement',
  'Mobility',
  'Kraftaufbau',
  'Mental Health',
];

const FORMAT_OPTIONS = [
  { value: 'online', label: 'Online' },
  { value: 'vor-ort', label: 'Vor Ort' },
  { value: 'hybrid', label: 'Hybrid' },
];

const LANGUAGE_OPTIONS = ['Deutsch', 'Englisch', 'Spanisch', 'Französisch'];

const TRAINING_LEVELS = [
  { value: 'beginner', label: 'Anfänger' },
  { value: 'intermediate', label: 'Fortgeschritten' },
  { value: 'advanced', label: 'Profi' },
];

export default function ClientOnboardingPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [goals, setGoals] = useState<string[]>([]);
  const [formatPreferences, setFormatPreferences] = useState<string[]>([]);
  const [locationCity, setLocationCity] = useState('');
  const [locationPostalCode, setLocationPostalCode] = useState('');
  const [languages, setLanguages] = useState<string[]>(['Deutsch']);
  const [trainingLevel, setTrainingLevel] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const toggleArrayItem = (arr: string[], item: string, setter: (val: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleNext = () => {
    if (step === 1 && goals.length === 0) {
      setError('Bitte wähle mindestens ein Ziel aus');
      return;
    }
    if (step === 2 && formatPreferences.length === 0) {
      setError('Bitte wähle mindestens ein Format aus');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('client_preferences')
        .insert({
          user_id: userId,
          goals,
          format_preferences: formatPreferences,
          location_city: locationCity,
          location_postal_code: locationPostalCode,
          languages,
          training_level: trainingLevel,
          additional_notes: additionalNotes,
          onboarding_completed: true,
        });

      if (insertError) throw insertError;

      router.push('/app');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-heading text-text-dark">Willkommen bei elu</CardTitle>
          <CardDescription className="font-body text-gray-600">
            Erzähl uns ein wenig über deine Ziele, damit wir die perfekten Expert:innen für dich finden können
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary-blue' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Wobei dürfen wir dich unterstützen?</Label>
                <p className="text-sm text-gray-600 mb-4 font-body">Wähle alle Ziele aus, die auf dich zutreffen</p>
                <div className="grid grid-cols-2 gap-3">
                  {GOALS_OPTIONS.map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        id={goal}
                        checked={goals.includes(goal)}
                        onCheckedChange={() => toggleArrayItem(goals, goal, setGoals)}
                      />
                      <Label htmlFor={goal} className="cursor-pointer font-normal font-body">
                        {goal}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Wie möchtest du am liebsten trainieren?</Label>
                <div className="space-y-3">
                  {FORMAT_OPTIONS.map((format) => (
                    <div key={format.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={format.value}
                        checked={formatPreferences.includes(format.value)}
                        onCheckedChange={() => toggleArrayItem(formatPreferences, format.value, setFormatPreferences)}
                      />
                      <Label htmlFor={format.value} className="cursor-pointer font-normal font-body">
                        {format.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {(formatPreferences.includes('vor-ort') || formatPreferences.includes('hybrid')) && (
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-heading text-text-dark">Standort für Vor-Ort-Termine</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city" className="font-body">Stadt</Label>
                      <Input
                        id="city"
                        placeholder="z.B. Berlin"
                        value={locationCity}
                        onChange={(e) => setLocationCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal" className="font-body">PLZ</Label>
                      <Input
                        id="postal"
                        placeholder="z.B. 10115"
                        value={locationPostalCode}
                        onChange={(e) => setLocationPostalCode(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Sprachen</Label>
                <p className="text-sm text-gray-600 mb-4 font-body">In welchen Sprachen möchtest du betreut werden?</p>
                <div className="grid grid-cols-2 gap-3">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <div key={lang} className="flex items-center space-x-2">
                      <Checkbox
                        id={lang}
                        checked={languages.includes(lang)}
                        onCheckedChange={() => toggleArrayItem(languages, lang, setLanguages)}
                      />
                      <Label htmlFor={lang} className="cursor-pointer font-normal font-body">
                        {lang}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Trainingslevel</Label>
                <div className="space-y-2">
                  {TRAINING_LEVELS.map((level) => (
                    <div key={level.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={level.value}
                        checked={trainingLevel === level.value}
                        onCheckedChange={() => setTrainingLevel(level.value)}
                      />
                      <Label htmlFor={level.value} className="cursor-pointer font-normal font-body">
                        {level.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Noch etwas, das wir wissen sollten?</Label>
                <p className="text-sm text-gray-600 mb-4 font-body">
                  Teile uns deine persönlichen Wünsche oder besondere Bedürfnisse mit (optional)
                </p>
                <Textarea
                  placeholder="z.B. Ich bevorzuge ruhige Sessions, habe Erfahrung mit Yoga..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Zurück
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={handleNext} className="ml-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                Weiter
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="ml-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                {loading ? 'Wird gespeichert...' : 'Profil vervollständigen'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
