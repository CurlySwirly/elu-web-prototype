'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, MapPin, Users, DollarSign, AlertCircle } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string;
  size_sqm: number;
  hourly_rate: number;
  max_capacity: number;
  amenities: string[];
  address: string;
  city: string;
  is_available: boolean;
  created_at: string;
  provider_profiles: any;
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          provider_profiles:provider_id (
            business_name,
            profiles:user_id (
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRooms(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold text-text-dark mb-2">
          Räume-Verwaltung
        </h2>
        <p className="text-gray-600 font-body">
          Übersicht aller Räume auf der Plattform
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-body">Gesamt Räume</p>
                <p className="text-3xl font-heading font-bold text-text-dark">{rooms.length}</p>
              </div>
              <Building2 className="w-10 h-10 text-primary-blue" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-body">Verfügbare Räume</p>
                <p className="text-3xl font-heading font-bold text-text-dark">
                  {rooms.filter(r => r.is_available).length}
                </p>
              </div>
              <Building2 className="w-10 h-10 text-success-text" />
            </div>
          </CardContent>
        </Card>
      </div>

      {rooms.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-body">Noch keine Räume angelegt</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rooms.map((room) => (
            <Card key={room.id} className="border-2 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-heading font-bold text-lg text-text-dark">
                        {room.name}
                      </h3>
                      <Badge
                        className={`${
                          room.is_available
                            ? 'bg-success-bg text-success-text'
                            : 'bg-gray-200 text-gray-700'
                        } border-none`}
                      >
                        {room.is_available ? 'Verfügbar' : 'Nicht verfügbar'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 font-body mb-3">{room.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 font-body">
                        <MapPin className="w-4 h-4" />
                        {room.city}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 font-body">
                        <Building2 className="w-4 h-4" />
                        {room.size_sqm} m²
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 font-body">
                        <Users className="w-4 h-4" />
                        Max. {room.max_capacity} Personen
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 font-body">
                        <DollarSign className="w-4 h-4" />
                        €{room.hourly_rate}/Stunde
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-500 font-body">
                        <strong>Anbieter:</strong>{' '}
                        {room.provider_profiles?.business_name || 'Unbekannt'} (
                        {room.provider_profiles?.profiles?.email || 'Keine E-Mail'})
                      </p>
                    </div>

                    {room.amenities && room.amenities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {room.amenities.map((amenity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs font-body">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
