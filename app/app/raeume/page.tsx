'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, MapPin, Edit, Trash2, AlertCircle, Euro, Maximize } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Room {
  id: string;
  name: string;
  description: string;
  size_sqm: number;
  hourly_rate: number;
  amenities: string[];
  images: string[];
  is_available: boolean;
}

const AMENITIES = [
  'Yogamatten',
  'Reformer',
  'Massageliege',
  'Umkleidekabine',
  'Dusche',
  'WLAN',
  'Klimaanlage',
  'Heizung',
  'Sound System',
  'Spiegel',
  'Parkplatz',
  'Barrierefreiheit',
];

export default function ProviderRoomsPage() {
  const { userId } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerProfileId, setProviderProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    size_sqm: 0,
    hourly_rate: 0,
    amenities: [] as string[],
    images: [] as string[],
  });

  useEffect(() => {
    if (userId) {
      loadProviderProfile();
    }
  }, [userId]);

  const loadProviderProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setProviderProfileId(profile.id);
        loadRooms(profile.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('provider_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        description: room.description,
        size_sqm: room.size_sqm,
        hourly_rate: room.hourly_rate,
        amenities: room.amenities,
        images: room.images,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        description: '',
        size_sqm: 0,
        hourly_rate: 0,
        amenities: [],
        images: [],
      });
    }
    setIsDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveRoom = async () => {
    if (!providerProfileId) return;

    setError('');
    setSuccess('');

    if (!formData.name || formData.hourly_rate <= 0) {
      setError('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update({
            name: formData.name,
            description: formData.description,
            size_sqm: formData.size_sqm,
            hourly_rate: formData.hourly_rate,
            amenities: formData.amenities,
            images: formData.images,
          })
          .eq('id', editingRoom.id);

        if (error) throw error;
        setSuccess('Raum erfolgreich aktualisiert');
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert({
            provider_id: providerProfileId,
            name: formData.name,
            description: formData.description,
            size_sqm: formData.size_sqm,
            hourly_rate: formData.hourly_rate,
            amenities: formData.amenities,
            images: formData.images,
            is_available: true,
          });

        if (error) throw error;
        setSuccess('Raum erfolgreich erstellt');
      }

      await loadRooms(providerProfileId);
      setTimeout(() => {
        setIsDialogOpen(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Möchtest du diesen Raum wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      if (providerProfileId) {
        await loadRooms(providerProfileId);
      }
      setSuccess('Raum erfolgreich gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleAvailable = async (room: Room) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_available: !room.is_available })
        .eq('id', room.id);

      if (error) throw error;

      if (providerProfileId) {
        await loadRooms(providerProfileId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
            Meine Räume
          </h1>
          <p className="text-gray-600 font-body">
            Verwalten Sie Ihre vermietbaren Räume
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neuer Raum
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

      {rooms.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-info-bg flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-info-text" />
              </div>
              <h3 className="font-heading text-xl font-bold text-text-dark mb-2">
                Noch keine Räume angelegt
              </h3>
              <p className="text-gray-600 font-body mb-6">
                Erstellen Sie Ihren ersten Raum und beginnen Sie, Buchungen zu erhalten.
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
              >
                Ersten Raum erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className={`border-2 ${!room.is_available ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="font-heading text-xl text-text-dark flex-1">
                    {room.name}
                  </CardTitle>
                  <Badge className={room.is_available ? 'bg-success-bg text-success-text' : 'bg-gray-200 text-gray-600'}>
                    {room.is_available ? 'Verfügbar' : 'Nicht verfügbar'}
                  </Badge>
                </div>
                <CardDescription className="font-body min-h-[60px]">
                  {room.description || 'Keine Beschreibung'}
                </CardDescription>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="flex items-center gap-2">
                    <Maximize className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-body">{room.size_sqm} m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-body">{room.hourly_rate}€/Std.</span>
                  </div>
                </div>

                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    {room.amenities.slice(0, 3).map((amenity, idx) => (
                      <Badge key={idx} className="bg-info-bg text-info-text border-none font-body text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {room.amenities.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-600 border-none font-body text-xs">
                        +{room.amenities.length - 3} mehr
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(room)}
                    className="flex-1 font-body"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAvailable(room)}
                    className="font-body"
                  >
                    {room.is_available ? 'Deaktivieren' : 'Aktivieren'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRoom(room.id)}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-text-dark">
              {editingRoom ? 'Raum bearbeiten' : 'Neuen Raum erstellen'}
            </DialogTitle>
            <DialogDescription className="font-body">
              Fülle die Details deines Raums aus
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="font-body">Name des Raums *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Studio A, Trainingsraum 1"
                className="font-body"
              />
            </div>

            <div>
              <Label htmlFor="description" className="font-body">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beschreibe deinen Raum..."
                rows={4}
                className="font-body"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size" className="font-body">Größe (m²)</Label>
                <Input
                  id="size"
                  type="number"
                  value={formData.size_sqm}
                  onChange={(e) => setFormData({ ...formData, size_sqm: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="font-body"
                />
              </div>

              <div>
                <Label htmlFor="rate" className="font-body">Stundensatz (€) *</Label>
                <Input
                  id="rate"
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="5"
                  className="font-body"
                />
              </div>
            </div>

            <div>
              <Label className="font-body mb-3 block">Ausstattung</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <label
                      htmlFor={amenity}
                      className="text-sm font-body text-gray-700 cursor-pointer"
                    >
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-body">
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveRoom}
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              {editingRoom ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
