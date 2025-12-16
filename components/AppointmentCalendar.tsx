'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Video, User } from 'lucide-react';
import { format, isSameDay, parseISO, startOfDay, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AppointmentDetailModal from './AppointmentDetailModal';

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
  expert?: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
  is_newly_accepted?: boolean;
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

  const loadAppointments = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Check if we're in mock mode
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        // Use mock data
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
        
        if (role === 'expert') {
          const { mockExpertAppointments } = await import('@/lib/backend/mock/data');
          setAppointments(mockExpertAppointments.map(apt => ({
            id: apt.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: apt.total_price,
            notes: apt.notes,
            client: apt.client,
            offer: apt.offer,
            is_newly_accepted: apt.is_newly_accepted,
          })));
        } else {
          const { mockClientBookingRequests } = await import('@/lib/backend/mock/data');
          setAppointments(mockClientBookingRequests.map(apt => ({
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
            .eq('expert_id', expertProfile.id)
            .gte('start_time', new Date().toISOString())
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

  const getUpcomingAppointments = () => {
    const today = startOfDay(new Date());
    return appointments
      .filter(apt => parseISO(apt.start_time) >= today)
      .slice(0, 5);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'confirmed') {
      return (
        <Badge className="bg-info-bg text-info-text border-none text-xs font-body">
          Bestätigt
        </Badge>
      );
    }
    if (status === 'requested' || status === 'pending') {
      return (
        <Badge variant="outline" className="text-xs font-body">
          <Clock className="w-3 h-3 mr-1" />
          Ausstehend
        </Badge>
      );
    }
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      completed: { label: 'Abgeschlossen', variant: 'secondary' },
      cancelled: { label: 'Abgesagt', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: 'Ausstehend', variant: 'outline' };
    return (
      <Badge variant={statusInfo.variant} className="text-xs font-body">
        {statusInfo.label}
      </Badge>
    );
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm', { locale: de });
  };

  const upcomingAppointments = getUpcomingAppointments();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar View */}
      <Card className="lg:col-span-2 border-2">
        <CardHeader>
          <div>
            <CardTitle className="font-heading text-xl">Kalender</CardTitle>
            <CardDescription className="font-body">
              Übersicht deiner kommenden Termine
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={de}
              className="rounded-md border"
            modifiers={{
              hasAppointment: (date) => getAppointmentsForDate(date).length > 0,
              hasNewlyAccepted: (date) => getAppointmentsForDate(date).some(apt => apt.status === 'confirmed' && apt.is_newly_accepted),
            }}
            modifiersClassNames={{
              hasAppointment: 'bg-primary-blue/10 font-semibold',
              hasNewlyAccepted: 'bg-primary-green/30 border-primary-green border-2 font-bold',
            }}
            />
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 font-body flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-blue/10 border border-primary-blue"></div>
                <span>Termin vorhanden</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-green/30 border-2 border-primary-green"></div>
                <span>Neu bestätigt</span>
              </div>
            </div>
          </div>

          {/* Selected Date Appointments */}
          {selectedDate && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-heading font-semibold text-lg mb-4">
                Termine am {format(selectedDate, 'EEEE, d. MMMM yyyy', { locale: de })}
              </h3>
              {getAppointmentsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500 font-body text-sm">Keine Termine an diesem Tag</p>
              ) : (
                <div className="space-y-3">
                  {getAppointmentsForDate(selectedDate).map((apt) => (
                    <div
                      key={apt.id}
                      onClick={() => {
                        setSelectedAppointmentId(apt.id);
                        setIsDetailModalOpen(true);
                      }}
                      className={`p-3 rounded-lg border-2 bg-white hover:border-primary-blue cursor-pointer transition-colors ${
                        apt.status === 'confirmed' && apt.is_newly_accepted
                          ? 'border-primary-green'
                          : apt.status === 'confirmed'
                          ? 'border-info-text/30'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-body font-semibold text-sm">
                              {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                            </span>
                          </div>
                          <p className="font-heading font-semibold text-sm mb-1">
                            {apt.offer.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {apt.offer.format === 'online' ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <MapPin className="w-3 h-3" />
                            )}
                            <span>{apt.offer.format === 'online' ? 'Online' : 'Vor Ort'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(apt.status)}
                          {role === 'client' && apt.expert && (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={apt.expert.avatar_url} />
                                <AvatarFallback>
                                  <User className="w-3 h-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-600 font-body">
                                {apt.expert.full_name}
                              </span>
                            </div>
                          )}
                          {role === 'expert' && apt.client && (
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={apt.client.avatar_url} />
                                <AvatarFallback>
                                  <User className="w-3 h-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-600 font-body">
                                {apt.client.full_name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Appointments List */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Kommende Termine</CardTitle>
          <CardDescription className="font-body">
            Nächste {upcomingAppointments.length} Termine
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : upcomingAppointments.length === 0 ? (
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
                  className={`p-3 rounded-lg border-2 bg-white hover:border-primary-blue cursor-pointer transition-colors ${
                    apt.status === 'confirmed' && apt.is_newly_accepted
                      ? 'border-primary-green'
                      : apt.status === 'confirmed'
                      ? 'border-info-text/30'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-heading font-semibold text-sm mb-1">
                        {apt.offer.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(parseISO(apt.start_time), 'd. MMM', { locale: de })} • {formatTime(apt.start_time)}
                        </span>
                      </div>
                      {role === 'client' && apt.expert && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{apt.expert.full_name}</span>
                        </div>
                      )}
                      {role === 'expert' && apt.client && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{apt.client.full_name}</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        />
      )}
    </div>
  );
}

