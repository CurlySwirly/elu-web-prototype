'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, MapPin, Video, Check, X, AlertCircle, User, Eye, CalendarClock, Trash2 } from 'lucide-react';
import { format, parseISO, isBefore, addHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { confirmAppointment, cancelAppointmentByExpert, cancelAppointmentByClient } from '@/lib/services/booking';
import AppointmentDetailModal from '@/components/AppointmentDetailModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
}

export default function AppointmentsPage() {
  const { userId, role } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadAppointments = useCallback(async () => {
    try {
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
        const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
        
        if (backendMode === 'mock') {
          // Mock client appointments
          await new Promise(resolve => setTimeout(resolve, 300));
          setAppointments([
            {
              id: 'apt-client-upcoming-1',
              start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
              status: 'confirmed',
              total_price: 85.00,
              expert: {
                full_name: 'Sarah Müller',
                avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
              },
              offer: {
                title: 'Erstberatung & Analyse',
                format: 'Präsenz',
              },
            },
            {
              id: 'apt-client-upcoming-2',
              start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
              status: 'confirmed',
              total_price: 75.00,
              expert: {
                full_name: 'Michael Schmidt',
                avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
              },
              offer: {
                title: 'Personal Training Session',
                format: 'online',
              },
            },
            {
              id: 'apt-client-upcoming-3',
              start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
              status: 'requested',
              total_price: 65.00,
              expert: {
                full_name: 'Julia Weber',
                avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
              },
              offer: {
                title: 'Yoga & Meditation Session',
                format: 'Präsenz',
              },
            },
            {
              id: 'apt-client-upcoming-4',
              start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
              status: 'confirmed',
              total_price: 90.00,
              expert: {
                full_name: 'Thomas Fischer',
                avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg',
              },
              offer: {
                title: 'Sportphysiotherapie',
                format: 'Präsenz',
              },
            },
          ]);
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

  const handleConfirmAppointment = async (appointmentId: string) => {
    setError('');
    setSuccess('');

    try {
      const result = await confirmAppointment(appointmentId);

      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Bestätigung');
      }

      setSuccess('Termin bestätigt! Der Client wurde benachrichtigt.');
      await loadAppointments();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectAppointment = async (appointmentId: string) => {
    if (!confirm('Möchtest du diesen Termin wirklich ablehnen? Der Client erhält eine vollständige Rückerstattung.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await cancelAppointmentByExpert(
        appointmentId,
        'Termin vom Expert abgelehnt'
      );

      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Ablehnung');
      }

      setSuccess(`Termin abgelehnt. Der Client erhält €${result.refund_amount?.toFixed(2) || '0.00'} zurück.`);
      await loadAppointments();

      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-primary-green/20 text-text-dark';
      case 'requested': return 'bg-info-bg text-info-text';
      case 'pending': return 'bg-info-bg text-info-text';
      case 'completed': return 'bg-info-bg text-info-text';
      case 'cancelled_by_client': return 'bg-gray-100 text-gray-600';
      case 'cancelled_by_expert': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Bestätigt';
      case 'requested': return 'Ausstehend';
      case 'pending': return 'Ausstehend';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled_by_client': return 'Vom Client storniert';
      case 'cancelled_by_expert': return 'Storniert';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  };

  const filterByStatus = (status?: string) => {
    if (!status) return appointments;
    if (status === 'requested') {
      return appointments.filter(apt => apt.status === 'requested' || apt.status === 'pending');
    }
    return appointments.filter(apt => apt.status === status);
  };

  const handleOpenDetail = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedAppointmentId(null);
    setIsDetailModalOpen(false);
    loadAppointments();
  };

  const handleRequestReschedule = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setRescheduleReason('');
    setIsRescheduleDialogOpen(true);
  };

  const handleSubmitReschedule = async () => {
    if (!selectedAppointmentId) return;

    setActionLoading(true);
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess('Umbuchungsanfrage gesendet! Die Expert:in wird dich kontaktieren.');
        setIsRescheduleDialogOpen(false);
        setSelectedAppointmentId(null);
        setRescheduleReason('');
        setTimeout(() => setSuccess(''), 5000);
        setActionLoading(false);
        return;
      }

      // In real implementation, this would create a reschedule request
      // For now, we'll just show a success message
      setSuccess('Umbuchungsanfrage gesendet! Die Expert:in wird dich kontaktieren.');
      setIsRescheduleDialogOpen(false);
      setSelectedAppointmentId(null);
      setRescheduleReason('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Senden der Umbuchungsanfrage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setCancelReason('');
    setIsCancelDialogOpen(true);
  };

  const handleSubmitCancel = async () => {
    if (!selectedAppointmentId) return;

    setActionLoading(true);
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const appointment = appointments.find(apt => apt.id === selectedAppointmentId);
        const startTime = appointment ? parseISO(appointment.start_time) : new Date();
        const hoursUntilStart = (startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
        const refundAmount = hoursUntilStart > 24 ? appointment?.total_price || 0 : 0;
        
        setSuccess(
          refundAmount > 0
            ? `Termin storniert. Du erhältst €${refundAmount.toFixed(2)} zurück (mehr als 24h vor Termin).`
            : 'Termin storniert. Keine Rückerstattung möglich (weniger als 24h vor Termin).'
        );
        setIsCancelDialogOpen(false);
        setSelectedAppointmentId(null);
        setCancelReason('');
        await loadAppointments();
        setTimeout(() => setSuccess(''), 5000);
        setActionLoading(false);
        return;
      }

      const result = await cancelAppointmentByClient(selectedAppointmentId, cancelReason);

      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Stornierung');
      }

      const refundMessage = result.refund_amount && result.refund_amount > 0
        ? `Termin storniert. Du erhältst €${result.refund_amount.toFixed(2)} zurück.`
        : 'Termin storniert. Keine Rückerstattung möglich (weniger als 24h vor Termin).';

      setSuccess(refundMessage);
      setIsCancelDialogOpen(false);
      setSelectedAppointmentId(null);
      setCancelReason('');
      await loadAppointments();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Fehler bei der Stornierung');
    } finally {
      setActionLoading(false);
    }
  };

  const canCancel = (appointment: Appointment) => {
    if (appointment.status !== 'confirmed' && appointment.status !== 'requested') {
      return false;
    }
    return true;
  };

  const canReschedule = (appointment: Appointment) => {
    if (appointment.status !== 'confirmed') {
      return false;
    }
    const startTime = parseISO(appointment.start_time);
    return isBefore(new Date(), startTime);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
            <p className="text-gray-600 font-body">Lädt Termine...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          {role === 'expert' ? 'Meine Buchungen' : 'Meine Termine'}
        </h1>
        <p className="text-gray-600 font-body">
          {role === 'expert'
            ? 'Verwalte deine eingehenden Buchungsanfragen und Termine'
            : 'Übersicht deiner gebuchten Wellness-Sessions'
          }
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-body">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-primary-green bg-primary-green/20">
          <AlertDescription className="text-text-dark font-body">{success}</AlertDescription>
        </Alert>
      )}

      {appointments.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-body mb-4">
              {role === 'expert'
                ? 'Du hast noch keine Buchungen erhalten.'
                : 'Du hast noch keine Termine gebucht.'
              }
            </p>
            <p className="text-sm text-gray-500 font-body">
              {role === 'expert'
                ? 'Sobald Klient:innen deine Angebote buchen, erscheinen sie hier.'
                : 'Finde jetzt Expert:innen und buche deine erste Session!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="font-body">
              Alle ({appointments.length})
            </TabsTrigger>
            <TabsTrigger value="requested" className="font-body">
              Ausstehend ({filterByStatus('requested').length})
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="font-body">
              Bestätigt ({filterByStatus('confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="font-body">
              Abgeschlossen ({filterByStatus('completed').length})
            </TabsTrigger>
          </TabsList>

          {['all', 'requested', 'confirmed', 'completed'].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              {filterByStatus(tabValue === 'all' ? undefined : tabValue).map((appointment) => (
                <Card key={appointment.id} className="border-2 hover:border-primary-blue transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={role === 'expert' ? appointment.client?.avatar_url : appointment.expert?.avatar_url}
                            alt={role === 'expert' ? appointment.client?.full_name : appointment.expert?.full_name}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                            {role === 'expert'
                              ? appointment.client?.full_name.split(' ').map(n => n[0]).join('') || ''
                              : appointment.expert?.full_name.split(' ').map(n => n[0]).join('') || ''
                            }
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <CardTitle className="font-heading text-xl text-text-dark mb-1">
                            {appointment.offer.title}
                          </CardTitle>
                          <CardDescription className="font-body">
                            {role === 'expert'
                              ? `Gebucht von ${appointment.client?.full_name || 'Unbekannt'}`
                              : `mit ${appointment.expert?.full_name || 'Unbekannt'}`
                            }
                          </CardDescription>

                          <div className="flex flex-wrap gap-3 mt-3">
                            <div className="flex items-center gap-1 text-sm text-gray-600 font-body">
                              <Calendar className="w-4 h-4" />
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

                          {role === 'expert' && appointment.client?.phone && (
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
                          €{appointment.total_price}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      {role === 'expert' && (appointment.status === 'requested' || appointment.status === 'pending') ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleConfirmAppointment(appointment.id)}
                            className="flex-1 bg-primary-green text-text-dark hover:bg-primary-green/80 font-body"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Bestätigen
                          </Button>
                          <Button
                            onClick={() => handleRejectAppointment(appointment.id)}
                            variant="outline"
                            className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-100 font-body"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Ablehnen
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleOpenDetail(appointment.id)}
                          variant="outline"
                          className="w-full font-body"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Details anzeigen
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}

              {filterByStatus(tabValue === 'all' ? undefined : tabValue).length === 0 && (
                <Card className="border-2">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-body">
                      Keine Termine in dieser Kategorie
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <AppointmentDetailModal
        appointmentId={selectedAppointmentId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetail}
        userRole={role as 'client' | 'expert'}
      />

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent className="font-body">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Termin umbuchen</DialogTitle>
            <DialogDescription className="font-body">
              Bitte teile der Expert:in mit, wann du den Termin gerne verschieben möchtest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-reason" className="font-body">
                Gewünschter neuer Termin / Nachricht
              </Label>
              <Textarea
                id="reschedule-reason"
                placeholder="z.B. Bitte verschieben auf nächste Woche, Donnerstag Nachmittag..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={4}
                className="font-body"
              />
            </div>
            <Alert className="border-info-text bg-info-bg">
              <AlertCircle className="h-4 w-4 text-info-text" />
              <AlertDescription className="text-info-text font-body text-sm">
                Die Expert:in wird deine Anfrage prüfen und dich kontaktieren.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRescheduleDialogOpen(false);
                setRescheduleReason('');
                setSelectedAppointmentId(null);
              }}
              className="font-body"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmitReschedule}
              disabled={actionLoading || !rescheduleReason.trim()}
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
            >
              {actionLoading ? 'Wird gesendet...' : 'Anfrage senden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="font-body">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Termin stornieren</DialogTitle>
            <DialogDescription className="font-body">
              Möchtest du diesen Termin wirklich stornieren?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAppointmentId && (() => {
              const appointment = appointments.find(apt => apt.id === selectedAppointmentId);
              if (!appointment) return null;
              const startTime = parseISO(appointment.start_time);
              const hoursUntilStart = (startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);
              const refundEligible = hoursUntilStart > 24;
              
              return (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="font-body text-gray-600">Termin</span>
                      <span className="font-body font-semibold text-text-dark">
                        {format(startTime, 'd. MMMM yyyy, HH:mm', { locale: de })} Uhr
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-gray-600">Preis</span>
                      <span className="font-body font-semibold text-text-dark">
                        €{appointment.total_price.toFixed(2)}
                      </span>
                    </div>
                    {refundEligible ? (
                      <Alert className="border-primary-green bg-primary-green/20 mt-3">
                        <AlertDescription className="text-text-dark font-body text-sm">
                          Du erhältst eine vollständige Rückerstattung, da die Stornierung mehr als 24 Stunden vor dem Termin erfolgt.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-gray-300 bg-gray-50 mt-3">
                        <AlertDescription className="text-gray-700 font-body text-sm">
                          Keine Rückerstattung möglich, da die Stornierung weniger als 24 Stunden vor dem Termin erfolgt.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason" className="font-body">
                      Grund (optional)
                    </Label>
                    <Textarea
                      id="cancel-reason"
                      placeholder="Warum möchtest du den Termin stornieren?"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className="font-body"
                    />
                  </div>
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setCancelReason('');
                setSelectedAppointmentId(null);
              }}
              className="font-body"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmitCancel}
              disabled={actionLoading}
              variant="destructive"
              className="font-body"
            >
              {actionLoading ? 'Wird storniert...' : 'Termin stornieren'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
