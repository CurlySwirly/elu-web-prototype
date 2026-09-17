'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { fetchExpertById, fetchExpertOffers, type ExpertOffer } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Video, CheckCircle2, ArrowLeft, AlertCircle, CalendarPlus, MessageCircle } from 'lucide-react';
import { format, setHours, setMinutes, isBefore, startOfToday, addMinutes, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  buildGoogleCalendarUrl,
  downloadIcsFile,
  type CalendarEventInput,
} from '@/lib/utils/calendar-export';
import { chatService } from '@/lib/services/chat';
import {
  getAvailableTimeSlotsForDate,
  hasAvailabilityOnDate,
  type ExpertAbsence,
  type ExpertAvailabilitySlot,
  type BusyInterval,
} from '@/lib/services/availability';
import {
  formatLocationParts,
  formatOfferLocation,
  isOnlineOfferFormat,
} from '@/lib/utils/offer-location';
import { formatEuro, getClientPriceBreakdown } from '@/lib/utils/pricing';
import { ClientPriceBreakdownView } from '@/components/ClientPriceBreakdown';

interface ExpertProfile {
  full_name: string;
  avatar_url: string;
  professions?: string[];
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
}

export default function BookingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { userId, user, signUp } = useAuth();
  const isGuest = !user;

  const expertId = params.expertId as string;
  const offerId = searchParams.get('offerId');

  const [expert, setExpert] = useState<ExpertProfile | null>(null);
  const [offer, setOffer] = useState<ExpertOffer | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [createdAccount, setCreatedAccount] = useState(false);
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [availability, setAvailability] = useState<ExpertAvailabilitySlot[]>([]);
  const [absences, setAbsences] = useState<ExpertAbsence[]>([]);
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const availableTimes = useMemo(() => {
    if (!selectedDate || !offer) return [];
    return getAvailableTimeSlotsForDate({
      date: selectedDate,
      availability,
      absences,
      durationMinutes: offer.duration_minutes || 60,
      busyIntervals,
    });
  }, [selectedDate, offer, availability, absences, busyIntervals]);

  const loadBookingData = useCallback(async () => {
    try {
      const backendMode = getBackendMode();

      const [expertData, offersData] = await Promise.all([
        fetchExpertById(expertId),
        fetchExpertOffers(expertId),
      ]);

      if (expertData) {
        const professions =
          expertData.professions?.filter(Boolean) ||
          expertData.specializations?.slice(0, 1) ||
          [];
        setExpert({
          full_name: expertData.full_name,
          avatar_url: expertData.avatar_url || '',
          professions,
          address: expertData.address,
          postal_code: expertData.postal_code,
          city: expertData.city,
          country: expertData.country,
        });
      }

      if (offerId) {
        if (backendMode === 'mock') {
          setOffer(offersData.find((o) => o.id === offerId) || null);
        } else {
          const fromList = offersData.find((o) => o.id === offerId);
          if (fromList) {
            setOffer(fromList);
          } else {
            const { data: offerData } = await supabase
              .from('expert_offers')
              .select('*')
              .eq('id', offerId)
              .maybeSingle();
            if (offerData) setOffer(offerData);
          }
        }
      }

      if (backendMode === 'mock') {
        const { mockExpertAvailabilityByExpertId } = await import('@/lib/backend/mock/data');
        const slots =
          mockExpertAvailabilityByExpertId[expertId] ||
          mockExpertAvailabilityByExpertId['1'] ||
          [];
        setAvailability(slots);
        setAbsences([]);
        setBusyIntervals([]);
      } else {
        const profileId = expertData?.id || expertId;
        const [{ data: availabilityRows }, { data: absenceRows }, { data: busyRows }] =
          await Promise.all([
            supabase
              .from('expert_availability')
              .select('id, day_of_week, start_time, end_time, is_available')
              .eq('expert_profile_id', profileId)
              .eq('is_available', true),
            supabase
              .from('expert_absences')
              .select('id, start_date, end_date, reason')
              .eq('expert_profile_id', profileId),
            supabase
              .from('appointments')
              .select('id, start_time, end_time')
              .eq('expert_id', profileId)
              .in('status', ['confirmed', 'requested', 'pending'])
              .gte('start_time', new Date().toISOString()),
          ]);

        setAvailability((availabilityRows as ExpertAvailabilitySlot[]) || []);
        setAbsences((absenceRows as ExpertAbsence[]) || []);
        setBusyIntervals(
          (busyRows || []).map((apt: { id: string; start_time: string; end_time: string }) => ({
            id: apt.id,
            start: parseISO(apt.start_time),
            end: parseISO(apt.end_time),
          }))
        );
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

  const handleSubmitBooking = async () => {
    setError('');

    if (!acceptedTerms) {
      setError('Bitte akzeptiere die AGB, um fortzufahren');
      return;
    }

    if (isGuest) {
      if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
        setError('Bitte gib Name, E-Mail und Telefonnummer an');
        return;
      }
      if (createAccount && guestPassword.length < 6) {
        setError('Das Passwort muss mindestens 6 Zeichen haben');
        return;
      }
    }

    setSubmitting(true);

    try {
      const backendMode = getBackendMode();

      if (isGuest && createAccount) {
        await signUp(guestEmail.trim(), guestPassword, guestName.trim(), 'client');
        setCreatedAccount(true);
      }

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setBookedAppointmentId(`apt-booked-${expertId}-${Date.now()}`);
        setStep('success');
        return;
      }

      let clientId = userId;

      if (isGuest && createAccount) {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        clientId = newUser?.id ?? null;
      }

      if (!clientId && !isGuest) {
        throw new Error('Nicht angemeldet');
      }

      if (clientId) {
        const [hours, minutes] = selectedTime.split(':');
        const startTime = setMinutes(setHours(selectedDate!, parseInt(hours)), parseInt(minutes));
        const endTime = new Date(startTime.getTime() + offer!.duration_minutes * 60000);

        const { data: inserted, error: insertError } = await supabase
          .from('appointments')
          .insert({
            client_id: clientId,
            expert_id: expertId,
            offer_id: offerId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'confirmed',
            notes: notes,
            total_price: offer!.price,
          })
          .select('id')
          .maybeSingle();

        if (insertError) throw insertError;
        if (inserted?.id) setBookedAppointmentId(inserted.id);
      }

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Buchung');
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

  const getBookedEvent = (): CalendarEventInput | null => {
    if (!selectedDate || !selectedTime || !offer || !expert) return null;
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const start = setMinutes(setHours(selectedDate, hours), minutes);
    const end = addMinutes(start, offer.duration_minutes);
    const isOnline = isOnlineOfferFormat(offer.format);
    const addressLine =
      formatOfferLocation(offer) ||
      formatLocationParts({
        address: expert.address,
        postal_code: expert.postal_code,
        city: expert.city,
      });
    return {
      title: `${offer.title} mit ${expert.full_name}`,
      description: [
        `Buchung über elu`,
        `Expert:in: ${expert.full_name}`,
        `Angebot: ${offer.title}`,
        `Format: ${isOnline ? 'Online' : 'Vor Ort'}`,
        !isOnline && addressLine ? `Adresse: ${addressLine}` : '',
        notes ? `Notizen: ${notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      location: isOnline ? 'Online' : addressLine || undefined,
      start,
      end,
      uid: `elu-${expertId}-${offerId}-${start.toISOString()}`,
    };
  };

  const handleDownloadCalendar = () => {
    const event = getBookedEvent();
    if (!event) return;
    const safeName = offer!.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\- ]/g, '').trim().replace(/\s+/g, '-');
    downloadIcsFile(event, `elu-${safeName || 'termin'}.ics`);
  };

  const handleOpenGoogleCalendar = () => {
    const event = getBookedEvent();
    if (!event) return;
    window.open(buildGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
  };

  const handleSendMessage = async () => {
    if (!user && !createdAccount) {
      router.push('/login');
      return;
    }

    const clientId = userId;
    if (!clientId || !expert) {
      router.push('/login');
      return;
    }

    setChatLoading(true);
    try {
      const backendMode = getBackendMode();
      const appointmentId = bookedAppointmentId || `apt-booked-${expertId}`;

      if (backendMode === 'mock') {
        const { mockChatThreads, mockChatMessagesByThread } = await import(
          '@/lib/backend/mock/data'
        );
        let thread = mockChatThreads.find(
          (t) => t.appointment_id === appointmentId || t.expert_id === expertId
        );
        if (!thread) {
          thread = {
            id: `thread-${appointmentId}`,
            appointment_id: appointmentId,
            client_id: clientId,
            expert_id: expertId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            client: {
              full_name: 'Max Mustermann',
              avatar_url:
                'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
            },
            expert: {
              full_name: expert.full_name,
              avatar_url: expert.avatar_url,
            },
            offer_title: offer?.title || '',
            last_message: '',
            unread_count_client: 0,
            unread_count_expert: 0,
          };
          mockChatThreads.unshift(thread);
          mockChatMessagesByThread[thread.id] = [];
        }
        router.push(`/app/nachrichten?thread=${thread.id}`);
        return;
      }

      const thread = await chatService.getOrCreateThread(appointmentId, clientId, expertId);
      router.push(`/app/nachrichten?thread=${thread.id}`);
    } catch (err) {
      console.error(err);
      router.push('/app/nachrichten');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue" />
      </div>
    );
  }

  if (!offer || !expert) {
    return (
      <div className="p-3 sm:p-4 lg:p-5">
        <Card className="max-w-2xl mx-auto border-2">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-body text-sm">Angebot nicht gefunden</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="p-3 sm:p-4 lg:p-5 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-2xl w-full border-2">
          <CardContent className="py-10 px-4 sm:px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-green/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary-green" />
            </div>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-text-dark mb-3">
              Termin gebucht!
            </h2>
            <p className="text-sm text-gray-600 font-body mb-6">
              {createdAccount
                ? `Dein Termin bei ${expert.full_name} ist gebucht und dein Konto wurde angelegt. Du findest alle Details unter „Meine Termine“.`
                : user
                  ? `Dein Termin bei ${expert.full_name} ist gebucht. Du findest alle Details unter „Meine Termine“.`
                  : `Dein Termin bei ${expert.full_name} ist gebucht. Wir haben die Details an ${guestEmail} gesendet.`}
            </p>

            {selectedDate && selectedTime && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-3 mb-6 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CalendarPlus className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm text-gray-600 font-body">
                      Zum Kalender hinzufügen
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadCalendar}
                      className="h-8 px-2.5 text-xs font-body text-primary-blue hover:text-primary-blue hover:bg-primary-blue/10"
                    >
                      .ics
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenGoogleCalendar}
                      className="h-8 px-2.5 text-xs font-body text-primary-blue hover:text-primary-blue hover:bg-primary-blue/10"
                    >
                      Google
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              {(user || createdAccount) && (
                <Button
                  onClick={() => router.push('/app/termine')}
                  className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 hover:from-primary-blue hover:to-primary-green transition-opacity font-body"
                >
                  Zu meinen Terminen
                </Button>
              )}
              <Button
                variant={user || createdAccount ? 'outline' : 'default'}
                onClick={handleSendMessage}
                disabled={chatLoading}
                className={
                  user || createdAccount
                    ? 'font-body'
                    : 'bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 hover:from-primary-blue hover:to-primary-green transition-opacity font-body'
                }
              >
                <MessageCircle className="w-4 h-4 mr-1.5" />
                {chatLoading ? 'Öffnet…' : 'Nachricht senden'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button
            variant="ghost"
            onClick={() => setStep('select')}
            className="font-body -ml-2 h-9 px-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Zurück
          </Button>

          <Card className="border-2">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
              <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">
                Buchungsübersicht
              </CardTitle>
              <CardDescription className="font-body text-sm">
                Bitte überprüfe deine Angaben bevor du verbindlich buchst
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
                    <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-sm">
                      {expert.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-heading font-semibold text-text-dark text-sm sm:text-base">{expert.full_name}</p>
                    <p className="text-xs text-gray-500 font-body">
                      {expert.professions?.length
                        ? expert.professions.join(' · ')
                        : 'Expert:in'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-body text-gray-500">Termin</span>
                    <span className="font-body font-semibold text-text-dark text-right">
                      {selectedDate && format(selectedDate, 'dd. MMMM yyyy', { locale: de })} um {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-body text-gray-500">Angebot</span>
                    <span className="font-body font-semibold text-text-dark text-right">{offer.title}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-body text-gray-500">Dauer</span>
                    <span className="font-body font-semibold text-text-dark">{offer.duration_minutes} Min.</span>
                  </div>
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="font-body text-gray-500">Format</span>
                    <Badge className="bg-info-bg text-info-text border-none font-body text-[11px] flex items-center gap-1">
                      {isOnlineOfferFormat(offer.format) ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {isOnlineOfferFormat(offer.format) ? 'Online' : 'Vor Ort'}
                    </Badge>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-body text-gray-500 shrink-0">Adresse</span>
                    <span className="font-body font-semibold text-text-dark text-right">
                      {isOnlineOfferFormat(offer.format)
                        ? 'Online'
                        : formatOfferLocation(offer) ||
                          formatLocationParts({
                            address: expert.address,
                            postal_code: expert.postal_code,
                            city: expert.city,
                          }) ||
                          'Adresse folgt'}
                    </span>
                  </div>
                  {notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="font-body text-gray-500 text-sm block mb-1">Notizen</span>
                      <span className="font-body text-sm text-text-dark">{notes}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <p className="font-heading text-sm font-semibold text-text-dark">Preisübersicht</p>
                    <ClientPriceBreakdownView servicePrice={Number(offer.price) || 0} />
                  </div>
                </div>
              </div>

              {isGuest && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                  <div>
                    <h3 className="font-heading font-semibold text-text-dark text-base">
                      Deine Kontaktdaten
                    </h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">
                      Für Buchungsdetails und Rückfragen der Expert:in
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestName" className="font-body text-sm">Vollständiger Name</Label>
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Max Mustermann"
                      required
                      className="font-body text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestEmail" className="font-body text-sm">E-Mail</Label>
                    <Input
                      id="guestEmail"
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="deine@email.de"
                      required
                      className="font-body text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone" className="font-body text-sm">Telefon</Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+49 …"
                      required
                      className="font-body text-sm"
                    />
                  </div>

                  <div className="flex items-start gap-2.5 pt-1">
                    <Checkbox
                      id="createAccount"
                      checked={createAccount}
                      onCheckedChange={(checked) => setCreateAccount(checked === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="createAccount" className="font-body text-sm font-normal leading-snug cursor-pointer">
                      Profil anlegen und Buchungen später in meinem Konto verwalten
                    </Label>
                  </div>

                  {createAccount && (
                    <div className="space-y-2">
                      <Label htmlFor="guestPassword" className="font-body text-sm">Passwort</Label>
                      <Input
                        id="guestPassword"
                        type="password"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                        placeholder="Mindestens 6 Zeichen"
                        className="font-body text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="acceptedTerms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="acceptedTerms" className="font-body text-sm font-normal leading-snug cursor-pointer">
                  Ich akzeptiere die{' '}
                  <Link href="/agb" className="text-primary-blue hover:underline" target="_blank">
                    AGB
                  </Link>{' '}
                  und bestätige, dass die Buchung verbindlich ist. Stornierungen sind gemäß den
                  Stornierungsbedingungen möglich.
                </Label>
              </div>

              {error && (
                <Alert className="border-error-text bg-error-bg">
                  <AlertCircle className="h-4 w-4 text-error-text" />
                  <AlertDescription className="text-error-text font-body text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmitBooking}
                disabled={submitting || !acceptedTerms}
                className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 hover:from-primary-blue hover:to-primary-green transition-opacity font-body"
              >
                {submitting ? 'Wird gebucht...' : 'Jetzt buchen'}
              </Button>

              {isGuest && (
                <p className="text-center text-xs text-gray-500 font-body">
                  Schon ein Konto?{' '}
                  <Link href="/login" className="text-primary-blue hover:underline">
                    Anmelden
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="font-body -ml-2 h-9 px-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Zurück
        </Button>

        <Card className="border-2">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">
              Wähle Datum und Uhrzeit
            </CardTitle>
            <CardDescription className="font-body text-sm">
              {offer.title} · {formatEuro(getClientPriceBreakdown(Number(offer.price) || 0).clientTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-start">
              <div>
                <Label className="font-body text-sm mb-2.5 block">Datum</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime('');
                  }}
                  disabled={(date) =>
                    isBefore(date, startOfToday()) ||
                    !hasAvailabilityOnDate(date, availability, absences)
                  }
                  locale={de}
                  className="rounded-md border w-full"
                  classNames={{
                    day_today:
                      'border-2 border-primary-blue text-text-dark bg-transparent hover:bg-info-bg/40',
                    day_selected:
                      'bg-primary-blue text-white hover:bg-primary-blue hover:text-white focus:bg-primary-blue focus:text-white',
                  }}
                />
              </div>

              <div>
                <Label className="font-body text-sm mb-2.5 block">Verfügbare Zeiten</Label>
                {selectedDate ? (
                  availableTimes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(time)}
                          className={`font-body text-sm ${
                            selectedTime === time
                              ? 'bg-primary-blue text-white hover:bg-primary-blue hover:opacity-90'
                              : ''
                          }`}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 font-body pt-1">
                      An diesem Tag sind keine freien Zeiten verfügbar. Bitte wähle ein anderes
                      Datum.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-500 font-body pt-1">
                    Bitte zuerst ein Datum wählen.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="font-body text-sm font-semibold text-text-dark">
                Notizen (optional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Teile dem/der Expert:in zusätzliche Informationen mit..."
                rows={4}
                className="font-body text-sm"
              />
            </div>

            {error && (
              <Alert className="border-error-text bg-error-bg">
                <AlertCircle className="h-4 w-4 text-error-text" />
                <AlertDescription className="text-error-text font-body text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleContinueToConfirm}
              disabled={!selectedDate || !selectedTime}
              className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 hover:from-primary-blue hover:to-primary-green transition-opacity font-body disabled:opacity-40 disabled:pointer-events-none"
            >
              Weiter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
