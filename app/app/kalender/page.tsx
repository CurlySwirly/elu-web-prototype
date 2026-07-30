'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, AlertCircle, User, MapPin, Video, XCircle } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, isSameDay, parseISO, addMonths, subMonths, isWithinInterval, isAfter, isBefore, startOfWeek, addDays, endOfWeek, eachDayOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string;
  client?: {
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

const DAYS_OF_WEEK = [
  { value: 1, label: 'Montag' },
  { value: 2, label: 'Dienstag' },
  { value: 3, label: 'Mittwoch' },
  { value: 4, label: 'Donnerstag' },
  { value: 5, label: 'Freitag' },
  { value: 6, label: 'Samstag' },
  { value: 0, label: 'Sonntag' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

export default function ExpertCalendarPage() {
  const { userId } = useAuth();
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBlockedDayDialogOpen, setIsBlockedDayDialogOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [newAvailability, setNewAvailability] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
  });

  const [newBlockedDay, setNewBlockedDay] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  const loadExpertData = useCallback(async () => {
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
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
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 300));
        const { mockExpertAppointments } = await import('@/lib/backend/mock/data');
        setAppointments(mockExpertAppointments.map((apt: any) => ({
          id: apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          status: apt.status,
          total_price: apt.total_price,
          notes: apt.notes,
          client: apt.client,
          offer: apt.offer,
        })));
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          total_price,
          notes,
          profiles:client_id (
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

      setAppointments(data.map((apt: any) => ({
        id: apt.id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        total_price: apt.total_price,
        notes: apt.notes,
        client: {
          full_name: apt.profiles?.full_name || '',
          avatar_url: apt.profiles?.avatar_url || '',
          phone: apt.profiles?.phone || '',
        },
        offer: {
          title: apt.expert_offers?.title || '',
          format: apt.expert_offers?.format || '',
        },
      })));
    } catch (err: any) {
      console.error('Error loading appointments:', err);
    }
  };

  const loadAvailability = async (profileId: string) => {
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
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
  };

  const loadBlockedDays = async (profileId: string) => {
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
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
  };

  const handleAddBlockedDay = async () => {
    if (!expertProfileId) return;

    setError('');
    setSuccess('');

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        const newId = String(Date.now());
        setBlockedDays([...blockedDays, {
          id: newId,
          start_date: newBlockedDay.start_date,
          end_date: newBlockedDay.end_date,
          reason: newBlockedDay.reason,
        }]);
        setSuccess('Gesperrter Tag hinzugefügt');
        setIsBlockedDayDialogOpen(false);
        setNewBlockedDay({
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: format(new Date(), 'yyyy-MM-dd'),
          reason: '',
        });
        setTimeout(() => setSuccess(''), 3000);
        return;
      }

      const { error } = await supabase
        .from('expert_absences')
        .insert({
          expert_profile_id: expertProfileId,
          start_date: newBlockedDay.start_date,
          end_date: newBlockedDay.end_date,
          reason: newBlockedDay.reason || null,
        });

      if (error) throw error;

      setSuccess('Gesperrter Tag hinzugefügt');
      await loadBlockedDays(expertProfileId);
      setIsBlockedDayDialogOpen(false);
      setNewBlockedDay({
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteBlockedDay = async (blockedDayId: string) => {
    if (!confirm('Möchtest du diesen gesperrten Tag wirklich löschen?')) return;

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        setBlockedDays(blockedDays.filter(day => day.id !== blockedDayId));
        setSuccess('Gesperrter Tag gelöscht');
        setTimeout(() => setSuccess(''), 3000);
        return;
      }

      const { error } = await supabase
        .from('expert_absences')
        .delete()
        .eq('id', blockedDayId);

      if (error) throw error;

      if (expertProfileId) {
        await loadBlockedDays(expertProfileId);
      }
      setSuccess('Gesperrter Tag gelöscht');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isDateBlocked = (date: Date) => {
    return blockedDays.some(blocked => {
      const start = parseISO(blocked.start_date);
      const end = parseISO(blocked.end_date);
      return isWithinInterval(date, { start, end });
    });
  };

  const handleAddAvailability = async () => {
    if (!expertProfileId) return;

    setError('');
    setSuccess('');

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        const newId = String(Date.now());
        setAvailability([...availability, {
          id: newId,
          day_of_week: newAvailability.day_of_week,
          start_time: newAvailability.start_time,
          end_time: newAvailability.end_time,
          is_available: true,
        }]);
        setSuccess('Verfügbarkeit hinzugefügt');
        setIsDialogOpen(false);
        setTimeout(() => setSuccess(''), 3000);
        return;
      }

      const { error } = await supabase
        .from('expert_availability')
        .insert({
          expert_profile_id: expertProfileId,
          day_of_week: newAvailability.day_of_week,
          start_time: newAvailability.start_time,
          end_time: newAvailability.end_time,
          is_available: true,
        });

      if (error) throw error;

      setSuccess('Verfügbarkeit hinzugefügt');
      await loadAvailability(expertProfileId);
      setIsDialogOpen(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (!confirm('Möchtest du diese Verfügbarkeit wirklich löschen?')) return;

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        setAvailability(availability.filter(avail => avail.id !== availabilityId));
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
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = startOfDay(parseISO(apt.start_time));
      return isSameDay(aptDate, date);
    });
  };

  const getAvailabilityForDay = (dayOfWeek: number) => {
    return availability.filter(avail => avail.day_of_week === dayOfWeek);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-bg text-success-text';
      case 'requested':
      case 'pending': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-error-bg text-error-text';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Gebucht';
      case 'requested':
      case 'pending': return 'Ausstehend';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const filterByStatus = (status?: string) => {
    if (!status) return appointments;
    return appointments.filter(apt => apt.status === status);
  };

  const upcomingAppointments = appointments
    .filter(apt => parseISO(apt.start_time) >= startOfDay(new Date()))
    .slice(0, 5);

  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');

  const getWeekDays = () => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  };

  const getAppointmentsForDaySorted = (date: Date) => {
    return getAppointmentsForDate(date).sort((a, b) => {
      return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return startOfWeek(newDate, { weekStartsOn: 1 });
    });
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
          Kalender & Verfügbarkeit
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
          Verwalte deine Termine und wöchentliche Verfügbarkeit
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-base text-gray-600">Gebucht</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">{confirmedAppointments.length}</p>
            <p className="text-sm text-gray-600 font-body">Termine</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-base text-gray-600">Bevorstehend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">
              {upcomingAppointments.length}
            </p>
            <p className="text-sm text-gray-600 font-body">Nächste Termine</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-base text-gray-600">Diese Woche</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">
              {appointments.filter(apt => {
                const aptDate = parseISO(apt.start_time);
                const today = startOfDay(new Date());
                const weekEnd = new Date(today);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return aptDate >= today && aptDate < weekEnd;
              }).length}
            </p>
            <p className="text-sm text-gray-600 font-body">Termine</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-base text-gray-600">Verfügbarkeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">{availability.length}</p>
            <p className="text-sm text-gray-600 font-body">Zeitslots</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly View */}
      <Card className="border-2 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl">Wochenübersicht</CardTitle>
              <CardDescription className="font-body">
                {format(currentWeekStart, 'd. MMMM', { locale: de })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'd. MMMM yyyy', { locale: de })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
                className="font-body"
              >
                ← Vorherige Woche
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="font-body"
              >
                Diese Woche
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
                className="font-body"
              >
                Nächste Woche →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {getWeekDays().map((day) => {
              const dayAppointments = getAppointmentsForDaySorted(day);
              const isToday = isSameDay(day, new Date());
              const isBlocked = isDateBlocked(day);
              
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-2 rounded-lg p-3 min-h-[400px]",
                    isToday ? "border-primary-blue bg-primary-blue/5" : "border-gray-200",
                    isBlocked && "bg-gray-100 opacity-60"
                  )}
                >
                  <div className="mb-3 pb-2 border-b">
                    <div className="font-heading font-semibold text-lg text-text-dark">
                      {format(day, 'EEEE', { locale: de })}
                    </div>
                    <div className={cn(
                      "text-sm font-body",
                      isToday ? "text-primary-blue font-semibold" : "text-gray-600"
                    )}>
                      {format(day, 'd. MMMM', { locale: de })}
                    </div>
                    {isBlocked && (
                      <Badge className="mt-2 bg-gray-400 text-white text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        Gesperrt
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayAppointments.length === 0 ? (
                      <p className="text-xs text-gray-400 font-body text-center py-4">
                        {isBlocked ? 'Gesperrt' : 'Keine Termine'}
                      </p>
                    ) : (
                      dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => {
                            setSelectedAppointmentId(apt.id);
                            setIsDetailModalOpen(true);
                          }}
                          className={cn(
                            "p-2 rounded border-2 cursor-pointer transition-all hover:shadow-md",
                            apt.status === 'confirmed'
                              ? 'bg-primary-green/10 border-primary-green'
                              : apt.status === 'requested' || apt.status === 'pending'
                              ? 'bg-red-50 border-red-300'
                              : 'bg-gray-50 border-gray-200'
                          )}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-xs font-semibold font-body text-gray-700">
                                {format(parseISO(apt.start_time), 'HH:mm', { locale: de })} - {format(parseISO(apt.end_time), 'HH:mm', { locale: de })}
                              </span>
                            </div>
                            <Badge className={`${getStatusColor(apt.status)} border-none text-xs px-1 py-0`}>
                              {getStatusLabel(apt.status).substring(0, 3)}
                            </Badge>
                          </div>
                          <p className="text-xs font-heading font-semibold text-text-dark mb-1 line-clamp-2">
                            {apt.offer.title}
                          </p>
                          {apt.client && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <User className="w-2.5 h-2.5" />
                              <span className="font-body truncate">{apt.client.full_name}</span>
                            </div>
                          )}
                          {apt.offer.format && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              {apt.offer.format === 'online' ? (
                                <Video className="w-2.5 h-2.5" />
                              ) : (
                                <MapPin className="w-2.5 h-2.5" />
                              )}
                              <span className="font-body">{apt.offer.format === 'online' ? 'Online' : 'Vor Ort'}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-gray-600 font-body flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary-green/10 border-2 border-primary-green"></div>
              <span>Gebucht</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-100 border-2 border-gray-400"></div>
              <span>Gesperrt</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Upcoming Appointments */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Kommende Termine</CardTitle>
            <CardDescription className="font-body">
              Nächste {upcomingAppointments.length} Termine
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-gray-500 font-body text-sm text-center py-8">
                Keine kommenden Termine
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => {
                      setSelectedAppointmentId(apt.id);
                      setIsDetailModalOpen(true);
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 bg-white hover:border-primary-blue cursor-pointer transition-colors",
                      apt.status === 'confirmed'
                        ? 'border-primary-green'
                        : apt.status === 'requested' || apt.status === 'pending'
                        ? 'border-red-300'
                        : 'border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-sm mb-1">
                          {apt.offer.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {format(parseISO(apt.start_time), 'd. MMM', { locale: de })} • {format(parseISO(apt.start_time), 'HH:mm', { locale: de })}
                          </span>
                        </div>
                        {apt.client && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            <span>{apt.client.full_name}</span>
                          </div>
                        )}
                      </div>
                      <Badge className={`${getStatusColor(apt.status)} border-none text-xs`}>
                        {getStatusLabel(apt.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bookings Tabs */}
      <Card className="border-2 mb-6">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Buchungen</CardTitle>
          <CardDescription className="font-body">Verwalte deine gebuchten Termine</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="confirmed" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="confirmed" className="font-body">
                Gebucht ({filterByStatus('confirmed').length})
              </TabsTrigger>
              <TabsTrigger value="all" className="font-body">
                Alle ({appointments.length})
              </TabsTrigger>
            </TabsList>

            {['confirmed', 'all'].map((tabValue) => (
              <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                {filterByStatus(tabValue === 'all' ? undefined : tabValue).map((appointment) => (
                  <Card key={appointment.id} className="border-2 hover:border-primary-blue transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {appointment.client && (
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={appointment.client.avatar_url} alt={appointment.client.full_name} />
                              <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                                {appointment.client.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div className="flex-1">
                            <CardTitle className="font-heading text-xl text-text-dark mb-1">
                              {appointment.offer.title}
                            </CardTitle>
                            <CardDescription className="font-body">
                              {appointment.client ? `Gebucht von ${appointment.client.full_name}` : 'Unbekannt'}
                            </CardDescription>

                            <div className="flex flex-wrap gap-3 mt-3">
                              <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                                <CalendarIcon className="w-4 h-4" />
                                {format(new Date(appointment.start_time), 'dd. MMMM yyyy', { locale: de })}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                                <Clock className="w-4 h-4" />
                                {format(new Date(appointment.start_time), 'HH:mm')} - {format(new Date(appointment.end_time), 'HH:mm')}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                                {appointment.offer.format === 'online' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                {appointment.offer.format === 'online' ? 'Online' : 'Vor Ort'}
                              </div>
                            </div>

                            {appointment.notes && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 font-body">{appointment.notes}</p>
                              </div>
                            )}

                            {appointment.client?.phone && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 font-body">
                                <User className="w-4 h-4" />
                                {appointment.client.phone}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-2">
                          <Badge className={`${getStatusColor(appointment.status)} border-none font-body`}>
                            {getStatusLabel(appointment.status)}
                          </Badge>
                          <p className="text-xl font-heading font-bold text-text-dark">
                            €{appointment.total_price.toFixed(2)}
                          </p>
                        </div>
                      </div>

                    </CardHeader>
                  </Card>
                ))}

                {filterByStatus(tabValue === 'all' ? undefined : tabValue).length === 0 && (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-body">
                      Keine Termine in dieser Kategorie
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Availability Management */}
      <Card className="border-2 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl text-text-dark">Wöchentliche Verfügbarkeit</CardTitle>
              <CardDescription className="font-body">Lege deine regelmäßigen Arbeitszeiten fest</CardDescription>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              <Plus className="w-4 h-4 mr-2" />
              Hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-body mb-4">Noch keine Verfügbarkeiten angelegt</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
                className="font-body"
              >
                Erste Verfügbarkeit anlegen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(day => {
                const dayAvailability = getAvailabilityForDay(day.value);
                if (dayAvailability.length === 0) return null;

                return (
                  <div key={day.value} className="border-2 rounded-lg p-4 bg-gray-50">
                    <div className="font-semibold text-text-dark font-heading mb-3 text-lg">{day.label}</div>
                    <div className="space-y-2">
                      {dayAvailability.map(avail => (
                        <div key={avail.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <span className="font-body text-gray-700">
                            {avail.start_time.substring(0, 5)} - {avail.end_time.substring(0, 5)} Uhr
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAvailability(avail.id)}
                            className="text-error-text hover:bg-error-bg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Days Management */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading text-xl text-text-dark">Gesperrte Tage</CardTitle>
              <CardDescription className="font-body">
                Markiere Tage als gesperrt (z.B. Urlaub, Krankheit)
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsBlockedDayDialogOpen(true)}
              size="sm"
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Tag sperren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {blockedDays.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-body mb-4">Noch keine gesperrten Tage</p>
              <Button
                onClick={() => setIsBlockedDayDialogOpen(true)}
                variant="outline"
                className="font-body"
              >
                Ersten Tag sperren
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {blockedDays.map((blocked) => {
                const startDate = parseISO(blocked.start_date);
                const endDate = parseISO(blocked.end_date);
                const isRange = !isSameDay(startDate, endDate);
                
                return (
                  <div key={blocked.id} className="flex items-center justify-between p-3 border-2 rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-gray-600" />
                        <span className="font-heading font-semibold text-text-dark">
                          {isRange 
                            ? `${format(startDate, 'dd. MMM yyyy', { locale: de })} - ${format(endDate, 'dd. MMM yyyy', { locale: de })}`
                            : format(startDate, 'dd. MMMM yyyy', { locale: de })
                          }
                        </span>
                      </div>
                      {blocked.reason && (
                        <p className="text-sm text-gray-600 font-body ml-6">
                          {blocked.reason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBlockedDay(blocked.id)}
                      className="text-error-text hover:bg-error-bg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Availability Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-text-dark">
              Verfügbarkeit hinzufügen
            </DialogTitle>
            <DialogDescription className="font-body">
              Lege einen wiederkehrenden Zeitslot fest
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="font-body">Wochentag</Label>
              <Select
                value={newAvailability.day_of_week.toString()}
                onValueChange={(value) => setNewAvailability({ ...newAvailability, day_of_week: parseInt(value) })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map(day => (
                    <SelectItem key={day.value} value={day.value.toString()} className="font-body">
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-body">Von</Label>
                <Select
                  value={newAvailability.start_time}
                  onValueChange={(value) => setNewAvailability({ ...newAvailability, start_time: value })}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(time => (
                      <SelectItem key={time} value={time} className="font-body">
                        {time} Uhr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-body">Bis</Label>
                <Select
                  value={newAvailability.end_time}
                  onValueChange={(value) => setNewAvailability({ ...newAvailability, end_time: value })}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(time => (
                      <SelectItem key={time} value={time} className="font-body">
                        {time} Uhr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-body">
              Abbrechen
            </Button>
            <Button
              onClick={handleAddAvailability}
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Blocked Day Dialog */}
      <Dialog open={isBlockedDayDialogOpen} onOpenChange={setIsBlockedDayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-text-dark">
              Tag sperren
            </DialogTitle>
            <DialogDescription className="font-body">
              Markiere einen Tag oder Zeitraum als gesperrt (z.B. Urlaub, Krankheit)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-body">Von</Label>
                <input
                  type="date"
                  value={newBlockedDay.start_date}
                  onChange={(e) => setNewBlockedDay({ ...newBlockedDay, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-body"
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div>
                <Label className="font-body">Bis</Label>
                <input
                  type="date"
                  value={newBlockedDay.end_date}
                  onChange={(e) => setNewBlockedDay({ ...newBlockedDay, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-body"
                  min={newBlockedDay.start_date}
                />
              </div>
            </div>

            <div>
              <Label className="font-body">Grund (optional)</Label>
              <input
                type="text"
                value={newBlockedDay.reason}
                onChange={(e) => setNewBlockedDay({ ...newBlockedDay, reason: e.target.value })}
                placeholder="z.B. Urlaub, Krankheit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-body"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsBlockedDayDialogOpen(false);
              setNewBlockedDay({
                start_date: format(new Date(), 'yyyy-MM-dd'),
                end_date: format(new Date(), 'yyyy-MM-dd'),
                reason: '',
              });
            }} className="font-body">
              Abbrechen
            </Button>
            <Button
              onClick={handleAddBlockedDay}
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              Sperren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        />
      )}
    </div>
  );
}
