'use client';

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
import { Plus, Clock, MapPin, Video, Edit, Trash2, AlertCircle } from 'lucide-react';

interface ExpertOffer {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    format: 'online',
    duration_minutes: 60,
    price: 0,
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
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
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
        })));
        setLoading(false);
        return;
      }

      // In Supabase mode, fetch from database
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setExpertProfileId(profile.id);
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
    if (offer) {
      setEditingOffer(offer);
      setFormData({
        title: offer.title,
        description: offer.description,
        category: offer.category,
        format: offer.format,
        duration_minutes: offer.duration_minutes,
        price: offer.price,
      });
    } else {
      setEditingOffer(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        format: 'online',
        duration_minutes: 60,
        price: 0,
      });
    }
    setIsDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveOffer = async () => {
    if (!expertProfileId) {
      setError('Expert Profil nicht gefunden');
      return;
    }

    setError('');
    setSuccess('');

    if (!formData.title || !formData.category || formData.price <= 0) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      // Check if we're in mock mode
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
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
          is_active: true,
        };

        if (editingOffer) {
          // Update existing offer in the list
          setOffers(offers.map(o => o.id === editingOffer.id ? { ...o, ...formData } : o));
          setSuccess('Angebot erfolgreich aktualisiert');
        } else {
          // Add new offer to the list
          setOffers([newOffer, ...offers]);
          setSuccess('Angebot erfolgreich erstellt');
        }

        setTimeout(() => {
          setIsDialogOpen(false);
          setSuccess('');
          setFormData({
            title: '',
            description: '',
            category: '',
            format: 'online',
            duration_minutes: 60,
            price: 0,
          });
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
            is_active: true,
          });

        if (error) throw error;
        setSuccess('Angebot erfolgreich erstellt');
      }

      await loadOffers(expertProfileId);
      setTimeout(() => {
        setIsDialogOpen(false);
        setSuccess('');
        setFormData({
          title: '',
          description: '',
          category: '',
          format: 'online',
          duration_minutes: 60,
          price: 0,
        });
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

  const handleToggleActive = async (offer: ExpertOffer) => {
    try {
      const { error } = await supabase
        .from('expert_offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id);

      if (error) throw error;

      if (expertProfileId) {
        await loadOffers(expertProfileId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
            Meine Angebote
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
            Verwalte deine Services und Preise
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Angebot
        </Button>
      </div>

      {error && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-success-text bg-success-bg">
          <AlertDescription className="text-success-text font-body">{success}</AlertDescription>
        </Alert>
      )}

      {offers.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-info-text" />
              </div>
              <h3 className="font-heading text-xl font-bold text-text-dark mb-2">
                Noch keine Angebote
              </h3>
              <p className="text-gray-600 font-body mb-6">
                Erstelle dein erstes Angebot und beginne, Buchungen zu erhalten.
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
              >
                Erstes Angebot erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <Card key={offer.id} className={`border-2 ${!offer.is_active ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="font-heading text-xl text-text-dark flex-1">
                    {offer.title}
                  </CardTitle>
                  <Badge className={offer.is_active ? 'bg-success-bg text-success-text' : 'bg-gray-200 text-gray-600'}>
                    {offer.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                <CardDescription className="font-body min-h-[60px]">
                  {offer.description}
                </CardDescription>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Badge className="bg-info-bg text-info-text border-none font-body">
                    {offer.category}
                  </Badge>
                  <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                    {offer.format === 'online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                    {offer.format === 'online' ? 'Online' : 'Vor Ort'}
                  </Badge>
                  <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {offer.duration_minutes} Min.
                  </Badge>
                </div>

                <div className="pt-4 border-t mt-4">
                  <p className="text-3xl font-heading font-bold text-text-dark">€{offer.price}</p>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(offer)}
                    className="flex-1 font-body"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(offer)}
                    className="font-body"
                  >
                    {offer.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="text-error-text hover:bg-error-bg font-body"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-text-dark">
              {editingOffer ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}
            </DialogTitle>
            <DialogDescription className="font-body">
              Erstelle oder bearbeite dein Angebot für Klient:innen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title" className="font-body">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="z.B. Physiotherapie Einzelsitzung"
                className="font-body"
              />
            </div>

            <div>
              <Label htmlFor="description" className="font-body">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beschreibe dein Angebot..."
                rows={4}
                className="font-body"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="font-body">Kategorie *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Wähle eine Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="font-body">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="format" className="font-body">Format *</Label>
                <Select value={formData.format} onValueChange={(value) => setFormData({ ...formData, format: value })}>
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online" className="font-body">Online</SelectItem>
                    <SelectItem value="in-person" className="font-body">Vor Ort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration" className="font-body">Dauer (Minuten) *</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  min="15"
                  step="15"
                  className="font-body"
                />
              </div>

              <div>
                <Label htmlFor="price" className="font-body">Preis (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="5"
                  className="font-body"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-body">
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveOffer}
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              {editingOffer ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
