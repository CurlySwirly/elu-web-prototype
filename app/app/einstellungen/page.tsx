'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ProviderSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Einstellungen
        </h1>
        <p className="text-gray-600 font-body">
          Verwalten Sie Ihre Unternehmensinformationen
        </p>
      </div>

      <div className="max-w-3xl">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-text-dark">
              Unternehmensprofil
            </CardTitle>
            <CardDescription className="font-body">
              Aktualisieren Sie Ihre Geschäftsinformationen
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="font-body">Unternehmensname</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Ihr Studio- oder Praxisname"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessType" className="font-body">Art des Unternehmens</Label>
                <Input
                  id="businessType"
                  type="text"
                  placeholder="z.B. Yoga-Studio, Wellness-Praxis"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="font-body">Beschreibung</Label>
                <Textarea
                  id="description"
                  placeholder="Beschreiben Sie Ihr Unternehmen..."
                  rows={4}
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="font-body">Adresse</Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Straße und Hausnummer"
                  className="font-body"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="font-body">Postleitzahl</Label>
                  <Input
                    id="postalCode"
                    type="text"
                    placeholder="12345"
                    className="font-body"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="font-body">Stadt</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Berlin"
                    className="font-body"
                  />
                </div>
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

              <div className="space-y-2">
                <Label htmlFor="email" className="font-body">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="font-body bg-gray-50"
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
