'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, MapPin, Video, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isBefore, isAfter, startOfToday } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExpertOffer {
  id: string;
  title: string;
  description: string;
  category: string;
  format: string;
  duration_minutes: number;
  price: number;
}

interface ExpertProfile {
  full_name: string;
  avatar_url: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { userId } = useAuth();

  const expertId = params.expertId as string;
  const offerId = searchParams.get('offerId');

  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [offer, setOffer] = useState<ExpertOffer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');

  const timeSlots: TimeSlot[] = [
    { time: '08:00', available: true },
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: true },
    { time: '12:00', available: false },
    { time: '13:00', available: true },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: true },
    { time: '17:00', available: true },
    { time: '18:00', available: true },
    { time: '19:00', available: false },
  ];

  const loadBookingData = useCallback(async () => {
    try {
      const { data: expertData } = await supabase
        .from('expert_profiles')
        .select('profiles:user_id(full_name, avatar_url)')
        .eq('id', expertId)
        .maybeSingle();

      if (expertData) {
        const profile = Array.isArray(expertData.profiles) ? expertData.profiles[0] : expertData.profiles;
        setExpert({
          full_name: profile?.full_name || '',
          avatar_url: profile?.avatar_url || '',
        });
      }

      if (offerId) {
        const { data: offerData } = await supabase
          .from('expert_offers')
          .select('*')
          .eq('id', offerId)
          .maybeSingle();

        if (offerData) {
          setOffer(offerData);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [expertId, offerId]);

  useEffect(() => {
    loadBookingData();
  }, [loadBookingData]);

  const handleSubmitBookingRequest = async () => {
    setSubmitting(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        // In mock mode, just simulate success
        await new Promise(resolve => setTimeout(resolve, 500));
        setStep('success');
        return;
      }

      const [hours, minutes] = selectedTime.split(':');
      const startTime = setMinutes(setHours(selectedDate!, parseInt(hours)), parseInt(minutes));
      const endTime = new Date(startTime.getTime() + (offer!.duration_minutes * 60000));

      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!clientProfile) {
        throw new Error('Client profile not found');
      }

      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          client_id: clientProfile.id,
          expert_id: expertId,
          offer_id: offerId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'requested',
          notes: notes,
          total_price: offer!.price,
        });

      if (insertError) throw insertError;

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Buchungsanfrage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToConfirm = () => {
    if (!selectedDate || !selectedTime) {
      setError('Bitte wähle ein Datum und eine Uhrzeit');
      return;
    }
    setError('');
    setStep('confirm');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  if (!offer || !expert) {
    return (
      <div className="min-h-screen bg-bg-light p-8">
        <Card className="max-w-2xl mx-auto border-2">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-body">Angebot nicht gefunden</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full border-2">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary-green/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary-green" />
            </div>
            <h2 className="font-heading text-3xl font-bold text-text-dark mb-4">
              Buchungsanfrage gesendet!
            </h2>
            <p className="text-gray-600 font-body mb-8">
              Deine Buchungsanfrage wurde erfolgreich an {expert.full_name} gesendet. Du erhältst eine Benachrichtigung, sobald die Expert:in deine Anfrage bestätigt hat.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => router.push('/app/termine')}
                className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
              >
                Zu meinen Terminen
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/app/experten')}
                className="font-body"
              >
                Weitere Expert:innen finden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-bg-light p-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setStep('select')}
            className="mb-6 font-body"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-text-dark">Buchungsanfrage bestätigen</CardTitle>
              <CardDescription className="font-body">
                Bitte überprüfe deine Angaben bevor du die Anfrage absendest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
                    <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                      {expert.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-heading font-semibold text-text-dark">{expert.full_name}</p>
                    <p className="text-sm text-gray-600 font-body">Expert:in</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Termin</span>
                    <span className="font-body font-semibold text-text-dark">
                      {selectedDate && format(selectedDate, 'dd. MMMM yyyy', { locale: de })} um {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Angebot</span>
                    <span className="font-body font-semibold text-text-dark">{offer.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Dauer</span>
                    <span className="font-body font-semibold text-text-dark">{offer.duration_minutes} Min.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-body text-gray-600">Format</span>
                    <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                      {offer.format === 'online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      {offer.format === 'online' ? 'Online' : 'Vor Ort'}
                    </Badge>
                  </div>
                  {notes && (
                    <div className="pt-2 border-t">
                      <span className="font-body text-gray-600 block mb-1">Notizen</span>
                      <span className="font-body text-text-dark">{notes}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-heading text-lg font-bold text-text-dark">Preis</span>
                    <span className="font-heading text-2xl font-bold text-text-dark">€{offer.price}</span>
                  </div>
                </div>
              </div>

              <Alert className="border-info-text bg-info-bg">
                <AlertCircle className="h-4 w-4 text-info-text" />
                <AlertDescription className="text-info-text font-body">
                  Die Zahlung erfolgt erst nach Bestätigung der Buchung durch die Expert:in.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert className="border-error-text bg-error-bg">
                  <AlertCircle className="h-4 w-4 text-error-text" />
                  <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmitBookingRequest}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body py-6 text-lg"
              >
                {submitting ? 'Wird gesendet...' : 'Buchungsanfrage absenden'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 font-body"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="font-heading text-2xl text-text-dark">
                  Wähle Datum und Uhrzeit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="font-body mb-3 block">Datum</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => isBefore(date, startOfToday())}
                    locale={de}
                    className="rounded-md border"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <Label className="font-body mb-3 block">Verfügbare Zeiten</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? 'default' : 'outline'}
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`font-body ${
                            selectedTime === slot.time
                              ? 'bg-primary-blue text-white'
                              : ''
                          }`}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes" className="font-body">
                    Notizen (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Teile dem/der Expert:in zusätzliche Informationen mit..."
                    rows={4}
                    className="font-body"
                  />
                </div>

                {error && (
                  <Alert className="border-error-text bg-error-bg">
                    <AlertCircle className="h-4 w-4 text-error-text" />
                    <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border-2 sticky top-8">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-text-dark">Buchungsübersicht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
                    <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                      {expert.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-heading font-semibold text-text-dark">{expert.full_name}</p>
                    <p className="text-sm text-gray-600 font-body">Expert:in</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h3 className="font-heading font-bold text-text-dark">{offer.title}</h3>
                  <p className="text-sm text-gray-600 font-body">{offer.description}</p>

                  <div className="flex flex-wrap gap-2">
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
                </div>

                {selectedDate && selectedTime && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="font-body text-gray-600">Datum</span>
                      <span className="font-body font-semibold text-text-dark">
                        {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-gray-600">Uhrzeit</span>
                      <span className="font-body font-semibold text-text-dark">{selectedTime}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-4">
                    <span className="font-heading text-lg font-bold text-text-dark">Preis</span>
                    <span className="font-heading text-2xl font-bold text-text-dark">€{offer.price}</span>
                  </div>

                  <Button
                    onClick={handleContinueToConfirm}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body py-6 text-lg"
                  >
                    Weiter zur Bestätigung
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
