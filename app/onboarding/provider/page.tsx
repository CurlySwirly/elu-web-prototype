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

const ROOM_TYPES = [
  'Studio',
  'Praxis',
  'PT-Gym',
  'Massageraum',
  'Coachingraum',
  'Yogaraum',
  'Mehrzweckraum',
];

const EQUIPMENT_OPTIONS = [
  'Trainingsgeräte',
  'Behandlungsliege',
  'Yogamatten',
  'Spiegel',
  'Dusche',
  'Umkleide',
  'Handtücher',
  'Musik-Anlage',
  'Klimaanlage',
  'WLAN',
];

const ACCESS_METHODS = [
  { value: 'keybox', label: 'Schlüsselbox' },
  { value: 'code', label: 'Nuki / Code' },
  { value: 'personal', label: 'Persönliche Übergabe' },
];

export default function ProviderOnboardingPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [roomType, setRoomType] = useState('');
  const [roomSize, setRoomSize] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [usageRules, setUsageRules] = useState('');
  const [maxPersons, setMaxPersons] = useState('');
  const [accessMethod, setAccessMethod] = useState('');
  const [specialRules, setSpecialRules] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [insuranceConfirmed, setInsuranceConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const toggleArrayItem = (arr: string[], item: string, setter: (val: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!businessName || !address || !city || !postalCode)) {
      setError('Bitte fülle alle Standortfelder aus');
      return;
    }
    if (step === 2 && (!roomType || !roomSize)) {
      setError('Bitte fülle alle Raumdetails aus');
      return;
    }
    if (step === 3 && !accessMethod) {
      setError('Bitte wähle eine Zugangsmethode aus');
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
    if (!hourlyRate || !insuranceConfirmed || !termsAccepted) {
      setError('Bitte fülle alle Pflichtfelder aus und akzeptiere die Bedingungen');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: providerProfile, error: providerError } = await supabase
        .from('provider_profiles')
        .insert({
          user_id: userId,
          business_name: businessName,
          business_type: roomType.toLowerCase().includes('studio') ? 'studio' : 'praxis',
          description: specialRules,
          address,
          city,
          postal_code: postalCode,
          amenities: equipment,
        })
        .select()
        .single();

      if (providerError) throw providerError;

      const { error: onboardingError } = await supabase
        .from('provider_onboarding')
        .insert({
          provider_profile_id: providerProfile.id,
          room_type: roomType,
          room_size_sqm: parseInt(roomSize) || 0,
          equipment,
          usage_rules: usageRules.split('\n').filter(r => r.trim()),
          max_persons: parseInt(maxPersons) || 1,
          access_method: accessMethod,
          special_rules: specialRules,
          insurance_confirmed: insuranceConfirmed,
          terms_accepted: termsAccepted,
          onboarding_completed: true,
        });

      if (onboardingError) throw onboardingError;

      const { error: roomError } = await supabase
        .from('rooms')
        .insert({
          provider_id: providerProfile.id,
          name: `${roomType} - ${businessName}`,
          description: specialRules,
          size_sqm: parseInt(roomSize) || 0,
          hourly_rate: parseFloat(hourlyRate),
          amenities: equipment,
          is_available: true,
        });

      if (roomError) throw roomError;

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
          <CardTitle className="text-2xl font-heading text-text-dark">Raum anbieten</CardTitle>
          <CardDescription className="font-body text-gray-600">
            Erstelle dein Raum-Listing, damit Expert:innen deinen Raum stundenweise buchen können
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
                <Label htmlFor="businessName" className="text-lg font-heading text-text-dark">Name / Unternehmen *</Label>
                <Input
                  id="businessName"
                  placeholder="z.B. Studio Harmony"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Art des Raumes *</Label>
                <RadioGroup value={roomType} onValueChange={setRoomType}>
                  <div className="grid grid-cols-2 gap-3">
                    {ROOM_TYPES.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <RadioGroupItem value={type} id={type} />
                        <Label htmlFor={type} className="cursor-pointer font-normal font-body">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="roomSize" className="text-lg font-heading text-text-dark">Raumgröße *</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="roomSize"
                    type="number"
                    placeholder="50"
                    value={roomSize}
                    onChange={(e) => setRoomSize(e.target.value)}
                  />
                  <span className="text-gray-600">m²</span>
                </div>
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Ausstattung</Label>
                <p className="text-sm text-gray-600 mb-4 font-body">Was ist im Raum vorhanden?</p>
                <div className="grid grid-cols-2 gap-3">
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <div key={item} className="flex items-center space-x-2">
                      <Checkbox
                        id={item}
                        checked={equipment.includes(item)}
                        onCheckedChange={() => toggleArrayItem(equipment, item, setEquipment)}
                      />
                      <Label htmlFor={item} className="cursor-pointer font-normal font-body">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="usageRules" className="text-lg font-heading text-text-dark">Nutzungsregeln</Label>
                <p className="text-sm text-gray-600 mb-2 font-body">Eine Regel pro Zeile</p>
                <Textarea
                  id="usageRules"
                  placeholder="z.B.&#10;Raum nach Nutzung aufräumen&#10;Keine Straßenschuhe&#10;Maximale Lautstärke beachten"
                  value={usageRules}
                  onChange={(e) => setUsageRules(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="maxPersons" className="text-lg font-heading text-text-dark">Maximale Personenanzahl</Label>
                <Input
                  id="maxPersons"
                  type="number"
                  placeholder="z.B. 8"
                  value={maxPersons}
                  onChange={(e) => setMaxPersons(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-lg mb-3 block font-heading text-text-dark">Zugangsmethode *</Label>
                <RadioGroup value={accessMethod} onValueChange={setAccessMethod}>
                  <div className="space-y-2">
                    {ACCESS_METHODS.map((method) => (
                      <div key={method.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={method.value} id={method.value} />
                        <Label htmlFor={method.value} className="cursor-pointer font-normal font-body">
                          {method.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="specialRules" className="text-lg font-heading text-text-dark">Besondere Hinweise</Label>
                <Textarea
                  id="specialRules"
                  placeholder="Weitere wichtige Informationen für Mieter..."
                  value={specialRules}
                  onChange={(e) => setSpecialRules(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="hourlyRate" className="text-lg font-heading text-text-dark">Preis pro Stunde *</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="25"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                  <span className="text-gray-600">€ / Stunde</span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="insurance"
                    checked={insuranceConfirmed}
                    onCheckedChange={(checked) => setInsuranceConfirmed(checked as boolean)}
                  />
                  <div>
                    <Label htmlFor="insurance" className="cursor-pointer font-normal font-body">
                      Der Raum ist versichert *
                    </Label>
                    <p className="text-sm text-gray-600 font-body">
                      Ich bestätige, dass eine entsprechende Versicherung besteht
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                  />
                  <div>
                    <Label htmlFor="terms" className="cursor-pointer font-normal font-body">
                      AGB akzeptieren *
                    </Label>
                    <p className="text-sm text-gray-600 font-body">
                      Ich akzeptiere die Allgemeinen Geschäftsbedingungen für Provider
                    </p>
                  </div>
                </div>
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
                {loading ? 'Wird gespeichert...' : 'Raum veröffentlichen'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
