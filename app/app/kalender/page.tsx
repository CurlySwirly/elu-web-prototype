'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Clock, AlertCircle, User, Info, ChevronDown } from 'lucide-react';
import { format, startOfDay, parseISO, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';
import { useAppointmentManageFlow } from '@/components/AppointmentManageDialogs';
import {
  ExpertAppleCalendar,
  type ExpertCalendarEvent,
} from '@/components/ExpertAppleCalendar';
import { WeeklyAvailabilityEditor } from '@/components/WeeklyAvailabilityEditor';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { CalendarEventInput } from '@/lib/utils/calendar-export';
import { createPersonalEvent } from '@/lib/services/personalCalendar';

interface Appointment {
  id: string;
  client_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string;
  is_new_booking?: boolean;
  client?: {
    id?: string;
    full_name: string;
    avatar_url: string;
    phone?: string;
  };
  offer: {
    title: string;
    format: string;
  };
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface BlockedDay {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export default function ExpertCalendarPage() {
  const { userId } = useAuth();
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(true);
  const [importedEvents, setImportedEvents] = useState<ExpertCalendarEvent[]>([]);

  useEffect(() => {
    try {
      setSyncEnabled(localStorage.getItem('elu-expert-calendar-sync') === '1');
      const raw = localStorage.getItem('elu-expert-imported-events');
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          id: string;
          title: string;
          start: string;
          end: string;
          allDay?: boolean;
        }>;
        setImportedEvents(
          parsed.map((e) => ({
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            allDay: e.allDay,
            color: 'purple' as const,
            synced: true,
            source: 'external' as const,
          }))
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistImported = (next: ExpertCalendarEvent[]) => {
    setImportedEvents(next);
    try {
      localStorage.setItem(
        'elu-expert-imported-events',
        JSON.stringify(
          next.map((e) => ({
            id: e.id,
            title: e.title,
            start: e.start.toISOString(),
            end: e.end.toISOString(),
            allDay: e.allDay,
          }))
        )
      );
    } catch {
      /* ignore */
    }
  };

  const handleSyncEnabledChange = (enabled: boolean) => {
    setSyncEnabled(enabled);
    try {
      localStorage.setItem('elu-expert-calendar-sync', enabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const {
    openCancel,
    actionMessage,
    actionError,
    dialogs: appointmentManageDialogs,
  } = useAppointmentManageFlow({
    appointments,
    actor: 'expert',
    onCancelled: async (appointmentId) => {
      setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
    },
    successAction: { label: 'Schließen' },
  });

  const getClientKey = (apt: Appointment) =>
    apt.client_id || apt.client?.id || apt.client?.full_name || apt.id;

  /** First appointment with this client = Neukunde / Erstbuchung */
  const isNewClientAppointment = (apt: Appointment) => {
    if (typeof apt.is_new_booking === 'boolean') return apt.is_new_booking;

    const key = getClientKey(apt);
    const aptStart = parseISO(apt.start_time).getTime();
    return !appointments.some(
      (other) =>
        other.id !== apt.id &&
        !other.status.startsWith('cancelled') &&
        getClientKey(other) === key &&
        parseISO(other.start_time).getTime() < aptStart
    );
  };

  const calendarEvents: ExpertCalendarEvent[] = [
    ...appointments
      .filter((apt) => !apt.status.startsWith('cancelled'))
      .map((apt) => {
        const isNewClient = isNewClientAppointment(apt);
        return {
          id: apt.id,
          title: apt.offer.title || 'Termin',
          start: parseISO(apt.start_time),
          end: parseISO(apt.end_time),
          color: (isNewClient ? 'green' : 'blue') as 'green' | 'blue',
          source: 'elu' as const,
          synced: syncEnabled,
          meta:
            (apt.offer.format || '').toLowerCase().includes('online') ? 'Online' : 'Vor Ort',
          hoverLines: [
            apt.client?.full_name ? `Klient:in: ${apt.client.full_name}` : '',
            isNewClient ? 'Neukunde · Erstbuchung' : 'Bestandskunde',
            apt.status === 'completed' ? 'Abgeschlossen' : 'Gebucht',
            apt.total_price != null ? `€${apt.total_price}` : '',
          ].filter(Boolean),
        };
      }),
    ...blockedDays.map((block) => ({
      id: `blocked-${block.id}`,
      title: block.reason || 'Gesperrt',
      start: startOfDay(parseISO(block.start_date)),
      end: startOfDay(addDays(parseISO(block.end_date), 1)),
      allDay: true,
      color: 'amber' as const,
      source: 'elu' as const,
      hoverLines: ['Gesperrter Zeitraum'],
    })),
    ...(syncEnabled ? importedEvents : []),
  ].filter(
    (event, index, list) => list.findIndex((other) => other.id === event.id) === index
  );

  const loadExpertData = useCallback(async () => {
    try {
      const backendMode = getBackendMode();
      
      if (backendMode === 'mock') {
        setExpertProfileId(`mock-expert-${userId}`);
        await Promise.all([
          loadAppointments(`mock-expert-${userId}`),
          loadAvailability(`mock-expert-${userId}`),
          loadBlockedDays(`mock-expert-${userId}`)
        ]);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setExpertProfileId(profile.id);
        await Promise.all([
          loadAppointments(profile.id),
          loadAvailability(profile.id),
          loadBlockedDays(profile.id)
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadExpertData();
    }
  }, [userId, loadExpertData]);

  const loadAppointments = async (profileId: string) => {
    try {
      const backendMode = getBackendMode();
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 300));
        const { mockExpertAppointments } = await import('@/lib/backend/mock/data');
        setAppointments(mockExpertAppointments.map((apt: any) => ({
          id: apt.id,
          client_id: apt.client?.id || apt.client_id || apt.client?.email || apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          total_price: apt.total_price,
          notes: apt.notes,
          is_new_booking: apt.is_new_booking,
          client: apt.client
            ? {
                id: apt.client.id || apt.client.email || apt.client.full_name,
                full_name: apt.client.full_name,
                avatar_url: apt.client.avatar_url,
                phone: apt.client.phone,
              }
            : undefined,
          offer: apt.offer,
        })));
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          start_time,
          end_time,
          status,
          total_price,
          notes,
          profiles:client_id (
            id,
            full_name,
            avatar_url,
            phone
          ),
          expert_offers:offer_id (
            title,
            format
          )
        `)
        .eq('expert_id', profileId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAppointments(
        (data || []).map((apt: any) => {
          const profile = Array.isArray(apt.profiles) ? apt.profiles[0] : apt.profiles;
          const offer = Array.isArray(apt.expert_offers)
            ? apt.expert_offers[0]
            : apt.expert_offers;
          return {
            id: apt.id,
            client_id: apt.client_id || profile?.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: apt.total_price,
            notes: apt.notes,
            client: {
              id: profile?.id || apt.client_id,
              full_name: profile?.full_name || '',
              avatar_url: profile?.avatar_url || '',
              phone: profile?.phone || '',
            },
            offer: {
              title: offer?.title || '',
              format: offer?.format || '',
            },
          };
        })
      );
    } catch (err: any) {
      console.error('Error loading appointments:', err);
    }
  };

  const loadAvailability = useCallback(async (profileId: string) => {
    try {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        setAvailability([
          { id: '1', day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
          { id: '2', day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
          { id: '3', day_of_week: 5, start_time: '10:00', end_time: '16:00', is_available: true },
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('expert_availability')
        .select('*')
        .eq('expert_profile_id', profileId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setAvailability(data || []);
    } catch (err: any) {
      console.error('Error loading availability:', err);
    }
  }, []);

  const loadBlockedDays = useCallback(async (profileId: string) => {
    try {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        setBlockedDays([]);
        return;
      }

      const { data, error } = await supabase
        .from('expert_absences')
        .select('*')
        .eq('expert_profile_id', profileId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setBlockedDays(data || []);
    } catch (err: any) {
      console.error('Error loading blocked days:', err);
    }
  }, []);

  const isDateBlocked = useCallback(
    (date: Date) => {
      const day = startOfDay(date);
      return blockedDays.some((blocked) => {
        const start = startOfDay(parseISO(blocked.start_date));
        const end = startOfDay(parseISO(blocked.end_date));
        return day >= start && day <= end;
      });
    },
    [blockedDays]
  );

  const handleBlockDay = useCallback(
    async (date: Date) => {
      if (!expertProfileId) return;
      if (isDateBlocked(date)) return;

      const dateKey = format(date, 'yyyy-MM-dd');
      setError('');
      setSuccess('');

      try {
        const backendMode = getBackendMode();

        if (backendMode === 'mock') {
          setBlockedDays((prev) => [
            ...prev,
            {
              id: String(Date.now()),
              start_date: dateKey,
              end_date: dateKey,
              reason: 'Gesperrt',
            },
          ]);
          setSuccess('Tag gesperrt');
          setTimeout(() => setSuccess(''), 3000);
          return;
        }

        const { error } = await supabase.from('expert_absences').insert({
          expert_profile_id: expertProfileId,
          start_date: dateKey,
          end_date: dateKey,
          reason: 'Gesperrt',
        });

        if (error) throw error;

        setSuccess('Tag gesperrt');
        await loadBlockedDays(expertProfileId);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [expertProfileId, isDateBlocked, loadBlockedDays]
  );

  const handleUnblockDay = useCallback(
    async (date: Date) => {
      const day = startOfDay(date);
      const covering = blockedDays.filter((blocked) => {
        const start = startOfDay(parseISO(blocked.start_date));
        const end = startOfDay(parseISO(blocked.end_date));
        return day >= start && day <= end;
      });
      if (covering.length === 0) return;

      setError('');
      setSuccess('');

      try {
        const backendMode = getBackendMode();

        if (backendMode === 'mock') {
          const ids = new Set(covering.map((b) => b.id));
          setBlockedDays((prev) => prev.filter((item) => !ids.has(item.id)));
          setSuccess('Tag entsperrt');
          setTimeout(() => setSuccess(''), 3000);
          return;
        }

        const { error } = await supabase
          .from('expert_absences')
          .delete()
          .in(
            'id',
            covering.map((b) => b.id)
          );

        if (error) throw error;

        await loadBlockedDays(expertProfileId!);
        setSuccess('Tag entsperrt');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [blockedDays, expertProfileId, loadBlockedDays]
  );

  const handleAddAvailability = useCallback(
    async (slot: { day_of_week: number; start_time: string; end_time: string }) => {
      if (!expertProfileId) return;

      setError('');
      setSuccess('');

      try {
        const backendMode = getBackendMode();

        if (backendMode === 'mock') {
          const newId = String(Date.now());
          setAvailability((prev) => [
            ...prev,
            {
              id: newId,
              day_of_week: slot.day_of_week,
              start_time: slot.start_time,
              end_time: slot.end_time,
              is_available: true,
            },
          ]);
          setSuccess('Verfügbarkeit hinzugefügt');
          setTimeout(() => setSuccess(''), 3000);
          return;
        }

        const { error } = await supabase.from('expert_availability').insert({
          expert_profile_id: expertProfileId,
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: true,
        });

        if (error) throw error;

        setSuccess('Verfügbarkeit hinzugefügt');
        await loadAvailability(expertProfileId);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [expertProfileId, loadAvailability]
  );

  const handleDeleteAvailability = useCallback(
    async (availabilityId: string) => {
      try {
        const backendMode = getBackendMode();

        if (backendMode === 'mock') {
          setAvailability((prev) => prev.filter((avail) => avail.id !== availabilityId));
          setSuccess('Verfügbarkeit gelöscht');
          setTimeout(() => setSuccess(''), 3000);
          return;
        }

        const { error } = await supabase
          .from('expert_availability')
          .delete()
          .eq('id', availabilityId);

        if (error) throw error;

        if (expertProfileId) {
          await loadAvailability(expertProfileId);
        }
        setSuccess('Verfügbarkeit gelöscht');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [expertProfileId, loadAvailability]
  );

  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (apt) =>
      !apt.status.startsWith('cancelled') && parseISO(apt.end_time) >= now
  );
  const pastAppointments = appointments.filter(
    (apt) =>
      apt.status.startsWith('cancelled') || parseISO(apt.end_time) < now
  );

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
        title="Kalender"
        description="Lege deine Verfügbarkeit fest und verwalte alle Buchungen"
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

      {/* Apple-inspired calendar */}
      <ExpertAppleCalendar
        events={calendarEvents}
        syncEnabled={syncEnabled}
        onSyncEnabledChange={handleSyncEnabledChange}
        onSelectEvent={(eventId) => {
          const event = calendarEvents.find((e) => e.id === eventId);
          if (!event || event.source === 'external' || event.allDay) return;
          setSelectedAppointmentId(eventId);
          setIsDetailModalOpen(true);
        }}
        isDayBlocked={isDateBlocked}
        onBlockDay={handleBlockDay}
        onUnblockDay={handleUnblockDay}
        onImportEvents={(events: CalendarEventInput[]) => {
          const mapped: ExpertCalendarEvent[] = events.map((e, index) => ({
            id: e.uid || `import-${Date.now()}-${index}`,
            title: e.title,
            start: e.start,
            end: e.end,
            allDay: e.allDay,
            color: 'purple',
            synced: true,
            source: 'external',
            meta: e.description,
          }));
          persistImported([...importedEvents, ...mapped]);
          void Promise.all(
            events.map((e) =>
              createPersonalEvent({
                title: e.title,
                notes: e.description || 'Importiert aus externem Kalender',
                start_time: e.start.toISOString(),
                end_time: e.end.toISOString(),
              })
            )
          );
          setSuccess(`${events.length} Termin(e) aus deinem Kalender importiert.`);
        }}
      />

      {/* Buchungen */}
      <Tabs defaultValue="upcoming" className="w-full">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-4 sm:px-5 pt-4 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                  Buchungen
                </CardTitle>
                <CardDescription className="font-body text-xs sm:text-sm text-gray-600">
                  Verwalte deine gebuchten Termine
                </CardDescription>
              </div>
              <TabsList className="h-8 shrink-0 self-start bg-gray-100 p-0.5">
                <TabsTrigger
                  value="upcoming"
                  className="font-body text-xs h-7 px-2.5 data-[state=active]:bg-text-dark data-[state=active]:text-white"
                >
                  Kommende ({upcomingAppointments.length})
                </TabsTrigger>
                <TabsTrigger
                  value="past"
                  className="font-body text-xs h-7 px-2.5 data-[state=active]:bg-text-dark data-[state=active]:text-white"
                >
                  Vergangene ({pastAppointments.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-5 pb-4 pt-0">
            <div className="max-h-[21.5rem] overflow-y-auto pr-0.5">
              {(
                [
                  { value: 'upcoming', list: upcomingAppointments, badge: 'offen' as const },
                  { value: 'past', list: pastAppointments, badge: 'abgeschlossen' as const },
                ] as const
              ).map(({ value, list, badge }) => (
                <TabsContent
                  key={value}
                  value={value}
                  className="mt-0 space-y-2 focus-visible:outline-none"
                >
                  {list.length === 0 ? (
                    <div className="text-center py-10">
                      <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-body">
                        {value === 'upcoming'
                          ? 'Keine kommenden Buchungen'
                          : 'Keine vergangenen Buchungen'}
                      </p>
                    </div>
                  ) : (
                    list.map((appointment) => {
                      const initials =
                        (appointment.client?.full_name || '?')
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join('') || '?';

                      return (
                        <div
                          key={appointment.id}
                          className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg border border-gray-200 bg-white"
                        >
                          <Avatar className="h-9 w-9 shrink-0 border border-gray-100">
                            {appointment.client?.avatar_url ? (
                              <AvatarImage
                                src={appointment.client.avatar_url}
                                alt={appointment.client.full_name || 'Klient:in'}
                              />
                            ) : null}
                            <AvatarFallback className="bg-info-bg text-info-text text-[11px] font-heading">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-heading font-semibold text-sm text-text-dark truncate">
                                {appointment.offer.title}
                              </p>
                              <Badge
                                className={cn(
                                  'border-none text-[11px] font-body shrink-0 px-2 py-0.5',
                                  badge === 'offen'
                                    ? 'bg-info-bg text-info-text'
                                    : 'bg-gray-100 text-gray-600'
                                )}
                              >
                                {badge === 'offen' ? 'Offen' : 'Abgeschlossen'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 font-body">
                              {appointment.client?.full_name ? (
                                <span className="flex items-center gap-1 truncate">
                                  <User className="w-3 h-3 shrink-0" />
                                  {appointment.client.full_name}
                                </span>
                              ) : null}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                {format(parseISO(appointment.start_time), 'd. MMM · HH:mm', {
                                  locale: de,
                                })}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 font-body text-xs h-8 px-2.5"
                            onClick={() => {
                              setSelectedAppointmentId(appointment.id);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            Details
                          </Button>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              ))}
            </div>
          </CardContent>
        </Card>
      </Tabs>

      {/* Availability Management */}
      <Collapsible open={availabilityOpen} onOpenChange={setAvailabilityOpen}>
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-4 sm:px-5 pt-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                    Wöchentliche Verfügbarkeit
                  </CardTitle>
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:text-primary-blue hover:bg-primary-blue/10 transition-colors shrink-0"
                        aria-label="Hilfe zur Verfügbarkeit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      align="start"
                      className="w-72 sm:w-80 font-body text-sm space-y-2 p-4"
                    >
                      <p className="font-heading font-semibold text-text-dark text-sm">
                        Wozu dient die Verfügbarkeit?
                      </p>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Hier legst du fest, wann Klient:innen dich buchen können. Die Zeiten gelten
                        jede Woche erneut und steuern die buchbaren Termine in deinem Kalender.
                      </p>
                      <p className="font-heading font-semibold text-text-dark text-sm pt-1">
                        So stellst du sie ein
                      </p>
                      <ul className="text-gray-600 text-xs leading-relaxed list-disc pl-4 space-y-1">
                        <li>
                          Ziehe in einer Tages-Spalte einen Zeitraum auf (15‑Minuten‑Raster), um
                          Verfügbarkeit zu setzen.
                        </li>
                        <li>Rechtsklick auf einen Slot → Löschen.</li>
                        <li>Gesperrte Tage im Hauptkalender überschreiben die Verfügbarkeit.</li>
                      </ul>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <CardDescription className="font-body text-xs sm:text-sm text-gray-600">
                  Regelmäßige Arbeitszeiten per Drag & Drop in der Wochenansicht festlegen
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:text-text-dark hover:bg-gray-100 transition-colors shrink-0"
                  aria-label={
                    availabilityOpen
                      ? 'Verfügbarkeit einklappen'
                      : 'Verfügbarkeit aufklappen'
                  }
                >
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 transition-transform duration-200',
                      availabilityOpen && 'rotate-180'
                    )}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="px-4 sm:px-5 pb-4">
              <WeeklyAvailabilityEditor
                slots={availability}
                onCreate={handleAddAvailability}
                onDelete={handleDeleteAvailability}
                disabled={!expertProfileId}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {selectedAppointmentId && (
        <AppointmentDetailModal
          appointmentId={selectedAppointmentId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedAppointmentId(null);
            if (expertProfileId) {
              loadAppointments(expertProfileId);
            }
          }}
          userRole="expert"
          onCancel={(id) => {
            setIsDetailModalOpen(false);
            setSelectedAppointmentId(null);
            // Open cancel after detail dialog unmounts to avoid stacked Dialog focus traps
            queueMicrotask(() => openCancel(id));
          }}
        />
      )}

      {actionMessage && (
        <Alert className="fixed bottom-4 right-4 z-50 w-[min(100%-2rem,24rem)] border-primary-green bg-primary-green/20 shadow-lg">
          <AlertDescription className="text-text-dark font-body">{actionMessage}</AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert className="fixed bottom-4 right-4 z-50 w-[min(100%-2rem,24rem)] border-red-200 bg-red-50 shadow-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 font-body">{actionError}</AlertDescription>
        </Alert>
      )}

      {appointmentManageDialogs}
    </AppPageShell>
  );
}
