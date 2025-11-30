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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DocumentUpload } from '@/components/DocumentUpload';
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
  const { userId } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);

  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [languages, setLanguages] = useState<string[]>(['Deutsch']);
  const [profession, setProfession] = useState('');
  const [highestDegree, setHighestDegree] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const toggleArrayItem = (arr: string[], item: string, setter: (val: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
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

  const handleSubmit = async () => {
    router.push('/app');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-heading text-text-dark">Expert:in Profil erstellen</CardTitle>
          <CardDescription className="font-body text-gray-600">
            Vervollständige dein Profil, um loszulegen
          </CardDescription>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((s) => (
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
                <Label className="text-lg mb-3 block font-heading text-text-dark">Geschlecht *</Label>
                <RadioGroup value={gender} onValueChange={setGender}>
                  <div className="space-y-2">
                    {GENDER_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label htmlFor={option.value} className="cursor-pointer font-normal font-body">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="dob" className="text-lg font-heading text-text-dark">Geburtsdatum *</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-lg font-heading text-text-dark">Adresse *</Label>
                <Input
                  id="address"
                  placeholder="Straße und Hausnummer"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="font-body">Stadt *</Label>
                  <Input
                    id="city"
                    placeholder="z.B. Berlin"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="postalCode" className="font-body">PLZ *</Label>
                  <Input
                    id="postalCode"
                    placeholder="z.B. 10115"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Sprachen</Label>
                <p className="text-sm text-gray-600 mb-4 font-body">In welchen Sprachen bietest du deine Services an?</p>
                <div className="grid grid-cols-2 gap-3">
                  {LANGUAGES.map((lang) => (
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="profession" className="text-lg font-heading text-text-dark">Berufsbezeichnung *</Label>
                <Input
                  id="profession"
                  placeholder="z.B. Physiotherapeut:in, Personal Trainer:in, Coach"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Höchster Abschluss *</Label>
                <RadioGroup value={highestDegree} onValueChange={setHighestDegree}>
                  <div className="grid grid-cols-2 gap-3">
                    {DEGREE_OPTIONS.map((degree) => (
                      <div key={degree} className="flex items-center space-x-2">
                        <RadioGroupItem value={degree} id={degree} />
                        <Label htmlFor={degree} className="cursor-pointer font-normal font-body">
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
            <div className="space-y-4">
              <Alert className="border-info-text bg-info-bg">
                <AlertCircle className="h-4 w-4 text-info-text" />
                <AlertDescription className="text-info-text font-body">
                  <strong>Verifizierung erforderlich:</strong> Deine Qualifikationen müssen von einem Administrator geprüft werden, bevor dein Profil öffentlich sichtbar ist und du Räume buchen kannst.
                </AlertDescription>
              </Alert>

              {expertProfileId && (
                <DocumentUpload
                  expertProfileId={expertProfileId}
                  onUploadComplete={() => {}}
                />
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-body font-semibold text-text-dark mb-2">Was passiert als Nächstes?</h4>
                <ul className="text-sm text-gray-700 font-body space-y-1 list-disc list-inside">
                  <li>Deine Dokumente werden von unserem Team geprüft</li>
                  <li>Du erhältst eine E-Mail über den Verifizierungsstatus</li>
                  <li>Nach der Verifizierung ist dein Profil für Kund:innen sichtbar</li>
                  <li>Du kannst dann Räume buchen und Buchungen entgegennehmen</li>
                </ul>
              </div>
            </div>
          )}



          <div className="flex justify-between pt-4">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Zurück
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} disabled={loading} className="ml-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                {loading ? 'Wird gespeichert...' : 'Weiter'}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="ml-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                Dashboard öffnen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
