'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  Trash2,
  Video,
} from 'lucide-react';
import { format, isBefore, parseISO, startOfDay, startOfToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { cancelAppointmentByClient, cancelAppointmentByExpert } from '@/lib/services/booking';
import {
  getAvailableTimeSlotsForDate,
  hasAvailabilityOnDate,
  type BusyInterval,
  type ExpertAbsence,
  type ExpertAvailabilitySlot,
} from '@/lib/services/availability';

export type ManageableAppointment = {
  id: string;
  expert_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  expert?: {
    full_name: string;
    avatar_url: string;
  };
  client?: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
    duration_minutes?: number;
  };
};

export type AppointmentManageSuccessAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export type UseAppointmentManageFlowOptions = {
  appointments: ManageableAppointment[];
  /** Who is cancelling — defaults to client */
  actor?: 'client' | 'expert';
  onCancelled?: (appointmentId: string) => void | Promise<void>;
  onRescheduleSuccessClose?: () => void;
  successAction?: AppointmentManageSuccessAction;
};

export function useAppointmentManageFlow({
  appointments,
  actor = 'client',
  onCancelled,
  onRescheduleSuccessClose,
  successAction = { label: 'Schließen' },
}: UseAppointmentManageFlowOptions) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isRescheduleConfirmOpen, setIsRescheduleConfirmOpen] = useState(false);
  const [isRescheduleSuccessOpen, setIsRescheduleSuccessOpen] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<{
    date: Date;
    time: string;
    appointment: ManageableAppointment;
  } | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [expertAvailability, setExpertAvailability] = useState<ExpertAvailabilitySlot[]>([]);
  const [expertAbsences, setExpertAbsences] = useState<ExpertAbsence[]>([]);
  const [expertBusyIntervals, setExpertBusyIntervals] = useState<BusyInterval[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const selectedAppointment = useMemo(
    () => appointments.find((apt) => apt.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  const appointmentDates = useMemo(
    () => appointments.map((apt) => startOfDay(parseISO(apt.start_time))),
    [appointments]
  );

  const rescheduleDurationMinutes = useMemo(() => {
    if (!selectedAppointment) return 60;
    if (selectedAppointment.offer.duration_minutes) {
      return selectedAppointment.offer.duration_minutes;
    }
    return Math.max(
      30,
      Math.round(
        (parseISO(selectedAppointment.end_time).getTime() -
          parseISO(selectedAppointment.start_time).getTime()) /
          60000
      )
    );
  }, [selectedAppointment]);

  const availableRescheduleSlots = useMemo(() => {
    if (!rescheduleDate) return [];
    return getAvailableTimeSlotsForDate({
      date: rescheduleDate,
      availability: expertAvailability,
      absences: expertAbsences,
      durationMinutes: rescheduleDurationMinutes,
      busyIntervals: expertBusyIntervals.filter(
        (busy) => busy.id !== selectedAppointmentId
      ),
    });
  }, [
    rescheduleDate,
    expertAvailability,
    expertAbsences,
    rescheduleDurationMinutes,
    expertBusyIntervals,
    selectedAppointmentId,
  ]);

  useEffect(() => {
    if (!rescheduleTime) return;
    if (!availableRescheduleSlots.includes(rescheduleTime)) {
      setRescheduleTime('');
    }
  }, [availableRescheduleSlots, rescheduleTime]);

  const loadExpertAvailabilityForReschedule = async (
    appointment: ManageableAppointment
  ): Promise<{
    availability: ExpertAvailabilitySlot[];
    absences: ExpertAbsence[];
    busy: BusyInterval[];
  }> => {
    if (!appointment.expert_id) {
      setExpertAvailability([]);
      setExpertAbsences([]);
      setExpertBusyIntervals([]);
      return { availability: [], absences: [], busy: [] };
    }

    setLoadingAvailability(true);
    try {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        const { mockExpertAvailabilityByExpertId } = await import(
          '@/lib/backend/mock/data'
        );
        const availability =
          mockExpertAvailabilityByExpertId[appointment.expert_id] ||
          mockExpertAvailabilityByExpertId['mock-expert-1'] ||
          [];
        const busy = appointments
          .filter(
            (apt) =>
              apt.expert_id === appointment.expert_id && apt.status === 'confirmed'
          )
          .map((apt) => ({
            id: apt.id,
            start: parseISO(apt.start_time),
            end: parseISO(apt.end_time),
          }));
        setExpertAvailability(availability);
        setExpertAbsences([]);
        setExpertBusyIntervals(busy);
        return { availability, absences: [], busy };
      }

      const [{ data: availability }, { data: absences }, { data: busyRows }] =
        await Promise.all([
          supabase
            .from('expert_availability')
            .select('id, day_of_week, start_time, end_time, is_available')
            .eq('expert_profile_id', appointment.expert_id)
            .eq('is_available', true),
          supabase
            .from('expert_absences')
            .select('id, start_date, end_date, reason')
            .eq('expert_profile_id', appointment.expert_id),
          supabase
            .from('appointments')
            .select('id, start_time, end_time')
            .eq('expert_id', appointment.expert_id)
            .in('status', ['confirmed', 'requested', 'pending'])
            .gte('start_time', new Date().toISOString()),
        ]);

      const availabilitySlots = (availability as ExpertAvailabilitySlot[]) || [];
      const absenceRows = (absences as ExpertAbsence[]) || [];
      const busy = (busyRows || []).map((apt: { id: string; start_time: string; end_time: string }) => ({
        id: apt.id,
        start: parseISO(apt.start_time),
        end: parseISO(apt.end_time),
      }));

      setExpertAvailability(availabilitySlots);
      setExpertAbsences(absenceRows);
      setExpertBusyIntervals(busy);
      return { availability: availabilitySlots, absences: absenceRows, busy };
    } catch (err) {
      console.error('Error loading expert availability:', err);
      setExpertAvailability([]);
      setExpertAbsences([]);
      setExpertBusyIntervals([]);
      return { availability: [], absences: [], busy: [] };
    } finally {
      setLoadingAvailability(false);
    }
  };

  const openReschedule = useCallback(
    async (appointmentId: string) => {
      const apt = appointments.find((a) => a.id === appointmentId);
      if (!apt) return;

      setSelectedAppointmentId(appointmentId);
      setRescheduleTime('');
      setActionError('');
      setIsRescheduleConfirmOpen(false);
      setIsRescheduleOpen(true);

      const { availability, absences, busy } =
        await loadExpertAvailabilityForReschedule(apt);

      const duration =
        apt.offer.duration_minutes ||
        Math.max(
          30,
          Math.round(
            (parseISO(apt.end_time).getTime() - parseISO(apt.start_time).getTime()) /
              60000
          )
        );

      const today = startOfToday();
      let nextAvailable: Date | undefined;
      for (let i = 0; i < 60; i++) {
        const candidate = new Date(today);
        candidate.setDate(today.getDate() + i);
        const slots = getAvailableTimeSlotsForDate({
          date: candidate,
          availability,
          absences,
          durationMinutes: duration,
          busyIntervals: busy.filter((b) => b.id !== appointmentId),
        });
        if (slots.length > 0) {
          nextAvailable = candidate;
          break;
        }
      }

      setRescheduleDate(nextAvailable);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadExpertAvailabilityForReschedule uses appointments state
    [appointments]
  );

  const openCancel = useCallback((appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setActionError('');
    setIsCancelOpen(true);
  }, []);

  const handleContinueReschedule = () => {
    if (!selectedAppointmentId || !rescheduleDate || !rescheduleTime) {
      setActionError('Bitte wähle Datum und Uhrzeit.');
      return;
    }
    setActionError('');
    setIsRescheduleOpen(false);
    setIsRescheduleConfirmOpen(true);
  };

  const handleBackToRescheduleSelect = () => {
    setIsRescheduleConfirmOpen(false);
    setIsRescheduleOpen(true);
  };

  const handleSubmitReschedule = async () => {
    if (!selectedAppointmentId || !rescheduleDate || !rescheduleTime || !selectedAppointment) {
      setActionError('Bitte wähle Datum und Uhrzeit.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setRescheduleSuccess({
        date: rescheduleDate,
        time: rescheduleTime,
        appointment: selectedAppointment,
      });
      setIsRescheduleConfirmOpen(false);
      setIsRescheduleOpen(false);
      setSelectedAppointmentId(null);
      setRescheduleDate(undefined);
      setRescheduleTime('');
      setIsRescheduleSuccessOpen(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Fehler beim Speichern der Terminverschiebung';
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const closeRescheduleSuccess = () => {
    setIsRescheduleSuccessOpen(false);
    setRescheduleSuccess(null);
    onRescheduleSuccessClose?.();
  };

  const handleSuccessAction = () => {
    successAction.onClick?.();
    closeRescheduleSuccess();
  };

  const handleSubmitCancel = async () => {
    if (!selectedAppointmentId) return;

    setActionLoading(true);
    setActionError('');
    try {
      const backendMode = getBackendMode();
      const appointment = appointments.find((apt) => apt.id === selectedAppointmentId);
      const cancelledId = selectedAppointmentId;
      const isExpert = actor === 'expert';

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const startTime = appointment ? parseISO(appointment.start_time) : new Date();
        const hoursUntilStart = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
        const refundAmount = hoursUntilStart >= 48 ? appointment?.total_price || 0 : 0;

        if (isExpert) {
          setActionMessage(
            refundAmount > 0
              ? `Termin abgesagt. Die Kund:in erhält €${refundAmount.toFixed(2)} zurück.`
              : 'Termin abgesagt. Da die Absage weniger als 48 Stunden vor dem Termin erfolgte, wird der Betrag nicht erstattet.'
          );
        } else {
          setActionMessage(
            refundAmount > 0
              ? `Termin storniert. Du erhältst €${refundAmount.toFixed(2)} zurück.`
              : 'Termin storniert. Da die Stornierung weniger als 48 Stunden vor dem Termin erfolgte, wird der Betrag nicht erstattet.'
          );
        }
        setIsCancelOpen(false);
        setSelectedAppointmentId(null);
        await onCancelled?.(cancelledId);
        setTimeout(() => setActionMessage(''), 5000);
        return;
      }

      const result = isExpert
        ? await cancelAppointmentByExpert(cancelledId, '')
        : await cancelAppointmentByClient(cancelledId, '');
      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Absage');
      }

      if (isExpert) {
        setActionMessage(
          result.refund_amount && result.refund_amount > 0
            ? `Termin abgesagt. Die Kund:in erhält €${result.refund_amount.toFixed(2)} zurück.`
            : 'Termin abgesagt. Da die Absage weniger als 48 Stunden vor dem Termin erfolgte, wird der Betrag nicht erstattet.'
        );
      } else {
        setActionMessage(
          result.refund_amount && result.refund_amount > 0
            ? `Termin storniert. Du erhältst €${result.refund_amount.toFixed(2)} zurück.`
            : 'Termin storniert. Da die Stornierung weniger als 48 Stunden vor dem Termin erfolgte, wird der Betrag nicht erstattet.'
        );
      }
      setIsCancelOpen(false);
      setSelectedAppointmentId(null);
      await onCancelled?.(cancelledId);
      setTimeout(() => setActionMessage(''), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Fehler bei der Absage';
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const clearActionMessage = useCallback(() => {
    setActionMessage('');
    setActionError('');
  }, []);

  const isFlowOpen =
    isRescheduleOpen ||
    isRescheduleConfirmOpen ||
    isRescheduleSuccessOpen ||
    isCancelOpen;

  const isOnlineFormat = (formatValue?: string) =>
    formatValue === 'online' || formatValue === 'Online';

  const dialogs = (
    <>
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
          <div className="px-4 sm:px-6 pt-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark">
                Kalender
              </DialogTitle>
              <DialogDescription className="font-body text-gray-500">
                Neuen Termin auswählen
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-4 sm:p-6 md:border-r border-gray-100 overflow-x-auto">
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={(date) => {
                  setRescheduleDate(date);
                  setRescheduleTime('');
                }}
                disabled={(date) => {
                  if (isBefore(date, startOfToday())) return true;
                  return !hasAvailabilityOnDate(date, expertAvailability, expertAbsences);
                }}
                locale={de}
                className="rounded-md w-full"
                modifiers={{
                  appointment: appointmentDates,
                  available: (date) =>
                    !isBefore(date, startOfToday()) &&
                    hasAvailabilityOnDate(date, expertAvailability, expertAbsences),
                }}
                modifiersClassNames={{
                  appointment: 'bg-primary-blue/15 font-semibold',
                  available: 'bg-primary-green/15',
                }}
              />
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 font-body">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-primary-green bg-primary-green/20" />
                  <span>Verfügbar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border-2 border-primary-blue bg-primary-blue/10" />
                  <span>Dein Termin</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-col">
              <h3 className="font-heading text-lg sm:text-xl font-bold text-text-dark mb-1">
                Zeitfenster auswählen
              </h3>
              <p className="font-body text-sm text-gray-500 mb-5">
                {rescheduleDate
                  ? format(rescheduleDate, 'd. MMM yyyy', { locale: de })
                  : 'Bitte verfügbares Datum wählen'}
              </p>

              {loadingAvailability ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
                </div>
              ) : !rescheduleDate ? (
                <p className="font-body text-sm text-gray-500 py-8 text-center">
                  Wähle zuerst einen verfügbaren Tag im Kalender.
                </p>
              ) : availableRescheduleSlots.length === 0 ? (
                <p className="font-body text-sm text-gray-500 py-8 text-center">
                  An diesem Tag sind keine freien Zeiten mehr verfügbar.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 flex-1 content-start">
                  {availableRescheduleSlots.map((slot) => {
                    const selected = rescheduleTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setRescheduleTime(slot)}
                        className={cn(
                          'rounded-xl border-2 px-4 py-3 text-sm font-body transition-colors',
                          selected
                            ? 'border-primary-green bg-primary-green/20 text-text-dark font-semibold'
                            : 'border-gray-200 bg-white text-text-dark hover:border-primary-blue'
                        )}
                      >
                        {slot} Uhr
                      </button>
                    );
                  })}
                </div>
              )}

              {actionError && isRescheduleOpen && (
                <p className="text-sm text-red-600 font-body mt-4">{actionError}</p>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsRescheduleOpen(false);
                setRescheduleDate(undefined);
                setRescheduleTime('');
                setSelectedAppointmentId(null);
              }}
              className="font-body border-2 rounded-xl py-5 sm:py-6 text-text-dark order-2 sm:order-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Abbrechen
            </Button>
            <Button
              onClick={handleContinueReschedule}
              disabled={!rescheduleDate || !rescheduleTime}
              className="font-body rounded-xl py-5 sm:py-6 bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 shadow-md order-1 sm:order-2"
            >
              Speichern & Weiter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRescheduleConfirmOpen} onOpenChange={setIsRescheduleConfirmOpen}>
        <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
          <div className="px-4 sm:px-6 pt-6 pb-2">
            <DialogHeader>
              <DialogTitle className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-text-dark text-center">
                Änderung überprüfen & bestätigen
              </DialogTitle>
              <DialogDescription className="sr-only">
                Vergleiche alten und neuen Termin und bestätige die Verschiebung.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-4 sm:px-6 py-5">
            <div className="relative rounded-2xl border-2 border-gray-200 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <div className="p-4 sm:p-5 sm:pr-6 border-b sm:border-b-0 sm:border-r border-gray-200">
                  <p className="font-body text-xs text-gray-500 mb-2">Alter Termin</p>
                  <p className="font-heading font-semibold text-gray-400 line-through mb-3 text-sm sm:text-base break-words">
                    {selectedAppointment
                      ? format(parseISO(selectedAppointment.start_time), 'EEE., d MMMM yyyy', {
                          locale: de,
                        })
                      : '–'}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-body text-primary-blue">
                    {isOnlineFormat(selectedAppointment?.offer.format) ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    <span className="underline">
                      {isOnlineFormat(selectedAppointment?.offer.format) ? 'Online' : 'Vor Ort'}
                    </span>
                  </div>
                  {selectedAppointment && (
                    <p className="mt-2 text-xs text-gray-400 font-body">
                      {format(parseISO(selectedAppointment.start_time), 'HH:mm', { locale: de })} Uhr
                    </p>
                  )}
                </div>

                <div className="p-4 sm:p-5 sm:pl-6 relative">
                  <div className="hidden sm:flex absolute -left-[18px] top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-primary-blue items-center justify-center shadow-sm z-10">
                    <ChevronRight className="w-4 h-4 text-primary-blue" />
                  </div>
                  <div className="flex sm:hidden justify-center mb-3">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-primary-blue flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-primary-blue rotate-90" />
                    </div>
                  </div>
                  <p className="font-body text-xs text-gray-500 mb-2">Neuer Termin</p>
                  <p className="font-heading font-semibold text-text-dark mb-3 text-sm sm:text-base break-words">
                    {rescheduleDate
                      ? format(rescheduleDate, 'EEE., d MMMM yyyy', { locale: de })
                      : '–'}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-body text-text-dark">
                    {isOnlineFormat(selectedAppointment?.offer.format) ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    <span>
                      {isOnlineFormat(selectedAppointment?.offer.format) ? 'Online' : 'Vor Ort'}
                    </span>
                  </div>
                  {rescheduleTime && (
                    <p className="mt-2 text-xs text-text-dark font-body font-semibold">
                      {rescheduleTime} Uhr
                    </p>
                  )}
                </div>
              </div>
            </div>

            {actionError && isRescheduleConfirmOpen && (
              <p className="text-sm text-red-600 font-body mt-4 text-center">{actionError}</p>
            )}
          </div>

          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleBackToRescheduleSelect}
              className="font-body border-2 rounded-xl py-5 sm:py-6 text-text-dark order-2 sm:order-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Zurück
            </Button>
            <Button
              onClick={handleSubmitReschedule}
              disabled={actionLoading}
              className="font-body rounded-xl py-5 sm:py-6 bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 shadow-md order-1 sm:order-2"
            >
              {actionLoading ? 'Wird verschoben…' : 'Termin verschieben'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRescheduleSuccessOpen} onOpenChange={(open) => !open && closeRescheduleSuccess()}>
        <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 gap-5">
          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-16 h-16 rounded-full bg-primary-green/25 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary-green" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark text-center">
                Termin erfolgreich verschoben
              </DialogTitle>
              <DialogDescription className="font-body text-gray-500 text-center">
                Dein neuer Termin ist am
              </DialogDescription>
            </DialogHeader>
            <p className="font-heading text-xl sm:text-2xl font-bold text-primary-blue mt-2 break-words">
              {rescheduleSuccess
                ? format(rescheduleSuccess.date, 'EEE., d MMMM yyyy', { locale: de })
                : '–'}
            </p>
          </div>

          {rescheduleSuccess && (
            <div className="rounded-xl bg-bg-light border border-gray-100 p-4 text-left">
              <div className="flex items-start gap-3">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage
                    src={rescheduleSuccess.appointment.expert?.avatar_url}
                    alt={rescheduleSuccess.appointment.expert?.full_name}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-heading">
                    {(rescheduleSuccess.appointment.expert?.full_name || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <p className="font-heading font-semibold text-text-dark leading-snug truncate">
                      {rescheduleSuccess.appointment.offer.title}
                    </p>
                    <p className="font-heading font-bold text-text-dark shrink-0 text-sm sm:text-base">
                      €{Number(rescheduleSuccess.appointment.total_price).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-body">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {format(rescheduleSuccess.date, 'd. MMM yyyy', { locale: de })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {rescheduleSuccess.time} Uhr
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {isOnlineFormat(rescheduleSuccess.appointment.offer.format) ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                      {isOnlineFormat(rescheduleSuccess.appointment.offer.format)
                        ? 'Online'
                        : 'Vor Ort'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {successAction.href ? (
            <Button
              asChild
              variant="outline"
              className="w-full font-body border-2 rounded-xl py-6 text-text-dark"
            >
              <Link href={successAction.href} onClick={handleSuccessAction}>
                <Home className="w-4 h-4 mr-2" />
                {successAction.label}
              </Link>
            </Button>
          ) : (
            <Button
              onClick={handleSuccessAction}
              variant="outline"
              className="w-full font-body border-2 rounded-xl py-6 text-text-dark"
            >
              {successAction.label}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 gap-5">
          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="font-heading text-xl sm:text-2xl font-bold text-text-dark text-center">
                {actor === 'expert' ? 'Termin wirklich absagen?' : 'Termin wirklich stornieren?'}
              </DialogTitle>
              <DialogDescription className="font-body text-gray-500 text-center max-w-sm mx-auto text-sm">
                {actor === 'expert'
                  ? 'Möchtest du diesen Termin wirklich absagen? Die Kund:in wird benachrichtigt. Diese Aktion kann nicht rückgängig gemacht werden.'
                  : 'Möchtest du diesen Termin wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedAppointment && (
            <div className="rounded-xl bg-bg-light border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage
                    src={
                      actor === 'expert'
                        ? selectedAppointment.client?.avatar_url
                        : selectedAppointment.expert?.avatar_url
                    }
                    alt={
                      actor === 'expert'
                        ? selectedAppointment.client?.full_name
                        : selectedAppointment.expert?.full_name
                    }
                  />
                  <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-heading">
                    {(
                      (actor === 'expert'
                        ? selectedAppointment.client?.full_name
                        : selectedAppointment.expert?.full_name) || '?'
                    )
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="font-heading font-semibold text-text-dark leading-snug truncate">
                        {selectedAppointment.offer.title}
                      </p>
                      {actor === 'expert' && selectedAppointment.client?.full_name ? (
                        <p className="text-xs text-gray-500 font-body mt-0.5 truncate">
                          {selectedAppointment.client.full_name}
                        </p>
                      ) : null}
                    </div>
                    <p className="font-heading font-bold text-text-dark shrink-0 text-sm sm:text-base">
                      €{Number(selectedAppointment.total_price).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-body">
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      {format(parseISO(selectedAppointment.start_time), 'd. MMM yyyy', { locale: de })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(selectedAppointment.start_time), 'HH:mm', { locale: de })} Uhr
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {isOnlineFormat(selectedAppointment.offer.format) ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                      {isOnlineFormat(selectedAppointment.offer.format) ? 'Online' : 'Vor Ort'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedAppointment &&
            (() => {
              const hoursUntilStart =
                (parseISO(selectedAppointment.start_time).getTime() - Date.now()) /
                (1000 * 60 * 60);
              const refundEligible = hoursUntilStart >= 48;

              if (actor === 'expert') {
                if (refundEligible) {
                  return (
                    <Alert className="border-primary-green/40 bg-primary-green/15">
                      <AlertDescription className="text-text-dark font-body text-sm text-left">
                        Du sagst rechtzeitig ab (mindestens 48 Stunden vorher) – der Betrag wird der
                        Kund:in vollständig erstattet.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return (
                  <Alert className="border-amber-300 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-900 font-body text-sm text-left">
                      Achtung: Der Termin liegt in weniger als 48 Stunden. Bei Absage wird der Betrag
                      der Kund:in nicht zurückerstattet.
                    </AlertDescription>
                  </Alert>
                );
              }

              if (refundEligible) {
                return (
                  <Alert className="border-primary-green/40 bg-primary-green/15">
                    <AlertDescription className="text-text-dark font-body text-sm text-left">
                      Du stornierst rechtzeitig (mindestens 48 Stunden vorher) – der Betrag wird dir vollständig erstattet.
                    </AlertDescription>
                  </Alert>
                );
              }

              return (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 font-body text-sm text-left">
                    Achtung: Dein Termin liegt in weniger als 48 Stunden. Wenn du jetzt stornierst, wird der Betrag nicht zurückerstattet.
                  </AlertDescription>
                </Alert>
              );
            })()}

          {actionError && isCancelOpen && (
            <p className="text-sm text-red-600 font-body text-center">{actionError}</p>
          )}

          <div
            className={cn(
              'grid gap-3 pt-1',
              actor === 'expert' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            )}
          >
            {actor === 'client' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const appointmentId = selectedAppointmentId;
                  setIsCancelOpen(false);
                  setActionError('');
                  if (appointmentId) {
                    await openReschedule(appointmentId);
                  }
                }}
                className="font-body border-2 rounded-xl py-5 sm:py-6 text-text-dark hover:bg-gray-50 order-2 sm:order-1 text-sm"
              >
                <CalendarClock className="w-4 h-4 mr-2 shrink-0" />
                Termin verschieben
              </Button>
            )}
            <Button
              onClick={handleSubmitCancel}
              disabled={actionLoading}
              className={cn(
                'font-body rounded-xl py-5 sm:py-6 bg-red-500 hover:bg-red-600 text-white text-sm',
                actor === 'client' && 'order-1 sm:order-2'
              )}
            >
              <Trash2 className="w-4 h-4 mr-2 shrink-0" />
              {actionLoading
                ? actor === 'expert'
                  ? 'Wird abgesagt…'
                  : 'Wird storniert…'
                : actor === 'expert'
                  ? 'Termin absagen'
                  : 'Termin stornieren'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  return {
    openReschedule,
    openCancel,
    actionMessage,
    actionError,
    clearActionMessage,
    dialogs,
    isFlowOpen,
  };
}
