'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Clock, MapPin, Video, Edit, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  formatOfferLocation,
  isOnlineOfferFormat,
} from '@/lib/utils/offer-location';
import { ensureMockExpertDemoState } from '@/lib/backend/mock/expert-demo-state';

interface ExpertOffer {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  location_address?: string;
  location_postal_code?: string;
  location_city?: string;
}

const emptyForm = {
  title: '',
  description: '',
  category: '',
  format: '',
  duration_minutes: 60,
  price: 0,
  is_active: true,
  location_address: '',
  location_postal_code: '',
  location_city: '',
};

const CATEGORIES = [
  'Physiotherapie',
  'Personal Training',
  'Yoga',
  'Pilates',
  'Massage',
  'Ernährungsberatung',
  'Mental Health Coaching',
  'Prävention',
  'Rehabilitation',
  'Sonstiges',
];

export default function OffersPage() {
  const { userId } = useAuth();
  const [offers, setOffers] = useState<ExpertOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ExpertOffer | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState(emptyForm);
  const [profileAddress, setProfileAddress] = useState({
    address: '',
    postal_code: '',
    city: '',
  });

  const loadOffers = useCallback(async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('expert_offers')
        .select('*')
        .eq('expert_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const loadExpertProfile = useCallback(async () => {
    try {
      // Check if we're in mock mode
      const backendMode = getBackendMode();
      
      if (backendMode === 'mock') {
        // In mock mode, create a mock expert profile ID and load mock offers
        setExpertProfileId(`mock-expert-${userId}`);
        const { mockExpertOwnOffers } = await import('@/lib/backend/mock/data');
        setOffers(mockExpertOwnOffers.map(offer => ({
          id: offer.id,
          title: offer.title,
          description: offer.description,
          category: offer.category,
          format: offer.format,
          duration_minutes: offer.duration_minutes,
          price: offer.price,
          is_active: offer.is_active ?? true,
          location_address: offer.location_address || '',
          location_postal_code: offer.location_postal_code || '',
          location_city: offer.location_city || '',
        })));
        setProfileAddress({
          address: 'Leopoldstraße 42',
          postal_code: '80802',
          city: 'München',
        });
        setLoading(false);
        return;
      }

      // In Supabase mode, fetch from database
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('id, address, postal_code, city')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setExpertProfileId(profile.id);
        setProfileAddress({
          address: profile.address || '',
          postal_code: profile.postal_code || '',
          city: profile.city || '',
        });
        loadOffers(profile.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, loadOffers]);

  useEffect(() => {
    if (userId) {
      loadExpertProfile();
    }
  }, [userId, loadExpertProfile]);

  const handleOpenDialog = (offer?: ExpertOffer) => {
    if (!offer && getBackendMode() === 'mock') {
      ensureMockExpertDemoState(userId);
    }

    if (offer) {
      setEditingOffer(offer);
      const formatValue = isOnlineOfferFormat(offer.format) ? 'online' : 'in-person';
      setFormData({
        title: offer.title,
        description: offer.description,
        category: offer.category,
        format: formatValue,
        duration_minutes: offer.duration_minutes,
        price: offer.price,
        is_active: offer.is_active,
        location_address: offer.location_address || '',
        location_postal_code: offer.location_postal_code || '',
        location_city: offer.location_city || '',
      });
    } else {
      setEditingOffer(null);
      setFormData({ ...emptyForm });
    }
    setIsDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleFormatChange = (value: string) => {
    if (value === 'online') {
      setFormData({
        ...formData,
        format: value,
        location_address: '',
        location_postal_code: '',
        location_city: '',
      });
      return;
    }

    setFormData({
      ...formData,
      format: value,
      location_address: formData.location_address || profileAddress.address,
      location_postal_code: formData.location_postal_code || profileAddress.postal_code,
      location_city: formData.location_city || profileAddress.city,
    });
  };

  const handleSaveOffer = async () => {
    if (!expertProfileId) {
      setError('Expert Profil nicht gefunden');
      return;
    }

    setError('');
    setSuccess('');

    if (!formData.title || !formData.category || !formData.format || formData.price <= 0) {
      setError('Bitte fülle alle Pflichtfelder aus (inkl. Format)');
      return;
    }

    const isInPerson = formData.format === 'in-person';
    if (
      isInPerson &&
      (!formData.location_address.trim() ||
        !formData.location_postal_code.trim() ||
        !formData.location_city.trim())
    ) {
      setError('Für Vor-Ort-Angebote bitte Straße, PLZ und Ort angeben');
      return;
    }

    const locationPayload = isInPerson
      ? {
          location_address: formData.location_address.trim(),
          location_postal_code: formData.location_postal_code.trim(),
          location_city: formData.location_city.trim(),
        }
      : {
          location_address: '',
          location_postal_code: '',
          location_city: '',
        };

    try {
      // Check if we're in mock mode
      const backendMode = getBackendMode();
      
      if (backendMode === 'mock') {
        // In mock mode, simulate success
        const newOffer: ExpertOffer = editingOffer || {
          id: `mock-offer-${Date.now()}`,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          format: formData.format,
          duration_minutes: formData.duration_minutes,
          price: formData.price,
          is_active: formData.is_active,
          ...locationPayload,
        };

        if (editingOffer) {
          // Update existing offer in the list
          setOffers(
            offers.map((o) =>
              o.id === editingOffer.id
                ? { ...o, ...formData, ...locationPayload, is_active: formData.is_active }
                : o
            )
          );
          setSuccess('Angebot erfolgreich aktualisiert');
        } else {
          // Add new offer to the list
          setOffers([{ ...newOffer, ...locationPayload }, ...offers]);
          setSuccess('Angebot erfolgreich erstellt');
        }

        setTimeout(() => {
          setIsDialogOpen(false);
          setSuccess('');
          setFormData({ ...emptyForm });
        }, 1500);
        return;
      }

      // In Supabase mode, save to database
      if (editingOffer) {
        const { error } = await supabase
          .from('expert_offers')
          .update({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            format: formData.format,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            is_active: formData.is_active,
            ...locationPayload,
          })
          .eq('id', editingOffer.id);

        if (error) throw error;
        setSuccess('Angebot erfolgreich aktualisiert');
      } else {
        const { error } = await supabase
          .from('expert_offers')
          .insert({
            expert_id: expertProfileId,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            format: formData.format,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            is_active: formData.is_active,
            ...locationPayload,
          });

        if (error) throw error;
        setSuccess('Angebot erfolgreich erstellt');
      }

      await loadOffers(expertProfileId);
      setTimeout(() => {
        setIsDialogOpen(false);
        setSuccess('');
        setFormData({ ...emptyForm });
      }, 1500);
    } catch (err: any) {
      console.error('Error saving offer:', err);
      setError(err.message || 'Fehler beim Speichern');
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Möchtest du dieses Angebot wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('expert_offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;

      if (expertProfileId) {
        await loadOffers(expertProfileId);
      }
      setSuccess('Angebot erfolgreich gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <AppPageShell>
        <div className="flex items-center justify-center min-h-[280px]">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue" />
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <AppPageHeader
        title="Meine Angebote"
        description="Verwalte deine Services und Preise"
        action={
          <Button
            size="sm"
            onClick={() => handleOpenDialog()}
            className="w-full sm:w-auto h-9 text-sm bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Neues Angebot
          </Button>
        }
      />

      {error && (
        <Alert className="border-error-text bg-error-bg py-2">
          <AlertCircle className="h-3.5 w-3.5 text-error-text" />
          <AlertDescription className="text-error-text font-body text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success-text bg-success-bg py-2">
          <AlertDescription className="text-success-text font-body text-xs">{success}</AlertDescription>
        </Alert>
      )}

      {offers.length === 0 ? (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="py-10 text-center px-4">
            <div className="max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-info-bg flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-info-text" />
              </div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-text-dark mb-1">
                Noch keine Angebote
              </h3>
              <p className="text-sm text-gray-600 font-body mb-4 leading-relaxed">
                Erstelle dein erstes Angebot und beginne, Buchungen zu erhalten.
              </p>
              <Button
                size="sm"
                onClick={() => handleOpenDialog()}
                className="h-9 text-sm bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
              >
                Erstes Angebot erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {offers.map((offer) => (
            <Card
              key={offer.id}
              className={cn(
                'border border-gray-200 shadow-sm overflow-hidden flex flex-col',
                !offer.is_active && 'opacity-70'
              )}
            >
              <CardHeader className="px-4 sm:px-5 pt-4 pb-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading text-base sm:text-lg text-text-dark leading-snug min-w-0">
                    {offer.title}
                  </CardTitle>
                  <Badge
                    className={cn(
                      'shrink-0 text-[11px] font-body px-2 py-0.5 flex items-center gap-1',
                      offer.is_active
                        ? 'bg-primary-green/20 text-text-dark border border-primary-green/35'
                        : 'bg-gray-100 text-gray-600 border-none'
                    )}
                  >
                    {offer.is_active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Aktiv
                      </>
                    ) : (
                      'Inaktiv'
                    )}
                  </Badge>
                </div>
                {offer.description ? (
                  <CardDescription className="font-body text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {offer.description}
                  </CardDescription>
                ) : null}

                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-info-bg text-info-text border-none font-body text-[11px] px-2 py-0.5">
                    {offer.category}
                  </Badge>
                  <Badge className="bg-info-bg text-info-text border-none font-body text-[11px] px-2 py-0.5 flex items-center gap-1">
                    {isOnlineOfferFormat(offer.format) ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <MapPin className="w-3 h-3" />
                    )}
                    {isOnlineOfferFormat(offer.format) ? 'Online' : 'Vor Ort'}
                  </Badge>
                  <Badge className="bg-info-bg text-info-text border-none font-body text-[11px] px-2 py-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {offer.duration_minutes} Min.
                  </Badge>
                </div>

                {!isOnlineOfferFormat(offer.format) && formatOfferLocation(offer) ? (
                  <p className="text-xs text-gray-500 font-body flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{formatOfferLocation(offer)}</span>
                  </p>
                ) : null}
              </CardHeader>

              <CardContent className="px-4 sm:px-5 pb-4 pt-3 mt-auto border-t border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(offer)}
                      className="h-8 text-xs font-body px-2.5 min-w-0"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      <span className="truncate">Bearbeiten</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOffer(offer.id)}
                      className="h-8 w-8 p-0 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 font-body"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-lg sm:text-xl font-heading font-bold text-text-dark tabular-nums shrink-0">
                    €{offer.price}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg font-body max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg sm:text-xl text-text-dark">
              {editingOffer ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-gray-600">
              Erstelle oder bearbeite dein Angebot für Klient:innen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="font-body text-sm">
                Titel *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="z.B. Physiotherapie Einzelsitzung"
                className="font-body h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="font-body text-sm">
                Beschreibung
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beschreibe dein Angebot..."
                rows={3}
                className="font-body text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="font-body text-sm">
                  Kategorie *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="font-body h-9 text-sm">
                    <SelectValue placeholder="Wähle eine Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="font-body text-sm">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="format" className="font-body text-sm">
                  Format *
                </Label>
                <Select value={formData.format || undefined} onValueChange={handleFormatChange}>
                  <SelectTrigger className="font-body h-9 text-sm">
                    <SelectValue placeholder="Online oder Vor Ort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online" className="font-body text-sm">
                      Online
                    </SelectItem>
                    <SelectItem value="in-person" className="font-body text-sm">
                      Vor Ort
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.format === 'in-person' && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-bg-light/60 p-3">
                <div>
                  <p className="font-body text-sm font-medium text-text-dark">Adresse *</p>
                  <p className="font-body text-xs text-gray-500 mt-0.5">
                    Wird in den Buchungsdetails für Klient:innen angezeigt
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location_address" className="font-body text-sm">
                    Straße und Hausnummer *
                  </Label>
                  <Input
                    id="location_address"
                    value={formData.location_address}
                    onChange={(e) =>
                      setFormData({ ...formData, location_address: e.target.value })
                    }
                    placeholder="z.B. Leopoldstraße 42"
                    className="font-body h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="location_postal_code" className="font-body text-sm">
                      PLZ *
                    </Label>
                    <Input
                      id="location_postal_code"
                      value={formData.location_postal_code}
                      onChange={(e) =>
                        setFormData({ ...formData, location_postal_code: e.target.value })
                      }
                      placeholder="80802"
                      className="font-body h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location_city" className="font-body text-sm">
                      Ort *
                    </Label>
                    <Input
                      id="location_city"
                      value={formData.location_city}
                      onChange={(e) =>
                        setFormData({ ...formData, location_city: e.target.value })
                      }
                      placeholder="München"
                      className="font-body h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="duration" className="font-body text-sm">
                  Dauer (Min.) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
                  }
                  min="15"
                  step="15"
                  className="font-body h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price" className="font-body text-sm">
                  Preis (€) *
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="5"
                  className="font-body h-9 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-bg-light/60 px-3 py-2.5">
              <div className="min-w-0">
                <Label htmlFor="is_active" className="font-body text-sm text-text-dark">
                  Angebot online
                </Label>
                <p className="font-body text-xs text-gray-500 mt-0.5">
                  Offline nehmen, damit es nicht mehr buchbar ist
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="font-body h-9"
            >
              Abbrechen
            </Button>
            <Button
              size="sm"
              onClick={handleSaveOffer}
              className="h-9 bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              {editingOffer ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  );
}
