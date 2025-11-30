'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, Plus, Trash2, AlertCircle } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  client_name: string;
  offer_title: string;
}

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [newAvailability, setNewAvailability] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
  });

  useEffect(() => {
    if (userId) {
      loadExpertData();
    }
  }, [userId]);

  const loadExpertData = async () => {
    try {
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        setExpertProfileId(profile.id);
        await Promise.all([
          loadAppointments(profile.id),
          loadAvailability(profile.id)
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async (profileId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          profiles:client_id (
            full_name
          ),
          expert_offers:offer_id (
            title
          )
        `)
        .eq('expert_id', profileId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAppointments(data.map((apt: any) => ({
        id: apt.id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        client_name: apt.profiles?.full_name || 'Unbekannt',
        offer_title: apt.expert_offers?.title || 'Unbekannt',
      })));
    } catch (err: any) {
      console.error('Error loading appointments:', err);
    }
  };

  const loadAvailability = async (profileId: string) => {
    try {
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

  const handleAddAvailability = async () => {
    if (!expertProfileId) return;

    setError('');
    setSuccess('');

    try {
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

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt =>
      isSameDay(parseISO(apt.start_time), date)
    );
  };

  const getAvailabilityForDay = (dayOfWeek: number) => {
    return availability.filter(avail => avail.day_of_week === dayOfWeek);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-bg text-success-text';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-error-bg text-error-text';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const thisWeekAppointments = appointments.filter(apt => {
    const aptDate = parseISO(apt.start_time);
    const weekEnd = addDays(selectedWeekStart, 7);
    return aptDate >= selectedWeekStart && aptDate < weekEnd;
  });

  const todayAppointments = appointments.filter(apt =>
    isSameDay(parseISO(apt.start_time), new Date())
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Kalender & Verfügbarkeit
        </h1>
        <p className="text-gray-600 font-body">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-text-dark">Heute</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 font-body">
                <Clock className="w-4 h-4" />
                Keine Termine heute
              </div>
            ) : (
              <div className="space-y-2">
                {todayAppointments.map(apt => (
                  <div key={apt.id} className="text-sm font-body">
                    <div className="font-semibold text-text-dark">
                      {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                    </div>
                    <div className="text-gray-600">{apt.offer_title}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-text-dark">Diese Woche</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">{thisWeekAppointments.length}</p>
            <p className="text-sm text-gray-600 font-body">Termine</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-text-dark">Ausstehend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">
              {appointments.filter(a => a.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-600 font-body">Buchungsanfragen</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
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
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                    <div key={day.value} className="border rounded-lg p-3">
                      <div className="font-semibold text-text-dark font-body mb-2">{day.label}</div>
                      <div className="space-y-2">
                        {dayAvailability.map(avail => (
                          <div key={avail.id} className="flex items-center justify-between text-sm">
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

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-text-dark">Kommende Termine</CardTitle>
            <CardDescription className="font-body">Deine nächsten bestätigten Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.filter(a => a.status === 'confirmed').length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-body">Keine bestätigten Termine</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.filter(a => a.status === 'confirmed').slice(0, 5).map(apt => (
                  <div key={apt.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-text-dark font-body">{apt.offer_title}</div>
                      <Badge className={`${getStatusColor(apt.status)} border-none text-xs`}>
                        Bestätigt
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 font-body space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {format(parseISO(apt.start_time), 'dd. MMMM yyyy', { locale: de })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                      </div>
                      <div className="text-gray-700 mt-2">mit {apt.client_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
