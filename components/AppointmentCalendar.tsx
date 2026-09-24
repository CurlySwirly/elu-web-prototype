'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, AlertCircle, MoreVertical } from 'lucide-react';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppointmentDetailModal from './AppointmentDetailModal';
import { useAppointmentManageFlow } from '@/components/AppointmentManageDialogs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Appointment {
  id: string;
  client_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string;
  client?: {
    id?: string;
    full_name: string;
    avatar_url: string;
    phone?: string;
    email?: string;
    gender?: string;
  };
  expert?: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
  is_newly_accepted?: boolean;
  is_new_booking?: boolean;
}

interface AppointmentCalendarProps {
  role: 'client' | 'expert';
}

export default function AppointmentCalendar({ role }: AppointmentCalendarProps) {
  const { userId } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const {
    openCancel,
    actionMessage,
    actionError,
    dialogs: appointmentManageDialogs,
  } = useAppointmentManageFlow({
    appointments,
    actor: role === 'expert' ? 'expert' : 'client',
    onCancelled: async (appointmentId) => {
      setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
    },
    successAction: { label: 'Schließen' },
  });

  const loadAppointments = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Check if we're in mock mode
      const backendMode = getBackendMode();
      
      if (backendMode === 'mock') {
        // Use mock data
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
        
        if (role === 'expert') {
          const { mockExpertAppointments } = await import('@/lib/backend/mock/data');
          setAppointments(mockExpertAppointments.map(apt => ({
            id: apt.id,
            client_id: apt.client?.id || apt.client_id || apt.client?.email || apt.client?.full_name,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: apt.total_price,
            notes: apt.notes,
            client: apt.client
              ? {
                  id: apt.client.id || apt.client_id,
                  full_name: apt.client.full_name || '',
                  avatar_url: apt.client.avatar_url || '',
                  phone: apt.client.phone || '',
                  email: apt.client.email || '',
                  gender: apt.client.gender,
                }
              : undefined,
            offer: apt.offer,
            is_newly_accepted: apt.is_newly_accepted,
            is_new_booking: apt.is_new_booking,
          })));
        } else {
          const { mockClientAppointments } = await import('@/lib/backend/mock/data');
          setAppointments(mockClientAppointments.map(apt => ({
            id: apt.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: apt.total_price,
            notes: apt.notes,
            expert: apt.expert,
            offer: apt.offer,
            is_newly_accepted: apt.is_newly_accepted,
          })));
        }
        setLoading(false);
        return;
      }
      
      if (role === 'expert') {
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
                phone,
                email
              ),
              expert_offers:offer_id (
                title,
                format
              )
            `)
            .eq('expert_id', expertProfile.id)
            .not('status', 'in', '(cancelled,cancelled_by_client,cancelled_by_expert)')
            .order('start_time', { ascending: true });

          if (error) throw error;

          setAppointments((data || []).map((apt: any) => {
            const clientProfile = Array.isArray(apt.profiles)
              ? apt.profiles[0]
              : apt.profiles;
            const offer = Array.isArray(apt.expert_offers)
              ? apt.expert_offers[0]
              : apt.expert_offers;

            return {
              id: apt.id,
              client_id: apt.client_id || clientProfile?.id,
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              notes: apt.notes,
              client: {
                id: clientProfile?.id || apt.client_id,
                full_name: clientProfile?.full_name || '',
                avatar_url: clientProfile?.avatar_url || '',
                phone: clientProfile?.phone || '',
                email: clientProfile?.email || '',
              },
              offer: {
                title: offer?.title || '',
                format: offer?.format || '',
              },
            };
          }));
        }
      } else {
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
              expert_profiles:expert_id (
                profiles:user_id (
                  full_name,
                  avatar_url
                )
              ),
              expert_offers:offer_id (
                title,
                format
              )
            `)
            .eq('client_id', profile.id)
            .gte('start_time', new Date().toISOString())
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
              start_time: apt.start_time,
              end_time: apt.end_time,
              status: apt.status,
              total_price: apt.total_price,
              expert: {
                full_name: expertProfile?.full_name || '',
                avatar_url: expertProfile?.avatar_url || '',
              },
              offer: {
                title: apt.expert_offers?.title || '',
                format: apt.expert_offers?.format || '',
              },
            };
          }));
        }
      }
    } catch (err: any) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, role]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = startOfDay(parseISO(apt.start_time));
      return isSameDay(aptDate, date);
    });
  };

  const getClientKey = (apt: Appointment) =>
    apt.client_id ||
    apt.client?.id ||
    apt.client?.email ||
    apt.client?.full_name ||
    apt.id;

  /** First appointment with this expert = Neukunde; later ones = Bestandskunde */
  const isNewClientAppointment = (apt: Appointment) => {
    if (typeof apt.is_new_booking === 'boolean') return apt.is_new_booking;

    const key = getClientKey(apt);
    const aptStart = parseISO(apt.start_time).getTime();
    return !appointments.some(
      (other) =>
        other.id !== apt.id &&
        other.status !== 'cancelled' &&
        getClientKey(other) === key &&
        parseISO(other.start_time).getTime() < aptStart
    );
  };

  const isFemaleClient = (apt: Appointment) => {
    const gender = (apt.client?.gender || '').toLowerCase().trim();
    if (['female', 'w', 'f', 'weiblich'].includes(gender)) return true;
    if (['male', 'm', 'männlich', 'maennlich'].includes(gender)) return false;
    const first = (apt.client?.full_name || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
    return [
      'anna', 'lisa', 'sarah', 'julia', 'laura', 'maria', 'emma', 'lena', 'lea',
      'sophie', 'sophia', 'mia', 'hannah', 'hanna', 'clara', 'klara', 'nina',
      'jana', 'katharina', 'kathrin', 'katrin', 'sandra', 'sabine', 'petra',
      'monika', 'christina', 'christine', 'stefanie', 'stephanie', 'franziska',
      'vanessa', 'jennifer', 'jessica', 'michelle', 'nicole', 'nadine', 'elena',
    ].includes(first);
  };

  const getAppointmentBadge = (apt: Appointment) => {
    // Expert calendar: only Neukunde/Neukundin — never "Gebucht"
    if (role === 'expert') {
      if (
        (apt.status === 'confirmed' || apt.status === 'completed') &&
        isNewClientAppointment(apt)
      ) {
        return (
          <Badge className="border-none text-xs font-body shrink-0 bg-primary-green/25 text-text-dark">
            {isFemaleClient(apt) ? 'Neukundin' : 'Neukunde'}
          </Badge>
        );
      }
      return null;
    }

    if (apt.status === 'confirmed') {
      return (
        <Badge className="bg-info-bg text-info-text border-none text-xs font-body shrink-0">
          Gebucht
        </Badge>
      );
    }
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      completed: { label: 'Abgeschlossen', variant: 'secondary' },
      cancelled: { label: 'Abgesagt', variant: 'destructive' },
      cancelled_by_client: { label: 'Abgesagt', variant: 'destructive' },
      cancelled_by_expert: { label: 'Abgesagt', variant: 'destructive' },
    };
    const statusInfo = statusMap[apt.status];
    if (!statusInfo) return null;
    return (
      <Badge variant={statusInfo.variant} className="text-xs font-body shrink-0">
        {statusInfo.label}
      </Badge>
    );
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm', { locale: de });
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate).sort((a, b) => {
    return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
  }) : [];

  return (
    <>
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-[minmax(280px,400px)_1fr] min-h-[28rem]">
      {/* Calendar */}
      <div className="flex flex-col min-h-0 lg:border-r lg:border-gray-100">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
          <h3 className="font-heading text-xl font-semibold text-text-dark">Kalender</h3>
          <p className="text-sm text-gray-500 font-body mt-0.5">
            Übersicht deiner kommenden Termine
          </p>
        </div>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex-1">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={de}
            className="rounded-md w-full p-0"
            classNames={{
              day_today:
                '!bg-primary-blue !text-white hover:!bg-primary-blue hover:!text-white focus:!bg-primary-blue focus:!text-white font-semibold',
              day_selected:
                'bg-primary-blue text-white hover:bg-primary-blue hover:text-white focus:bg-primary-blue focus:text-white',
            }}
            modifiers={{
              hasAppointment: (date) =>
                !isSameDay(date, new Date()) && getAppointmentsForDate(date).length > 0,
              hasNewlyAccepted: (date) =>
                !isSameDay(date, new Date()) &&
                getAppointmentsForDate(date).some(
                  (apt) => apt.status === 'confirmed' && apt.is_newly_accepted
                ),
            }}
            modifiersClassNames={{
              hasAppointment: 'bg-primary-blue/10 font-semibold',
              hasNewlyAccepted: 'bg-primary-green/30 border-primary-green border-2 font-bold',
            }}
          />
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 font-body flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-blue/10 border border-primary-blue" />
              <span>Termin vorhanden</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-green/30 border-2 border-primary-green" />
              <span>Neu gebucht</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected day appointments */}
      <div className="flex flex-col min-h-0 border-t border-gray-100 lg:border-t-0">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 shrink-0">
          <h3 className="font-heading text-xl font-semibold text-text-dark">
            {selectedDate
              ? `Termine am ${format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}`
              : 'Wähle ein Datum'}
          </h3>
          <p className="text-sm text-gray-500 font-body mt-0.5">
            {selectedDate && selectedDateAppointments.length > 0
              ? `${selectedDateAppointments.length} ${selectedDateAppointments.length === 1 ? 'Termin' : 'Termine'}`
              : selectedDate
                ? 'Keine Termine an diesem Tag'
                : 'Klicke auf ein Datum im Kalender'}
          </p>
        </div>
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : !selectedDate ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-body">
                Wähle ein Datum im Kalender aus, um die Termine zu sehen
              </p>
            </div>
          ) : selectedDateAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-body">Keine Termine an diesem Tag</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateAppointments.map((apt) => {
                const partnerName =
                  role === 'expert'
                    ? apt.client?.full_name
                    : apt.expert?.full_name;
                const badge = getAppointmentBadge(apt);
                const status = String(apt.status || '');
                const isCancellable =
                  role === 'expert' &&
                  status === 'confirmed';

                return (
                  <div
                    key={apt.id}
                    className={cn(
                      'flex items-center gap-0.5 rounded-lg border transition-colors hover:border-primary-blue',
                      status === 'confirmed' && apt.is_newly_accepted
                        ? 'border-primary-green/50 bg-primary-green/5'
                        : 'border-gray-100 bg-white'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAppointmentId(apt.id);
                        setIsDetailModalOpen(true);
                      }}
                      className="min-w-0 flex-1 text-left flex items-center gap-3 px-3 py-2.5"
                    >
                      <div className="w-14 shrink-0">
                        <p className="font-body font-semibold text-sm text-text-dark tabular-nums">
                          {formatTime(apt.start_time)}
                        </p>
                        <p className="font-body text-xs text-gray-400 tabular-nums">
                          {formatTime(apt.end_time)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        {role === 'expert' ? (
                          <>
                            <p className="font-heading font-semibold text-sm text-text-dark truncate">
                              {apt.offer.title || 'Termin'}
                            </p>
                            <p className="font-body text-xs text-gray-500 truncate mt-0.5">
                              {(apt.offer.format || '').toLowerCase().includes('online')
                                ? 'Online'
                                : 'Vor Ort'}
                              {partnerName ? ` · ${partnerName}` : ''}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-heading font-semibold text-sm text-text-dark truncate">
                              {apt.offer.title}
                            </p>
                            <p className="font-body text-xs text-gray-500 truncate mt-0.5">
                              {(apt.offer.format || '').toLowerCase().includes('online')
                                ? 'Online'
                                : 'Vor Ort'}
                              {partnerName ? ` · ${partnerName}` : ''}
                            </p>
                          </>
                        )}
                      </div>
                      {badge}
                    </button>
                    {role === 'expert' && isCancellable ? (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md mr-1.5 text-gray-600 hover:bg-gray-100 hover:text-text-dark"
                            aria-label="Terminoptionen"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[11rem] font-body z-[80]">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                            onSelect={() => openCancel(apt.id)}
                          >
                            Termin absagen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {selectedAppointmentId && (
        <AppointmentDetailModal
          appointmentId={selectedAppointmentId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedAppointmentId(null);
            loadAppointments();
          }}
          userRole={role}
          onCancel={
            role === 'expert'
              ? (id) => {
                  setIsDetailModalOpen(false);
                  setSelectedAppointmentId(null);
                  queueMicrotask(() => openCancel(id));
                }
              : undefined
          }
        />
      )}

      {actionMessage && (
        <Alert className="border-primary-green bg-primary-green/20 mt-4">
          <AlertDescription className="text-text-dark font-body">{actionMessage}</AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert className="border-red-200 bg-red-50 mt-4">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 font-body">{actionError}</AlertDescription>
        </Alert>
      )}

      {appointmentManageDialogs}
    </>
  );
}

