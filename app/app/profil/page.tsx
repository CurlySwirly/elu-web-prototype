'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle2, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function ProfilePage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    business_name: '',
    business_type: '',
    description: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    billing_address: '',
    billing_city: '',
    billing_postal_code: '',
    tax_id: ''
  });

  useEffect(() => {
    if (user?.id && role === 'provider') {
      fetchProviderProfile();
    } else {
      setLoading(false);
    }
  }, [user, role]);

  const fetchProviderProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data) {
        setFormData({
          company_name: data.company_name || '',
          business_name: data.business_name || '',
          business_type: data.business_type || '',
          description: data.description || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          phone: data.phone || '',
          billing_address: data.billing_address || '',
          billing_city: data.billing_city || '',
          billing_postal_code: data.billing_postal_code || '',
          tax_id: data.tax_id || ''
        });
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!profile) {
        toast({
          title: 'Fehler',
          description: 'Profil nicht gefunden.',
          variant: 'destructive'
        });
        return;
      }

      const allFieldsFilled =
        formData.company_name.trim() &&
        formData.business_name.trim() &&
        formData.address.trim() &&
        formData.city.trim() &&
        formData.postal_code.trim() &&
        formData.phone.trim() &&
        formData.billing_address.trim() &&
        formData.billing_city.trim() &&
        formData.billing_postal_code.trim();

      const { error } = await supabase
        .from('provider_profiles')
        .update({
          ...formData,
          profile_completed: allFieldsFilled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Erfolgreich gespeichert',
        description: allFieldsFilled
          ? 'Ihr Profil ist vollständig!'
          : 'Änderungen wurden gespeichert. Bitte füllen Sie alle Pflichtfelder aus.'
      });

      if (allFieldsFilled) {
        router.push('/app');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (role !== 'provider') {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
            Mein Profil
          </h1>
          <p className="text-gray-600 font-body">
            Verwalte deine persönlichen Informationen
          </p>
        </div>

        <div className="max-w-2xl">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-2xl">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-heading text-2xl text-text-dark">
                    Profil bearbeiten
                  </CardTitle>
                  <CardDescription className="font-body">
                    Aktualisiere deine Kontaktdaten
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-body">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="font-body bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 font-body">Deine E-Mail-Adresse kann nicht geändert werden</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="font-body">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Dein vollständiger Name"
                    className="font-body"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="font-body">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+49 123 456789"
                    className="font-body"
                  />
                </div>

                <Button className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body">
                  Änderungen speichern
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isComplete =
    formData.company_name.trim() &&
    formData.business_name.trim() &&
    formData.address.trim() &&
    formData.city.trim() &&
    formData.postal_code.trim() &&
    formData.phone.trim() &&
    formData.billing_address.trim() &&
    formData.billing_city.trim() &&
    formData.billing_postal_code.trim();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Stammdaten vervollständigen
        </h1>
        <p className="text-gray-600 font-body">
          Bitte füllen Sie alle Pflichtfelder aus, um Ihr Profil zu vervollständigen.
        </p>
      </div>

      {isComplete && (
        <Alert className="mb-6 border-2 border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2 text-green-900">
            <strong className="font-semibold">Profil vollständig!</strong> Alle Stammdaten wurden ausgefüllt.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-blue" />
              Geschäftsinformationen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="font-body">
                  Firmenname / Personenname <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="z.B. Wellness Studio Müller GmbH"
                  required
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_name" className="font-body">
                  Anzeigename <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="Wie Ihr Unternehmen angezeigt wird"
                  required
                  className="font-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type" className="font-body">Geschäftstyp</Label>
              <Input
                id="business_type"
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                placeholder="z.B. Studio, Praxis, Fitnesscenter"
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-body">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kurze Beschreibung Ihres Unternehmens"
                rows={3}
                className="font-body"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Standortadresse</CardTitle>
            <CardDescription className="font-body">Wo befinden sich Ihre Räume?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address" className="font-body">
                Straße und Hausnummer <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="z.B. Hauptstraße 123"
                required
                className="font-body"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code" className="font-body">
                  Postleitzahl <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="12345"
                  required
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="font-body">
                  Stadt <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Berlin"
                  required
                  className="font-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="font-body">
                Telefon <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+49 123 456789"
                required
                className="font-body"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Rechnungsdaten</CardTitle>
            <CardDescription className="font-body">Für Abrechnungen und Steuerzwecke</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax_id" className="font-body">Steuernummer / USt-IdNr.</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="DE123456789"
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_address" className="font-body">
                Rechnungsadresse <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billing_address"
                value={formData.billing_address}
                onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                placeholder="Straße und Hausnummer"
                required
                className="font-body"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_postal_code" className="font-body">
                  PLZ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing_postal_code"
                  value={formData.billing_postal_code}
                  onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                  placeholder="12345"
                  required
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_city" className="font-body">
                  Stadt <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing_city"
                  value={formData.billing_city}
                  onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                  placeholder="Berlin"
                  required
                  className="font-body"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
          >
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/app')}
            className="font-body"
          >
            Zurück zum Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}
