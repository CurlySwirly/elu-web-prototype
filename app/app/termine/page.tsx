'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Video,
  AlertCircle,
  Eye,
  MessageCircle,
} from 'lucide-react';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { chatService } from '@/lib/services/chat';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';
import {
  useAppointmentManageFlow,
  type ManageableAppointment,
} from '@/components/AppointmentManageDialogs';
import { cn } from '@/lib/utils';

interface Appointment extends ManageableAppointment {
  notes?: string;
  client?: {
    id?: string;
    full_name: string;
    avatar_url: string;
    phone?: string;
  };
  expert?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

export default function AppointmentsPage() {
  const { userId, role } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [hoveredDayPreview, setHoveredDayPreview] = useState<{
    date: Date;
    top: number;
    left: number;
  } | null>(null);
  const dayPreviewHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAppointments = useCallback(async () => {
    try {
      const backendMode = getBackendMode();

      if (role === 'expert') {
        if (backendMode === 'mock') {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const { mockExpertAppointments } = await import('@/lib/backend/mock/data');
          setAppointments(
            mockExpertAppointments.map((apt) => ({
              id: apt.id,
              expert_id: apt.expert_id || 'mock-expert-1',
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              notes: apt.notes,
              client: {
                id: apt.client?.id || apt.client_id || `client-${apt.id}`,
                full_name: apt.client?.full_name || '',
                avatar_url: apt.client?.avatar_url || '',
                phone: apt.client?.phone || '',
              },
              offer: {
                title: apt.offer?.title || '',
                format: apt.offer?.format || '',
                duration_minutes: apt.offer?.duration_minutes,
              },
            }))
          );
          setLoading(false);
          return;
        }

        const { data: expertProfile } = await supabase
          .from('expert_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (expertProfile) {
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
                format,
                duration_minutes
              )
            `)
            .eq('expert_id', expertProfile.id)
            .order('start_time', { ascending: true });

          if (error) throw error;

          setAppointments(data.map((apt: any) => ({
            id: apt.id,
            expert_id: apt.expert_id || expertProfile?.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: apt.total_price,
            notes: apt.notes,
            client: {
              id: apt.profiles?.id || apt.client_id,
              full_name: apt.profiles?.full_name || '',
              avatar_url: apt.profiles?.avatar_url || '',
              phone: apt.profiles?.phone || '',
            },
            offer: {
              title: apt.expert_offers?.title || '',
              format: apt.expert_offers?.format || '',
              duration_minutes: apt.expert_offers?.duration_minutes,
            },
          })));
        }
      } else {
        if (backendMode === 'mock') {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const { mockClientAppointments } = await import('@/lib/backend/mock/data');
          setAppointments(
            mockClientAppointments.map((apt) => ({
              id: apt.id,
              expert_id: apt.expert_id || apt.expert?.id,
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              notes: apt.notes,
              expert: {
                id: apt.expert?.id || apt.expert_id || '',
                full_name: apt.expert?.full_name || '',
                avatar_url: apt.expert?.avatar_url || '',
              },
              offer: {
                title: apt.offer?.title || '',
                format: apt.offer?.format || '',
                duration_minutes: apt.offer?.duration_minutes,
              },
            }))
          );
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          const { data, error } = await supabase
            .from('appointments')
            .select(`
              id,
              start_time,
              end_time,
              status,
              total_price,
              expert_id,
              expert_profiles:expert_id (
                id,
                profiles:user_id (
                  full_name,
                  avatar_url
                )
              ),
              expert_offers:offer_id (
                title,
                format,
                duration_minutes
              )
            `)
            .eq('client_id', profile.id)
            .order('start_time', { ascending: true });

          if (error) throw error;

          setAppointments(data.map((apt: any) => {
            const expertProfiles = Array.isArray(apt.expert_profiles)
              ? apt.expert_profiles[0]
              : apt.expert_profiles;
            const expertProfile = Array.isArray(expertProfiles?.profiles)
              ? expertProfiles?.profiles[0]
              : expertProfiles?.profiles;

            return {
              id: apt.id,
              expert_id: apt.expert_id || expertProfiles?.id,
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              expert: {
                id: expertProfiles?.id || apt.expert_id || '',
                full_name: expertProfile?.full_name || '',
                avatar_url: expertProfile?.avatar_url || '',
              },
              offer: {
                title: apt.expert_offers?.title || '',
                format: apt.expert_offers?.format || '',
                duration_minutes: apt.expert_offers?.duration_minutes,
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
  }, [userId, role]);

  useEffect(() => {
    if (userId) {
      loadAppointments();
    }
  }, [userId, role, loadAppointments]);

  const filterByStatus = (status?: string) => {
    if (!status) return appointments;
    return appointments.filter(apt => apt.status === status);
  };

  const terminDates = useMemo(
    () =>
      appointments
        .filter((apt) => !apt.status.startsWith('cancelled'))
        .map((apt) => startOfDay(parseISO(apt.start_time))),
    [appointments]
  );

  const clearDayPreviewHide = () => {
    if (dayPreviewHideTimer.current) {
      clearTimeout(dayPreviewHideTimer.current);
      dayPreviewHideTimer.current = null;
    }
  };

  const scheduleDayPreviewHide = () => {
    clearDayPreviewHide();
    dayPreviewHideTimer.current = setTimeout(() => setHoveredDayPreview(null), 160);
  };

  const getAppointmentsForDay = useCallback(
    (day: Date) =>
      appointments
        .filter(
          (apt) =>
            !apt.status.startsWith('cancelled') && isSameDay(parseISO(apt.start_time), day)
        )
        .sort(
          (a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
        ),
    [appointments]
  );

  const hoveredDayAppointments = useMemo(() => {
    if (!hoveredDayPreview) return [];
    return getAppointmentsForDay(hoveredDayPreview.date);
  }, [hoveredDayPreview, getAppointmentsForDay]);

  const handleOpenDetail = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setIsDetailModalOpen(true);
  };

  const handleStartChat = async (appointment: Appointment) => {
    if (!userId) return;
    if (role === 'client' && !appointment.expert?.id) return;
    if (role === 'expert' && !appointment.client) return;

    setChatLoadingId(appointment.id);
    setError('');
    try {
      const backendMode = getBackendMode();
      const clientId =
        role === 'client'
          ? userId
          : appointment.client?.id || `client-${appointment.id}`;
      const expertId =
        role === 'expert'
          ? appointment.expert_id || userId
          : appointment.expert!.id;

      if (backendMode === 'mock') {
        const { mockChatThreads, mockChatMessagesByThread } = await import(
          '@/lib/backend/mock/data'
        );
        let thread = mockChatThreads.find(
          (t) =>
            t.appointment_id === appointment.id ||
            (role === 'expert'
              ? t.client_id === clientId
              : t.expert_id === expertId)
        );
        if (!thread) {
          thread = {
            id: `thread-${appointment.id}`,
            appointment_id: appointment.id,
            client_id: clientId,
            expert_id: expertId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            client: {
              full_name: appointment.client?.full_name || 'Klient:in',
              avatar_url: appointment.client?.avatar_url || '',
            },
            expert: {
              full_name: appointment.expert?.full_name || 'Expert:in',
              avatar_url: appointment.expert?.avatar_url || '',
            },
            offer_title: appointment.offer.title,
            last_message: '',
            unread_count_client: 0,
            unread_count_expert: 0,
          };
          mockChatThreads.unshift(thread);
          mockChatMessagesByThread[thread.id] = [];
        } else {
          if (role === 'expert' && appointment.client) {
            thread.client = {
              full_name: appointment.client.full_name,
              avatar_url: appointment.client.avatar_url,
            };
          } else if (role === 'client' && appointment.expert) {
            thread.expert = {
              full_name: appointment.expert.full_name,
              avatar_url: appointment.expert.avatar_url,
            };
          }
          thread.offer_title = appointment.offer.title;
        }
        router.push(`/app/nachrichten?thread=${thread.id}`);
        return;
      }

      const thread = await chatService.getOrCreateThread(
        appointment.id,
        clientId,
        expertId
      );
      router.push(`/app/nachrichten?thread=${thread.id}`);
    } catch (err: any) {
      setError(err.message || 'Chat konnte nicht gestartet werden.');
    } finally {
      setChatLoadingId(null);
    }
  };

  const handleCloseDetail = () => {
    setSelectedAppointmentId(null);
    setIsDetailModalOpen(false);
    loadAppointments();
  };

  const {
    openReschedule,
    openCancel,
    actionMessage,
    actionError,
    dialogs: appointmentManageDialogs,
    isFlowOpen,
  } = useAppointmentManageFlow({
    appointments,
    actor: role === 'expert' ? 'expert' : 'client',
    onCancelled: async (appointmentId) => {
      const backendMode = getBackendMode();
      if (backendMode === 'mock') {
        setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
        return;
      }
      await loadAppointments();
    },
    successAction: { label: 'Schließen' },
  });

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4" />
          <p className="text-gray-600 font-body">Lädt Termine...</p>
        </div>
      </div>
    );
  }

  const renderAppointmentCard = (appointment: Appointment) => (
    <div
      key={appointment.id}
      className="rounded-xl border-2 border-gray-100 bg-white p-3.5 sm:p-4 hover:border-primary-blue/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-11 h-11 shrink-0">
          <AvatarImage
            src={role === 'expert' ? appointment.client?.avatar_url : appointment.expert?.avatar_url}
            alt={role === 'expert' ? appointment.client?.full_name : appointment.expert?.full_name}
          />
          <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-heading">
            {role === 'expert'
              ? appointment.client?.full_name.split(' ').map((n) => n[0]).join('') || ''
              : appointment.expert?.full_name.split(' ').map((n) => n[0]).join('') || ''}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading font-semibold text-text-dark text-base leading-snug">
                {appointment.offer.title}
              </p>
              <p className="text-sm text-gray-500 font-body mt-0.5">
                {role === 'expert' ? (
                  <>Gebucht von {appointment.client?.full_name || 'Unbekannt'}</>
                ) : (
                  <>
                    mit{' '}
                    {appointment.expert?.id ? (
                      <Link
                        href={`/app/experten/${appointment.expert.id}`}
                        className="text-primary-blue font-medium hover:underline"
                      >
                        {appointment.expert.full_name || 'Expert:in'}
                      </Link>
                    ) : (
                      appointment.expert?.full_name || 'Unbekannt'
                    )}
                  </>
                )}
              </p>
            </div>
            <Badge className="bg-info-bg text-info-text border-none font-body text-[11px] shrink-0 flex items-center gap-1">
              {appointment.offer.format === 'online' || appointment.offer.format === 'Online' ? (
                <Video className="w-3 h-3" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
              {appointment.offer.format === 'online' || appointment.offer.format === 'Online'
                ? 'Online'
                : 'Vor Ort'}
            </Badge>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'mt-3 grid gap-2',
          (role === 'client' && appointment.expert?.id) ||
            (role === 'expert' && appointment.client)
            ? 'grid-cols-2'
            : 'grid-cols-1'
        )}
      >
        <Button
          onClick={() => handleOpenDetail(appointment.id)}
          variant="outline"
          size="sm"
          className="font-body h-9 w-full rounded-lg"
        >
          <Eye className="w-3.5 h-3.5 mr-1.5 shrink-0" />
          Details anzeigen
        </Button>
        {((role === 'client' && appointment.expert?.id) ||
          (role === 'expert' && appointment.client)) && (
          <Button
            onClick={() => handleStartChat(appointment)}
            disabled={chatLoadingId === appointment.id}
            size="sm"
            className="font-body h-9 w-full rounded-lg bg-primary-blue hover:bg-primary-blue/90 text-white"
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            {chatLoadingId === appointment.id ? 'Öffnet…' : 'Chat starten'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
          {role === 'expert' ? 'Meine Buchungen' : 'Meine Termine'}
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
          {role === 'expert'
            ? 'Verwalte deine gebuchten Termine'
            : 'Übersicht deiner gebuchten Wellness-Sessions'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-body">{error}</AlertDescription>
        </Alert>
      )}

      {actionMessage && (
        <Alert className="border-primary-green bg-primary-green/20">
          <AlertDescription className="text-text-dark font-body">{actionMessage}</AlertDescription>
        </Alert>
      )}

      {actionError && !isFlowOpen && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 font-body">{actionError}</AlertDescription>
        </Alert>
      )}

      {appointments.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-body mb-2">
              {role === 'expert'
                ? 'Du hast noch keine Buchungen erhalten.'
                : 'Du hast noch keine Termine gebucht.'}
            </p>
            <p className="text-sm text-gray-500 font-body">
              {role === 'expert'
                ? 'Sobald Klient:innen deine Angebote buchen, erscheinen sie hier.'
                : 'Finde jetzt Expert:innen und buche deine erste Session!'}
            </p>
          </CardContent>
        </Card>
      ) : role === 'client' ? (
        <Tabs defaultValue="all" className="w-full space-y-3">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList>
              <TabsTrigger value="all">Alle ({appointments.length})</TabsTrigger>
              <TabsTrigger value="confirmed">
                Gebucht ({filterByStatus('confirmed').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Abgeschlossen ({filterByStatus('completed').length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-start">
            <section className="min-w-0">
              {['all', 'confirmed', 'completed'].map((tabValue) => {
                const list = filterByStatus(tabValue === 'all' ? undefined : tabValue);
                return (
                  <TabsContent key={tabValue} value={tabValue} className="mt-0 space-y-2.5">
                    {list.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-gray-200 py-14 text-center">
                        <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-body text-sm">
                          Keine Termine in dieser Kategorie
                        </p>
                      </div>
                    ) : (
                      list.map(renderAppointmentCard)
                    )}
                  </TabsContent>
                );
              })}
            </section>

            <aside className="lg:sticky lg:top-4">
              <Card className="border-2 overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
                  <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">
                    Kalender
                  </CardTitle>
                  <CardDescription className="font-body text-xs sm:text-sm">
                    Deine Termine im Überblick
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-4 pb-4 space-y-3">
                  <div className="relative w-full">
                    <CalendarPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={de}
                      className="rounded-md p-0 w-full"
                      classNames={{
                        months: 'flex flex-col w-full',
                        month: 'space-y-3 w-full',
                        caption: 'flex justify-center pt-1 relative items-center px-10',
                        caption_label: 'text-base font-heading font-semibold text-text-dark',
                        nav: 'space-x-1 flex items-center',
                        table: 'w-full border-collapse',
                        head_row: 'flex w-full',
                        head_cell:
                          'text-gray-400 rounded-md flex-1 font-normal text-xs font-body',
                        row: 'flex w-full mt-1.5',
                        cell: 'flex-1 h-10 text-center text-sm p-0 relative',
                        day: 'h-10 w-full p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-info-bg/50',
                        day_today:
                          'border-2 border-primary-blue text-text-dark bg-transparent hover:bg-info-bg/40',
                        day_selected:
                          'bg-primary-blue text-white hover:bg-primary-blue hover:text-white focus:bg-primary-blue focus:text-white',
                      }}
                      modifiers={{
                        termin: terminDates,
                      }}
                      modifiersClassNames={{
                        termin:
                          'bg-info-bg font-semibold text-text-dark [&[aria-selected]]:bg-primary-blue [&[aria-selected]]:text-white',
                      }}
                      onDayMouseEnter={(day, modifiers, e) => {
                        clearDayPreviewHide();
                        if (!modifiers.termin) {
                          setHoveredDayPreview(null);
                          return;
                        }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const width = 260;
                        const left = Math.min(
                          Math.max(8, rect.left + rect.width / 2 - width / 2),
                          window.innerWidth - width - 8
                        );
                        setHoveredDayPreview({
                          date: day,
                          top: rect.bottom + 8,
                          left,
                        });
                      }}
                      onDayMouseLeave={() => scheduleDayPreviewHide()}
                    />

                    {hoveredDayPreview && hoveredDayAppointments.length > 0 && (
                      <div
                        className="fixed z-50 w-[260px] rounded-xl border-2 border-gray-100 bg-white p-3 shadow-lg"
                        style={{ top: hoveredDayPreview.top, left: hoveredDayPreview.left }}
                        onMouseEnter={clearDayPreviewHide}
                        onMouseLeave={scheduleDayPreviewHide}
                      >
                        <p className="font-heading text-sm font-bold text-text-dark mb-2">
                          {format(hoveredDayPreview.date, 'EEE., d. MMM', { locale: de })}
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {hoveredDayAppointments.map((apt) => (
                            <div
                              key={apt.id}
                              className="rounded-lg bg-info-bg/70 border border-primary-blue/15 p-2.5"
                            >
                              <p className="font-heading text-sm font-semibold text-text-dark leading-snug">
                                {apt.offer.title}
                              </p>
                              <p className="text-xs text-gray-600 font-body mt-0.5 truncate">
                                mit {apt.expert?.full_name || 'Expert:in'}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-body">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(parseISO(apt.start_time), 'HH:mm', { locale: de })}–
                                  {format(parseISO(apt.end_time), 'HH:mm', { locale: de })} Uhr
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-5 text-xs text-gray-500 font-body border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-info-bg border border-primary-blue/40" />
                      <span>Termin</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border-2 border-primary-blue bg-white" />
                      <span>Heute</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </Tabs>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-3">
            <TabsTrigger value="all">Alle ({appointments.length})</TabsTrigger>
            <TabsTrigger value="confirmed">
              Gebucht ({filterByStatus('confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Abgeschlossen ({filterByStatus('completed').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'confirmed', 'completed'].map((tabValue) => {
            const list = filterByStatus(tabValue === 'all' ? undefined : tabValue);
            return (
              <TabsContent key={tabValue} value={tabValue} className="mt-0 space-y-2.5">
                {list.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 py-14 text-center">
                    <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-body text-sm">
                      Keine Termine in dieser Kategorie
                    </p>
                  </div>
                ) : (
                  list.map(renderAppointmentCard)
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <AppointmentDetailModal
        appointmentId={selectedAppointmentId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        userRole={role as 'client' | 'expert'}
        onReschedule={
          role === 'client'
            ? async (id) => {
                setIsDetailModalOpen(false);
                await openReschedule(id);
              }
            : undefined
        }
        onCancel={
          role === 'client' || role === 'expert'
            ? (id) => {
                setIsDetailModalOpen(false);
                queueMicrotask(() => openCancel(id));
              }
            : undefined
        }
      />

      {appointmentManageDialogs}

    </div>
  );
}
