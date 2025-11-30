'use client';

import { useState, useEffect } from 'react';
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
import { AlertCircle } from 'lucide-react';

const SPECIALIZATIONS = [
  'Training',
  'Coaching',
  'Ernährung',
  'Massage',
  'Physiotherapie',
  'Yoga',
  'Pilates',
  'Mental Health',
];

const FOCUS_AREAS = [
  'Rückenschmerzen',
  'Stress',
  'Kraftaufbau',
  'Mobility',
  'Gewichtsmanagement',
  'Rehabilitation',
  'Prävention',
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expertProfileId, setExpertProfileId] = useState('');

  // Profile completion fields
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<File | null>(null);

  // Offer fields
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerDuration, setOfferDuration] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerFormat, setOfferFormat] = useState('online');

  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [iban, setIban] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  useEffect(() => {
    const fetchExpertProfile = async () => {
      const { data } = await supabase
        .from('expert_profiles')
        .select('id, profile_completion_status')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setExpertProfileId(data.id);
        if (data.profile_completion_status === 'profile_complete') {
          router.push('/app');
        }
      }
    };

    fetchExpertProfile();
  }, [userId, router]);

  const toggleArrayItem = (arr: string[], item: string, setter: (val: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!bio || specializations.length === 0)) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    if (step === 2 && (!offerTitle || !offerPrice || !offerDuration)) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }
    if (step === 3 && (!iban || !accountHolder)) {
      setError('Bitte fülle alle Pflichtfelder aus');
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
      // Update expert profile
      const { error: profileError } = await supabase
        .from('expert_profiles')
        .update({
          bio,
          specializations,
          profile_completion_status: 'profile_complete',
          is_profile_complete: true,
        })
        .eq('id', expertProfileId);

      if (profileError) throw profileError;

      // Create offer
      const { error: offerError } = await supabase
        .from('expert_offers')
        .insert({
          expert_id: expertProfileId,
          title: offerTitle,
          description: offerDescription,
          format: offerFormat,
          duration_minutes: parseInt(offerDuration),
          price: parseFloat(offerPrice),
          is_active: true,
        });

      if (offerError) throw offerError;

      // Save payment details
      const { error: paymentError } = await supabase
        .from('expert_payment_details')
        .insert({
          expert_profile_id: expertProfileId,
          payment_method: paymentMethod,
          account_details: {
            iban,
            account_holder: accountHolder,
          },
        });

      if (paymentError) throw paymentError;

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
          <CardTitle className="text-2xl font-heading text-text-dark">Profil vervollständigen</CardTitle>
          <CardDescription className="font-body text-gray-600">
            Vervollständige dein Profil, um für Klient:innen sichtbar zu werden
          </CardDescription>

          <Alert className="mt-4 border-info-text bg-info-bg">
            <AlertCircle className="h-4 w-4 text-info-text" />
            <AlertDescription className="font-body text-sm">
              Deine Qualifikationen werden von unserem Team geprüft. Nach erfolgreicher Prüfung wird dein Profil öffentlich sichtbar.
            </AlertDescription>
          </Alert>

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
                <Label htmlFor="bio" className="text-lg font-heading text-text-dark">Über mich *</Label>
                <p className="text-sm text-gray-600 mb-2 font-body">
                  Stelle dich und deine Arbeitsweise vor (min. 100 Zeichen)
                </p>
                <Textarea
                  id="bio"
                  placeholder="z.B. Ich bin spezialisiert auf..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  className="font-body"
                />
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Spezialisierungen *</Label>
                <p className="text-sm text-gray-600 mb-4 font-body">Wähle mindestens eine Spezialisierung</p>
                <div className="grid grid-cols-2 gap-3">
                  {SPECIALIZATIONS.map((spec) => (
                    <div key={spec} className="flex items-center space-x-2">
                      <Checkbox
                        id={spec}
                        checked={specializations.includes(spec)}
                        onCheckedChange={() => toggleArrayItem(specializations, spec, setSpecializations)}
                      />
                      <Label htmlFor={spec} className="cursor-pointer font-normal font-body">
                        {spec}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Schwerpunkte (optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {FOCUS_AREAS.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={area}
                        checked={focusAreas.includes(area)}
                        onCheckedChange={() => toggleArrayItem(focusAreas, area, setFocusAreas)}
                      />
                      <Label htmlFor={area} className="cursor-pointer font-normal font-body">
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="profileImage" className="text-lg font-heading text-text-dark">Profilbild (optional)</Label>
                <Input
                  id="profileImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-heading text-text-dark mb-4">Erstelle dein erstes Angebot</h3>

              <div>
                <Label htmlFor="offerTitle" className="font-heading text-text-dark">Angebotsname *</Label>
                <Input
                  id="offerTitle"
                  placeholder="z.B. Personal Training Session"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="offerDescription" className="font-heading text-text-dark">Beschreibung *</Label>
                <Textarea
                  id="offerDescription"
                  placeholder="Beschreibe dein Angebot..."
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration" className="font-body">Dauer (Minuten) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="60"
                    value={offerDuration}
                    onChange={(e) => setOfferDuration(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="price" className="font-body">Preis (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="80"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label className="font-heading text-text-dark">Format</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="online"
                      checked={offerFormat === 'online'}
                      onCheckedChange={() => setOfferFormat('online')}
                    />
                    <Label htmlFor="online" className="cursor-pointer font-normal font-body">
                      Online
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="in-person"
                      checked={offerFormat === 'in-person'}
                      onCheckedChange={() => setOfferFormat('in-person')}
                    />
                    <Label htmlFor="in-person" className="cursor-pointer font-normal font-body">
                      Vor Ort
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-heading text-text-dark mb-4">Zahlungsinformationen</h3>
              <p className="text-sm text-gray-600 font-body mb-4">
                Für die Auszahlung deiner Einnahmen benötigen wir deine Bankverbindung
              </p>

              <div>
                <Label htmlFor="accountHolder" className="font-heading text-text-dark">Kontoinhaber *</Label>
                <Input
                  id="accountHolder"
                  placeholder="Max Mustermann"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="iban" className="font-heading text-text-dark">IBAN *</Label>
                <Input
                  id="iban"
                  placeholder="DE89 3704 0044 0532 0130 00"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Alert className="border-info-text bg-info-bg">
                <AlertCircle className="h-4 w-4 text-info-text" />
                <AlertDescription className="font-body text-sm">
                  Deine Zahlungsinformationen werden sicher verschlüsselt gespeichert.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-heading text-text-dark">Fast geschafft!</h3>
              <p className="text-gray-600 font-body">
                Dein Profil ist nun vollständig. Unser Team prüft deine Qualifikationen und schaltet dein Profil innerhalb von 24-48 Stunden frei.
              </p>
              <p className="text-sm text-gray-500 font-body">
                Du wirst per E-Mail benachrichtigt, sobald dein Profil freigeschaltet wurde.
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            {step > 1 && step < 4 && (
              <Button variant="outline" onClick={handleBack} className="font-body">
                Zurück
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} className="ml-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                Weiter
              </Button>
            ) : step === 3 ? (
              <Button onClick={handleSubmit} disabled={loading} className="ml-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                {loading ? 'Wird gespeichert...' : 'Profil abschließen'}
              </Button>
            ) : (
              <Button onClick={() => router.push('/app')} className="mx-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold">
                Zum Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
