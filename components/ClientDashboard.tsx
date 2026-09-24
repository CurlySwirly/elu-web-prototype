'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { firstNameFrom } from '@/lib/utils/name';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarClock,
  ArrowRight,
  MoreHorizontal,
  Star,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import {
  format,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { segmentButtonClass } from '@/components/ui/tabs';
import {
  reviewService,
  type PendingReviewAppointment,
} from '@/lib/services/review';
import { ReviewFlowDialog } from '@/components/ReviewFlowDialog';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';
import {
  ExpertAppleCalendar,
  type ExpertCalendarEvent,
} from '@/components/ExpertAppleCalendar';
import { chatService } from '@/lib/services/chat';
import {
  useAppointmentManageFlow,
  type ManageableAppointment,
} from '@/components/AppointmentManageDialogs';

type FilterTab = 'all' | 'today';

type DashboardAppointment = ManageableAppointment & {
  expert?: ManageableAppointment['expert'] & {
    id?: string;
    specialty?: string;
  };
};

export default function ClientDashboard() {
  const { user, userId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<DashboardAppointment[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewAppointment[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewAppointmentId, setReviewAppointmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [greetingName, setGreetingName] = useState(() => firstNameFrom(user?.fullName));
  const [detailAppointmentId, setDetailAppointmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const resolveGreetingName = useCallback(
    (fullName?: string | null) => {
      try {
        if (userId) {
          const raw = localStorage.getItem(`elu-client-profile-extras:${userId}`);
          if (raw) {
            const extras = JSON.parse(raw) as { firstName?: string; title?: string };
            if (extras.firstName?.trim()) return extras.firstName.trim();
          }
        }
      } catch {
        /* ignore */
      }
      return firstNameFrom(fullName || user?.fullName);
    },
    [user?.fullName, userId]
  );

  useEffect(() => {
    const fromAuth = firstNameFrom(user?.fullName);
    if (fromAuth) setGreetingName(fromAuth);
  }, [user?.fullName]);

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const { mockClientAppointments, mockProfile } = await import('@/lib/backend/mock/data');
        setGreetingName(resolveGreetingName(mockProfile.full_name));
        setAppointments(
          mockClientAppointments
            .filter((apt: DashboardAppointment) => apt.status === 'confirmed')
            .map((apt: any) => ({
              id: apt.id,
              expert_id: apt.expert_id,
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              expert: {
                id: apt.expert?.id || apt.expert_id || '',
                full_name: apt.expert?.full_name || '',
                avatar_url: apt.expert?.avatar_url || '',
                specialty: apt.expert?.specialty || apt.expert?.specializations?.[0] || '',
              },
              offer: {
                title: apt.offer?.title || '',
                format: apt.offer?.format || '',
                duration_minutes: apt.offer?.duration_minutes,
              },
            }))
        );
      } else {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();
        setGreetingName(resolveGreetingName(profileRow?.full_name || user?.fullName));

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            expert_id,
            start_time,
            end_time,
            status,
            total_price,
            expert_profiles:expert_id (
              profiles:user_id (
                full_name,
                avatar_url
              ),
              specializations
            ),
            expert_offers:offer_id (
              title,
              format,
              duration_minutes
            )
          `)
          .eq('client_id', userId)
          .eq('status', 'confirmed')
          .order('start_time', { ascending: true });

        if (error) throw error;

        setAppointments(
          (data || []).map((apt: any) => {
            const expertProfiles = Array.isArray(apt.expert_profiles)
              ? apt.expert_profiles[0]
              : apt.expert_profiles;
            const profile = Array.isArray(expertProfiles?.profiles)
              ? expertProfiles?.profiles[0]
              : expertProfiles?.profiles;
            const specializations = expertProfiles?.specializations || [];
            const durationFromTimes = Math.max(
              30,
              Math.round(
                (parseISO(apt.end_time).getTime() - parseISO(apt.start_time).getTime()) /
                  60000
              )
            );

            return {
              id: apt.id,
              expert_id: apt.expert_id,
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              expert: {
                id: apt.expert_id || apt.expert?.id || '',
                full_name: profile?.full_name || '',
                avatar_url: profile?.avatar_url || '',
                specialty: Array.isArray(specializations) ? specializations[0] : '',
              },
              offer: {
                title: apt.expert_offers?.title || '',
                format: apt.expert_offers?.format || '',
                duration_minutes: apt.expert_offers?.duration_minutes || durationFromTimes,
              },
            };
          })
        );
      }

      const pending = await reviewService.getPendingReviewAppointments(userId);
      setPendingReviews(pending);

      if (backendMode === 'mock') {
        const { mockChatThreads } = await import('@/lib/backend/mock/data');
        setUnreadMessagesCount(
          mockChatThreads
            .filter((t) => t.client_id === 'mock-user-client' || t.client_id === userId)
            .reduce((sum, t) => sum + (t.unread_count_client || 0), 0)
        );
      } else {
        const unread = await chatService.getUnreadCount(userId, false);
        setUnreadMessagesCount(unread);
      }
    } catch (err) {
      console.error('Error loading client dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.fullName, resolveGreetingName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const reviewId = searchParams.get('review');
    if (!reviewId || loading) return;
    setReviewAppointmentId(reviewId);
    setIsReviewOpen(true);
  }, [searchParams, loading]);

  const openReviewFlow = (appointmentId?: string | null) => {
    setReviewAppointmentId(appointmentId || null);
    setIsReviewOpen(true);
  };

  const handleReviewOpenChange = (open: boolean) => {
    setIsReviewOpen(open);
    if (!open) {
      setReviewAppointmentId(null);
      if (searchParams.get('review')) {
        router.replace('/app');
      }
    }
  };

  const upcomingAppointments = useMemo(() => {
    const now = startOfDay(new Date());
    return appointments
      .filter((apt) => parseISO(apt.start_time) >= now)
      .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    if (filter === 'today') {
      return upcomingAppointments.filter((apt) => isToday(parseISO(apt.start_time)));
    }
    return upcomingAppointments;
  }, [upcomingAppointments, filter]);

  const calendarEvents = useMemo<ExpertCalendarEvent[]>(() => {
    return appointments.map((apt) => {
      const formatLabel =
        apt.offer.format === 'online' || apt.offer.format === 'Online'
          ? 'Online'
          : 'Vor Ort';
      return {
        id: apt.id,
        title: apt.offer.title,
        start: parseISO(apt.start_time),
        end: parseISO(apt.end_time),
        color: 'blue' as const,
        source: 'elu' as const,
        meta: apt.expert?.full_name || 'Expert:in',
        hoverLines: [
          `mit ${apt.expert?.full_name || 'Expert:in'}`,
          formatLabel,
        ],
      };
    });
  }, [appointments]);

  const {
    openReschedule,
    openCancel,
    openRescheduleRequestReview,
    pendingRequests,
    actionMessage,
    actionError,
    dialogs: appointmentManageDialogs,
    isFlowOpen,
  } = useAppointmentManageFlow({
    appointments,
    actor: 'client',
    rescheduleUserId: userId,
    onCancelled: async (appointmentId) => {
      const backendMode = getBackendMode();
      if (backendMode === 'mock') {
        setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
        return;
      }
      await loadData();
    },
    onRescheduled: async (appointmentId, newStart, newEnd) => {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId
            ? { ...apt, start_time: newStart, end_time: newEnd }
            : apt
        )
      );
    },
    successAction: { label: 'Zum Dashboard', href: '/app' },
  });

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      {/* Welcome – soft Elu surface, no black CTA */}
      <section className="relative overflow-hidden rounded-2xl border-2 border-primary-blue/15 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-info-bg/80 via-white to-primary-green/15" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-blue/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary-green/20 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-6 md:p-7">
          <div className="max-w-xl space-y-2">
            <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-text-dark leading-tight">
              Hi
              {greetingName ? (
                <>
                  ,{' '}
                  <span className="bg-gradient-to-r from-primary-blue to-primary-green bg-clip-text text-transparent">
                    {greetingName}
                  </span>
                </>
              ) : null}
              !
            </h1>
            <p className="font-body text-gray-600 text-sm leading-relaxed">
              Schön dich zu sehen. Bereit deine Gesundheit aufs nächste Level zu bringen?
            </p>
          </div>

          <Button
            asChild
            className="w-full md:w-auto bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold px-7 py-6 text-base shrink-0 shadow-md"
          >
            <Link href="/app/experten">Expert:in finden</Link>
          </Button>
        </div>
      </section>
      {actionMessage && (
        <Alert className="border-primary-green bg-primary-green/20">
          <AlertDescription className="text-text-dark font-body">{actionMessage}</AlertDescription>
        </Alert>
      )}

      {pendingRequests.length > 0 && (
        <div className="space-y-2">
          {pendingRequests.map((req) => (
            <Alert
              key={req.id}
              className="border-primary-blue/30 bg-primary-blue/5 cursor-pointer"
              onClick={() => openRescheduleRequestReview(req)}
            >
              <AlertDescription className="text-text-dark font-body text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>
                  Verschiebungsanfrage
                  {req.offerTitle ? ` für „${req.offerTitle}“` : ''} – bitte prüfen und ggf. einen
                  neuen Termin wählen.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-body shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRescheduleRequestReview(req);
                  }}
                >
                  Anfrage prüfen
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {actionError && !isFlowOpen && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 font-body">{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link
          href="/app/termine"
          className="relative block rounded-xl border-2 bg-white transition-colors outline-none hover:border-primary-blue focus-visible:ring-2 focus-visible:ring-primary-blue"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-1.5 pt-3.5 px-4">
              <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
                <CalendarIcon className="w-5 h-5 text-primary-blue" />
                Kommende Termine
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3.5">
              <p className="text-3xl font-heading font-bold text-text-dark">
                {upcomingAppointments.length}
              </p>
            </CardContent>
          </Card>
          <ArrowRight className="absolute bottom-3.5 right-3.5 w-4 h-4 text-primary-blue" aria-hidden />
        </Link>

        <Link
          href="/app/nachrichten"
          className="relative block rounded-xl border-2 bg-white transition-colors outline-none hover:border-primary-blue focus-visible:ring-2 focus-visible:ring-primary-blue"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-1.5 pt-3.5 px-4">
              <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
                <MessageCircle className="w-5 h-5 text-primary-blue" />
                Neue Nachrichten
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3.5">
              <p className="text-3xl font-heading font-bold text-text-dark">
                {unreadMessagesCount}
              </p>
            </CardContent>
          </Card>
          <ArrowRight className="absolute bottom-3.5 right-3.5 w-4 h-4 text-primary-blue" aria-hidden />
        </Link>

        <button
          type="button"
          onClick={() =>
            openReviewFlow(pendingReviews.length === 1 ? pendingReviews[0].id : null)
          }
          className="relative block w-full text-left rounded-xl border-2 bg-white transition-colors outline-none hover:border-primary-blue focus-visible:ring-2 focus-visible:ring-primary-blue"
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-1.5 pt-3.5 px-4">
              <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
                <Star className="w-5 h-5 text-primary-blue" />
                Offene Bewertungen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3.5">
              <p className="text-3xl font-heading font-bold text-text-dark">
                {pendingReviews.length}
              </p>
            </CardContent>
          </Card>
          <ArrowRight className="absolute bottom-3.5 right-3.5 w-4 h-4 text-primary-blue" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Upcoming appointments */}
        <Card className="border-2">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">
                  Kommende Termine
                </CardTitle>
              </div>
              <div className="w-full sm:w-auto overflow-x-auto">
                <div className="inline-flex min-w-full sm:min-w-0 items-center gap-0.5 rounded-full bg-gray-100 p-0.5">
                  {(
                    [
                      { id: 'all', label: 'Alle' },
                      { id: 'today', label: 'Heute' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        'flex-1 sm:flex-none',
                        segmentButtonClass(filter === tab.id)
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 px-4 sm:px-5 pb-4">
            {filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center text-center py-8 px-2">
                <svg
                  width="64"
                  height="70"
                  viewBox="0 0 88 96"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mb-3 drop-shadow-sm"
                  aria-hidden
                >
                  <rect x="8" y="18" width="72" height="70" rx="10" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="2" />
                  <rect x="8" y="18" width="72" height="18" rx="10" fill="#9CA3AF" />
                  <rect x="8" y="28" width="72" height="8" fill="#9CA3AF" />
                  <circle cx="26" cy="18" r="5" fill="#6B7280" stroke="#E5E7EB" strokeWidth="2" />
                  <circle cx="62" cy="18" r="5" fill="#6B7280" stroke="#E5E7EB" strokeWidth="2" />
                  <circle cx="34" cy="58" r="3.5" fill="#1F2937" />
                  <circle cx="54" cy="58" r="3.5" fill="#1F2937" />
                  <path
                    d="M36 72c3.5-4 12.5-4 16 0"
                    stroke="#1F2937"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <h3 className="font-heading text-base font-semibold text-text-dark mb-1.5">
                  Keine kommenden Termine
                </h3>
                <p className="font-body text-xs text-gray-500 max-w-[14rem] mb-4 leading-relaxed">
                  {upcomingAppointments.length === 0
                    ? 'Du hast keine anstehenden Termine. Buche eine Expert:in, um loszulegen.'
                    : 'In dieser Ansicht sind keine Termine. Wechsle den Filter oder buche eine Expert:in.'}
                </p>
                <Button
                  asChild
                  size="sm"
                  className="bg-primary-blue hover:bg-primary-blue/90 text-white font-body font-semibold text-xs px-4 rounded-lg shadow-sm"
                >
                  <Link href="/app/experten">Expert:in finden</Link>
                </Button>
              </div>
            ) : (
              filteredAppointments.slice(0, 5).map((apt) => {
                const expertProfileId = apt.expert?.id || apt.expert_id || '';
                return (
                  <div
                    key={apt.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setDetailAppointmentId(apt.id);
                      setIsDetailModalOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetailAppointmentId(apt.id);
                        setIsDetailModalOpen(true);
                      }
                    }}
                    className="w-full text-left p-3 rounded-xl border-2 bg-white hover:border-primary-blue transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11 shrink-0">
                        <AvatarImage src={apt.expert?.avatar_url} alt={apt.expert?.full_name} />
                        <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-heading">
                          {(apt.expert?.full_name || '?')
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-heading font-semibold text-text-dark truncate">
                              {apt.offer.title}
                            </p>
                            <p className="text-sm text-gray-600 font-body mt-0.5 truncate">
                              mit{' '}
                              {expertProfileId ? (
                                <Link
                                  href={`/app/experten/${expertProfileId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-primary-blue font-medium hover:underline"
                                >
                                  {apt.expert?.full_name || 'Expert:in'}
                                </Link>
                              ) : (
                                apt.expert?.full_name || 'Expert:in'
                              )}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-text-dark shrink-0 -mt-1 -mr-1"
                                aria-label="Terminoptionen"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 font-body"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onSelect={() => openReschedule(apt.id)}
                              >
                                <CalendarClock className="w-4 h-4 mr-2 text-primary-blue" />
                                Termin verschieben
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onSelect={() => openCancel(apt.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Termin stornieren
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {upcomingAppointments.length > 5 && (
              <div className="pt-2 text-center">
                <Link
                  href="/app/termine"
                  className="text-sm text-primary-blue hover:underline font-body"
                >
                  Alle Termine anzeigen →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card className="border-2 lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">Kalender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-5 pb-4">
            <ExpertAppleCalendar
              events={calendarEvents}
              availableViews={['week', 'month']}
              defaultView="month"
              showSync={false}
              compactHours
              className="border shadow-none rounded-xl"
              onSelectEvent={(eventId) => {
                setDetailAppointmentId(eventId);
                setIsDetailModalOpen(true);
              }}
            />

            <div className="flex items-center gap-5 text-xs text-gray-600 font-body border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-sm bg-info-bg border border-primary-blue/40" />
                <span>Buchung</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AppointmentDetailModal
        appointmentId={detailAppointmentId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailAppointmentId(null);
        }}
        userRole="client"
        hidePrice
      />

      {appointmentManageDialogs}

      {userId && (
        <ReviewFlowDialog
          open={isReviewOpen}
          onOpenChange={handleReviewOpenChange}
          pending={pendingReviews}
          initialAppointmentId={reviewAppointmentId}
          clientId={userId}
          onCompleted={async () => {
            await loadData();
          }}
        />
      )}
    </div>
  );
}
