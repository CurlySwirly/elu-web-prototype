'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ExpertAboWall } from '@/components/ExpertAboWall';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';
import { formatPlatformFeePercent, PLATFORM_FEE_RATE } from '@/lib/utils/pricing';
import { AlertCircle } from 'lucide-react';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'other', label: 'Divers' },
  { value: 'prefer_not_to_say', label: 'Keine Angabe' },
];

const DEGREE_OPTIONS = [
  'Doktor',
  'Master',
  'Bachelor',
  'Diplom',
  'Staatlich anerkannt',
  'Zertifiziert',
  'Sonstiges',
];

const LANGUAGES = ['Deutsch', 'Englisch', 'Spanisch', 'Französisch'];

export default function ExpertOnboardingPage() {
  const router = useRouter();
  const { userId, user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [aboActive, setAboActive] = useState(false);

  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [languages, setLanguages] = useState<string[]>(['Deutsch']);
  const [profession, setProfession] = useState('');
  const [highestDegree, setHighestDegree] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'return' || params.get('stripe') === 'refresh') {
      setStep(5);
    }
  }, []);

  const toggleArrayItem = (arr: string[], item: string, setter: (val: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter((i) => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleNext = async () => {
    if (step === 1 && (!gender || !dateOfBirth || !address || !city || !postalCode)) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    if (step === 2 && (!profession || !highestDegree)) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    if (step === 2 && !expertProfileId) {
      setLoading(true);
      try {
        const backendMode = getBackendMode();

        if (backendMode === 'mock') {
          setExpertProfileId('mock-expert-onboarding');
        } else {
          const { data: expertProfile, error: expertError } = await supabase
            .from('expert_profiles')
            .insert({
              user_id: userId,
              gender,
              date_of_birth: dateOfBirth,
              address,
              city,
              postal_code: postalCode,
              languages,
              profession,
              highest_degree: highestDegree,
              profile_completion_status: 'basic_onboarding_complete',
              verification_status: 'pending',
            })
            .select()
            .single();

          if (expertError) throw expertError;

          setExpertProfileId(expertProfile.id);

          const { error: onboardingError } = await supabase
            .from('expert_onboarding')
            .insert({
              expert_profile_id: expertProfile.id,
              personal_details_completed: true,
              experience_completed: true,
              onboarding_completed: true,
            });

          if (onboardingError) throw onboardingError;
        }
      } catch (err: any) {
        setError(err.message || 'Fehler beim Speichern');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const finishOnboarding = (opts: { aboActive: boolean; stripeConnected: boolean }) => {
    try {
      sessionStorage.setItem('elu-mock-expert-onboarding-done', '1');
      sessionStorage.setItem(
        'elu-mock-expert-checklist',
        JSON.stringify({
          checklist_stammdaten_completed: true,
          checklist_abo_active: opts.aboActive,
          checklist_stripe_connected: opts.stripeConnected,
          verification_status: 'not_verified_incomplete',
        })
      );
    } catch {
      /* ignore */
    }
    router.push('/app');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-3 py-6 sm:py-8">
      <Card className="w-full max-w-lg border border-gray-200 shadow-sm">
        <CardHeader className="space-y-2 px-4 sm:px-5 pt-4 pb-3">
          <CardTitle className="text-lg sm:text-xl font-heading text-text-dark">
            Expert:in Profil erstellen
          </CardTitle>
          <CardDescription className="font-body text-sm text-gray-500">
            Vervollständige dein Profil, um loszulegen
          </CardDescription>
          <div className="flex gap-1.5 pt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-primary-blue' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-5 pb-4">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <Label className="text-sm mb-2 block font-body font-medium text-text-dark">
                  Geschlecht *
                </Label>
                <RadioGroup value={gender} onValueChange={setGender}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {GENDER_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label
                          htmlFor={option.value}
                          className="cursor-pointer font-normal font-body text-sm"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="dob" className="text-sm font-body font-medium text-text-dark">
                  Geburtsdatum *
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1.5 h-9 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-body font-medium text-text-dark">
                  Adresse *
                </Label>
                <Input
                  id="address"
                  placeholder="Straße und Hausnummer"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label htmlFor="city" className="text-sm font-body font-medium">
                    Stadt *
                  </Label>
                  <Input
                    id="city"
                    placeholder="z.B. Berlin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="text-sm font-body font-medium">
                    PLZ *
                  </Label>
                  <Input
                    id="postalCode"
                    placeholder="z.B. 10115"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1.5 h-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm mb-1 block font-body font-medium text-text-dark">
                  Sprachen
                </Label>
                <p className="text-xs text-gray-500 mb-2 font-body">
                  In welchen Sprachen bietest du deine Services an?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <div key={lang} className="flex items-center gap-2">
                      <Checkbox
                        id={lang}
                        checked={languages.includes(lang)}
                        onCheckedChange={() => toggleArrayItem(languages, lang, setLanguages)}
                      />
                      <Label htmlFor={lang} className="cursor-pointer font-normal font-body text-sm">
                        {lang}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5">
              <div>
                <Label htmlFor="profession" className="text-sm font-body font-medium text-text-dark">
                  Berufsbezeichnung *
                </Label>
                <Input
                  id="profession"
                  placeholder="z.B. Physiotherapeut:in, Coach"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="mt-1.5 h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block font-body font-medium text-text-dark">
                  Höchster Abschluss *
                </Label>
                <RadioGroup value={highestDegree} onValueChange={setHighestDegree}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEGREE_OPTIONS.map((degree) => (
                      <div key={degree} className="flex items-center gap-2">
                        <RadioGroupItem value={degree} id={degree} />
                        <Label
                          htmlFor={degree}
                          className="cursor-pointer font-normal font-body text-sm"
                        >
                          {degree}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Alert className="border-info-text/30 bg-info-bg py-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-info-text" />
                <AlertDescription className="text-info-text font-body text-xs leading-relaxed">
                  <strong>Verifizierung erforderlich:</strong> Deine Qualifikationen müssen geprüft
                  werden, bevor dein Profil öffentlich sichtbar ist.
                </AlertDescription>
              </Alert>

              {expertProfileId && (
                <DocumentUpload
                  expertProfileId={expertProfileId}
                  onUploadComplete={() => {}}
                />
              )}

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-body font-semibold text-sm text-text-dark mb-1.5">
                  Was passiert als Nächstes?
                </h4>
                <ul className="text-xs text-gray-600 font-body space-y-1 list-disc list-inside leading-relaxed">
                  <li>Dokumente werden von unserem Team geprüft</li>
                  <li>Optional: Abo für 0 % Platformabgabe</li>
                  <li>Stripe Connect für Auszahlungen einrichten</li>
                </ul>
              </div>
            </div>
          )}

          {step === 4 && (
            <ExpertAboWall
              userId={userId}
              title="Abo aktivieren (optional)"
              description={`Ohne Abo: ${formatPlatformFeePercent(PLATFORM_FEE_RATE)} Platformabgabe. Mit Abo: 0 %.`}
              skipLabel="Später entscheiden"
              onActivated={() => {
                setAboActive(true);
                setStep(5);
              }}
              onSkip={() => {
                setAboActive(false);
                setStep(5);
              }}
            />
          )}

          {step === 5 && (
            <StripeConnectOnboarding
              variant="embedded"
              userId={userId}
              email={user?.email}
              returnPath="/onboarding/expert?stripe=return"
              refreshPath="/onboarding/expert?stripe=refresh"
              skipLabel="Später im Profil"
              onCompleted={() =>
                finishOnboarding({ aboActive, stripeConnected: true })
              }
              onSkip={() => finishOnboarding({ aboActive, stripeConnected: false })}
            />
          )}

          <div className="flex justify-between gap-2 pt-2 border-t border-gray-100">
            {step > 1 && step < 4 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={loading}
                className="font-body h-9"
              >
                Zurück
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                size="sm"
                className="ml-auto h-9 bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body text-sm"
              >
                {loading ? 'Speichern…' : 'Weiter'}
              </Button>
            ) : step === 3 ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                size="sm"
                className="ml-auto h-9 bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body text-sm"
              >
                Weiter zum Abo
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
