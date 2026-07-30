'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Search, Star, Euro, Maximize, AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { de } from 'date-fns/locale';

interface Room {
  id: string;
  name: string;
  description: string;
  size_sqm: number;
  hourly_rate: number;
  amenities: string[];
  is_available: boolean;
  provider: {
    business_name: string;
    city: string;
  };
}

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

export default function FindRoomsPage() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState(1);
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [linkedAppointment, setLinkedAppointment] = useState<any>(null);

  const loadExpertProfile = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('id, verification_status')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setExpertProfileId(profile.id);
        setVerificationStatus(profile.verification_status || 'not_verified_incomplete');
        setIsVerified(profile.verification_status === 'verified');
      }

      await loadRooms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadAppointmentDetails = useCallback(async () => {
    if (!appointmentId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, expert_offers:offer_id(title)')
        .eq('id', appointmentId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLinkedAppointment(data);
        const startDate = new Date(data.start_time);
        const endDate = new Date(data.end_time);
        const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

        setSelectedDate(startDate);
        setSelectedTime(format(startDate, 'HH:mm'));
        setDuration(Math.ceil(hours));
      }
    } catch (err: any) {
      console.error('Error loading appointment:', err);
    }
  }, [appointmentId]);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          name,
          description,
          size_sqm,
          hourly_rate,
          amenities,
          is_available,
          provider_profiles:provider_id (
            business_name,
            city
          )
        `)
        .eq('is_available', true)
        .order('hourly_rate', { ascending: true });

      if (error) throw error;

      setRooms(data.map((room: any) => {
        const provider = Array.isArray(room.provider_profiles)
          ? room.provider_profiles[0]
          : room.provider_profiles;

        return {
          id: room.id,
          name: room.name,
          description: room.description,
          size_sqm: room.size_sqm,
          hourly_rate: room.hourly_rate,
          amenities: room.amenities,
          is_available: room.is_available,
          provider: {
            business_name: provider?.business_name || '',
            city: provider?.city || '',
          },
        };
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filterRooms = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredRooms(rooms);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = rooms.filter(room =>
      room.name.toLowerCase().includes(query) ||
      room.provider.business_name.toLowerCase().includes(query) ||
      room.provider.city.toLowerCase().includes(query) ||
      room.amenities.some(a => a.toLowerCase().includes(query))
    );
    setFilteredRooms(filtered);
  }, [searchQuery, rooms]);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedDate(new Date());
    setSelectedTime('');
    setDuration(1);
    setStep('select');
    setError('');
  };

  const handleBookRoom = async () => {
    if (!expertProfileId || !selectedRoom || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const [hours, minutes] = selectedTime.split(':');
      const startTime = setMinutes(setHours(selectedDate!, parseInt(hours)), parseInt(minutes));
      const endTime = new Date(startTime.getTime() + (duration * 60 * 60000));

      const totalPrice = selectedRoom.hourly_rate * duration;

      const { data: booking, error: insertError } = await supabase
        .from('room_bookings')
        .insert({
          room_id: selectedRoom.id,
          expert_id: expertProfileId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          total_price: totalPrice,
          appointment_id: appointmentId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (booking && appointmentId) {
        await supabase
          .from('appointments')
          .update({ room_booking_id: booking.id })
          .eq('id', appointmentId);
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Buchung');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedDate || !selectedTime) {
      setError('Bitte wähle ein Datum und eine Uhrzeit');
      return;
    }
    setStep('payment');
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
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
          Räume finden
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
          {linkedAppointment
            ? `Raum für Session "${linkedAppointment.expert_offers?.title || 'Session'}" buchen`
            : 'Buche professionelle Räume für deine In-Person-Sessions'
          }
        </p>
      </div>

      {!isVerified && (
        <Alert className="mb-6 border-2 border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="ml-2 text-yellow-900">
            <strong className="font-semibold">Du bist noch nicht verifiziert.</strong>
            {verificationStatus === 'not_verified_incomplete' && (
              <span> Bitte schließe alle Schritte in deinem Dashboard ab und lade deine Qualifikationen hoch.</span>
            )}
            {verificationStatus === 'not_verified_pending_review' && (
              <span> Deine Qualifikationen werden gerade geprüft. Du kannst Räume buchen, sobald du verifiziert bist.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Suche nach Stadt, Raum oder Ausstattung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
      </div>

      {error && !selectedRoom && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      {filteredRooms.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="font-heading text-xl font-bold text-text-dark mb-2">
              {searchQuery ? 'Keine passenden Räume gefunden' : 'Noch keine Räume verfügbar'}
            </h3>
            <p className="text-gray-600 font-body">
              {searchQuery
                ? 'Versuche einen anderen Suchbegriff'
                : 'Wir arbeiten daran, dir bald tolle Räume in deiner Nähe anzubieten.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="border-2 hover:border-primary-blue transition-colors">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-text-dark mb-2">
                  {room.name}
                </CardTitle>
                <CardDescription className="font-body min-h-[60px]">
                  {room.description || 'Professioneller Raum für deine Sessions'}
                </CardDescription>

                <div className="flex items-center gap-2 text-sm text-gray-600 font-body pt-2">
                  <MapPin className="w-4 h-4" />
                  {room.provider.business_name} • {room.provider.city}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <Maximize className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 font-body">{room.size_sqm} m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-text-dark font-body">{room.hourly_rate}€/Std.</span>
                  </div>
                </div>

                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3">
                    {room.amenities.slice(0, 3).map((amenity, idx) => (
                      <Badge key={idx} className="bg-info-bg text-info-text border-none font-body text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {room.amenities.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-600 border-none font-body text-xs">
                        +{room.amenities.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent>
                <Button
                  onClick={() => handleSelectRoom(room)}
                  disabled={!isVerified}
                  className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerified ? 'Raum buchen' : 'Verifizierung erforderlich'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedRoom && step !== 'success'} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {step === 'select' && selectedRoom && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-text-dark">
                  {selectedRoom.name} buchen
                </DialogTitle>
                <DialogDescription className="font-body">
                  {selectedRoom.provider.business_name} • {selectedRoom.provider.city}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div>
                  <Label className="font-body mb-3 block">Datum wählen</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={de}
                    className="rounded-md border"
                  />
                </div>

                {selectedDate && (
                  <>
                    <div>
                      <Label className="font-body mb-3 block">Uhrzeit wählen</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map((time) => (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                            className={`font-body ${
                              selectedTime === time ? 'bg-primary-blue text-white' : ''
                            }`}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="duration" className="font-body">Dauer (Stunden)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                        min="1"
                        max="8"
                        className="font-body"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <Alert className="border-error-text bg-error-bg">
                    <AlertCircle className="h-4 w-4 text-error-text" />
                    <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Stundensatz</span>
                    <span className="font-body font-semibold">{selectedRoom.hourly_rate}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Dauer</span>
                    <span className="font-body font-semibold">{duration}h</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-heading text-lg font-bold text-text-dark">Gesamt</span>
                    <span className="font-heading text-2xl font-bold text-text-dark">
                      {selectedRoom.hourly_rate * duration}€
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedRoom(null)} className="font-body">
                  Abbrechen
                </Button>
                <Button
                  onClick={handleProceedToPayment}
                  disabled={!selectedDate || !selectedTime}
                  className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
                >
                  Weiter zur Zahlung
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'payment' && selectedRoom && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl text-text-dark">Zahlung</DialogTitle>
                <DialogDescription className="font-body">
                  Bezahle sicher mit unserer Mock-Zahlungsabwicklung
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <Alert className="border-info-text bg-info-bg">
                  <CreditCard className="h-4 w-4 text-info-text" />
                  <AlertDescription className="text-info-text font-body">
                    Dies ist eine Demonstrationszahlung. In der Produktionsumgebung wird Stripe Connect integriert.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Raum</span>
                    <span className="font-body font-semibold">{selectedRoom.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Datum</span>
                    <span className="font-body font-semibold">
                      {selectedDate && format(selectedDate, 'dd. MMMM yyyy', { locale: de })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Zeit</span>
                    <span className="font-body font-semibold">{selectedTime} Uhr ({duration}h)</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-heading text-lg font-bold text-text-dark">Gesamt</span>
                    <span className="font-heading text-2xl font-bold text-text-dark">
                      {selectedRoom.hourly_rate * duration}€
                    </span>
                  </div>
                </div>

                {error && (
                  <Alert className="border-error-text bg-error-bg">
                    <AlertCircle className="h-4 w-4 text-error-text" />
                    <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('select')} className="font-body">
                  Zurück
                </Button>
                <Button
                  onClick={handleBookRoom}
                  disabled={submitting}
                  className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
                >
                  {submitting ? 'Wird verarbeitet...' : `${selectedRoom.hourly_rate * duration}€ bezahlen`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {step === 'success' && selectedRoom && (
        <Dialog open={true} onOpenChange={() => { setStep('select'); setSelectedRoom(null); }}>
          <DialogContent>
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-success-bg flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success-text" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-text-dark mb-4">
                Buchung erfolgreich!
              </h2>
              <p className="text-gray-600 font-body mb-8">
                Deine Raumbuchung wurde erfolgreich an den Anbieter gesendet. Du erhältst eine Bestätigung, sobald die Buchung genehmigt wurde.
              </p>
              <Button
                onClick={() => { setStep('select'); setSelectedRoom(null); }}
                className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
              >
                Weitere Räume finden
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
