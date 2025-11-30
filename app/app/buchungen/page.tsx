'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Check, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface RoomBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  room: {
    name: string;
  };
  expert: {
    full_name: string;
    avatar_url: string;
  };
}

export default function ProviderBookingsPage() {
  const { userId } = useAuth();
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (userId) {
      loadBookings();
    }
  }, [userId]);

  const loadBookings = async () => {
    try {
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (providerProfile) {
        const { data: rooms } = await supabase
          .from('rooms')
          .select('id')
          .eq('provider_id', providerProfile.id);

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map(r => r.id);

          const { data, error } = await supabase
            .from('room_bookings')
            .select(`
              id,
              start_time,
              end_time,
              status,
              total_price,
              rooms:room_id (
                name
              ),
              expert_profiles:expert_id (
                profiles:user_id (
                  full_name,
                  avatar_url
                )
              )
            `)
            .in('room_id', roomIds)
            .order('start_time', { ascending: true });

          if (error) throw error;

          setBookings(data.map((booking: any) => {
            const expertProfiles = Array.isArray(booking.expert_profiles)
              ? booking.expert_profiles[0]
              : booking.expert_profiles;
            const expertProfile = Array.isArray(expertProfiles?.profiles)
              ? expertProfiles?.profiles[0]
              : expertProfiles?.profiles;
            const room = Array.isArray(booking.rooms) ? booking.rooms[0] : booking.rooms;

            return {
              id: booking.id,
              start_time: booking.start_time,
              end_time: booking.end_time,
              status: booking.status,
              total_price: booking.total_price,
              room: {
                name: room?.name || '',
              },
              expert: {
                full_name: expertProfile?.full_name || '',
                avatar_url: expertProfile?.avatar_url || '',
              },
            };
          }));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      setSuccess(`Buchung ${newStatus === 'confirmed' ? 'bestätigt' : 'abgelehnt'}`);
      await loadBookings();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-bg text-success-text';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-error-bg text-error-text';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bestätigt';
      case 'pending': return 'Ausstehend';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const filterByStatus = (status?: string) => {
    if (!status) return bookings;
    return bookings.filter(b => b.status === status);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
            <p className="text-gray-600 font-body">Lädt Buchungen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Raum-Buchungen
        </h1>
        <p className="text-gray-600 font-body">
          Übersicht über alle Raumbuchungen von Expert:innen
        </p>
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

      {bookings.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-body mb-4">
              Noch keine Buchungen vorhanden
            </p>
            <p className="text-sm text-gray-500 font-body">
              Sobald Expert:innen deine Räume buchen, erscheinen sie hier.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="font-body">
              Alle ({bookings.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="font-body">
              Ausstehend ({filterByStatus('pending').length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="font-body">
              Bestätigt ({filterByStatus('confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-body">
              Abgeschlossen ({filterByStatus('completed').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'pending', 'confirmed', 'completed'].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              {filterByStatus(tabValue === 'all' ? undefined : tabValue).map((booking) => (
                <Card key={booking.id} className="border-2 hover:border-primary-blue transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={booking.expert.avatar_url} alt={booking.expert.full_name} />
                          <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                            {booking.expert.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <CardTitle className="font-heading text-xl text-text-dark mb-1">
                            {booking.room.name}
                          </CardTitle>
                          <CardDescription className="font-body">
                            Gebucht von {booking.expert.full_name}
                          </CardDescription>

                          <div className="flex flex-wrap gap-3 mt-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(booking.start_time), 'dd. MMMM yyyy', { locale: de })}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                              <Clock className="w-4 h-4" />
                              {format(new Date(booking.start_time), 'HH:mm')} - {format(new Date(booking.end_time), 'HH:mm')}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                              <MapPin className="w-4 h-4" />
                              Vor Ort
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <Badge className={`${getStatusColor(booking.status)} border-none font-body`}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                        <p className="text-xl font-heading font-bold text-text-dark">
                          €{booking.total_price}
                        </p>
                      </div>
                    </div>

                    {booking.status === 'pending' && (
                      <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                          onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                          className="flex-1 bg-success-bg text-success-text hover:bg-success-bg/80 font-body"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Bestätigen
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                          variant="outline"
                          className="flex-1 border-error-text text-error-text hover:bg-error-bg font-body"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Ablehnen
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                </Card>
              ))}

              {filterByStatus(tabValue === 'all' ? undefined : tabValue).length === 0 && (
                <Card className="border-2">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-body">
                      Keine Buchungen in dieser Kategorie
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
