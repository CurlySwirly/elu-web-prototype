'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Euro,
  Building2,
  AlertCircle,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AppointmentDetailModalProps {
  appointmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'client' | 'expert';
}

interface AppointmentDetail {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string;
  room_booking_id?: string;
  client?: {
    full_name: string;
    avatar_url: string;
    phone?: string;
    email?: string;
  };
  expert?: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
    description?: string;
  };
  room_booking?: {
    id: string;
    room: {
      name: string;
      address?: string;
      city?: string;
    };
    provider: {
      business_name: string;
    };
  };
}

export default function AppointmentDetailModal({
  appointmentId,
  isOpen,
  onClose,
  userRole
}: AppointmentDetailModalProps) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAppointmentDetails = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          total_price,
          notes,
          room_booking_id,
          profiles:client_id (
            full_name,
            avatar_url,
            phone,
            email
          ),
          expert_profiles:expert_id (
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          expert_offers:offer_id (
            title,
            format,
            description
          ),
          room_bookings:room_booking_id (
            id,
            rooms:room_id (
              name,
              address,
              city
            ),
            provider_profiles:room_provider_id (
              business_name
            )
          )
        `)
        .eq('id', appointmentId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const expertProfiles = Array.isArray(data.expert_profiles)
          ? data.expert_profiles[0]
          : data.expert_profiles;
        const expertProfile = Array.isArray(expertProfiles?.profiles)
          ? expertProfiles?.profiles[0]
          : expertProfiles?.profiles;

        const roomBooking = Array.isArray(data.room_bookings)
          ? data.room_bookings[0]
          : data.room_bookings;

        const room = Array.isArray(roomBooking?.rooms)
          ? roomBooking?.rooms[0]
          : roomBooking?.rooms;

        const provider = Array.isArray(roomBooking?.provider_profiles)
          ? roomBooking?.provider_profiles[0]
          : roomBooking?.provider_profiles;

        const clientProfile = Array.isArray(data.profiles)
          ? data.profiles[0]
          : data.profiles;

        setAppointment({
          id: data.id,
          start_time: data.start_time,
          end_time: data.end_time,
          status: data.status,
          total_price: data.total_price,
          notes: data.notes,
          room_booking_id: data.room_booking_id,
          client: {
            full_name: clientProfile?.full_name || '',
            avatar_url: clientProfile?.avatar_url || '',
            phone: clientProfile?.phone || '',
            email: clientProfile?.email || '',
          },
          expert: {
            full_name: expertProfile?.full_name || '',
            avatar_url: expertProfile?.avatar_url || '',
          },
          offer: {
            title: (Array.isArray(data.expert_offers) ? data.expert_offers[0] : data.expert_offers)?.title || '',
            format: (Array.isArray(data.expert_offers) ? data.expert_offers[0] : data.expert_offers)?.format || '',
            description: (Array.isArray(data.expert_offers) ? data.expert_offers[0] : data.expert_offers)?.description || '',
          },
          room_booking: roomBooking ? {
            id: roomBooking.id,
            room: {
              name: room?.name || '',
              address: room?.address || '',
              city: room?.city || '',
            },
            provider: {
              business_name: provider?.business_name || '',
            }
          } : undefined
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (appointmentId && isOpen) {
      loadAppointmentDetails();
    }
  }, [appointmentId, isOpen, loadAppointmentDetails]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success-bg text-success-text">Bestätigt</Badge>;
      case 'requested':
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Ausstehend</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Abgeschlossen</Badge>;
      case 'cancelled_by_client':
      case 'cancelled_by_expert':
        return <Badge className="bg-error-bg text-error-text">Storniert</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !appointment) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <Alert className="border-error-text bg-error-bg">
            <AlertCircle className="h-4 w-4 text-error-text" />
            <AlertDescription className="text-error-text">
              {error || 'Termin nicht gefunden'}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="font-heading text-2xl text-text-dark mb-2">
                {appointment.offer.title}
              </DialogTitle>
              <DialogDescription className="font-body">
                {userRole === 'expert'
                  ? `Gebucht von ${appointment.client?.full_name || 'Unbekannt'}`
                  : `mit ${appointment.expert?.full_name || 'Unbekannt'}`
                }
              </DialogDescription>
            </div>
            {getStatusBadge(appointment.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info-bg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-info-text" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-body">Datum</p>
                <p className="font-semibold font-body">
                  {format(new Date(appointment.start_time), 'dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info-bg flex items-center justify-center">
                <Clock className="w-5 h-5 text-info-text" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-body">Zeit</p>
                <p className="font-semibold font-body">
                  {format(new Date(appointment.start_time), 'HH:mm')} - {format(new Date(appointment.end_time), 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info-bg flex items-center justify-center">
                {appointment.offer.format === 'online' ? (
                  <Video className="w-5 h-5 text-info-text" />
                ) : (
                  <MapPin className="w-5 h-5 text-info-text" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 font-body">Format</p>
                <p className="font-semibold font-body">
                  {appointment.offer.format === 'online' ? 'Online' : 'Vor Ort'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info-bg flex items-center justify-center">
                <Euro className="w-5 h-5 text-info-text" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-body">Preis</p>
                <p className="font-semibold font-heading text-lg">
                  €{appointment.total_price}
                </p>
              </div>
            </div>
          </div>

          {appointment.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-heading font-semibold text-text-dark mb-2">Notizen</h4>
                <p className="text-gray-700 font-body">{appointment.notes}</p>
              </div>
            </>
          )}

          {userRole === 'expert' && appointment.client && (
            <>
              <Separator />
              <div>
                <h4 className="font-heading font-semibold text-text-dark mb-3">Kontaktinformationen</h4>
                <div className="space-y-2">
                  {appointment.client.phone && (
                    <div className="flex items-center gap-2 text-gray-700 font-body">
                      <User className="w-4 h-4" />
                      {appointment.client.phone}
                    </div>
                  )}
                  {appointment.client.email && (
                    <div className="flex items-center gap-2 text-gray-700 font-body">
                      <User className="w-4 h-4" />
                      {appointment.client.email}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {userRole === 'expert' && appointment.status === 'confirmed' && (
            <>
              <Separator />
              <div>
                <h4 className="font-heading font-semibold text-text-dark mb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Raum für diesen Termin
                </h4>

                {appointment.room_booking ? (
                  <div className="bg-success-bg border-2 border-success-text/20 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold font-heading text-text-dark mb-1">
                          {appointment.room_booking.room.name}
                        </p>
                        <p className="text-sm text-gray-600 font-body mb-1">
                          {appointment.room_booking.provider.business_name}
                        </p>
                        {appointment.room_booking.room.address && (
                          <p className="text-sm text-gray-600 font-body flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {appointment.room_booking.room.address}, {appointment.room_booking.room.city}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-success-text text-white">Gebucht</Badge>
                    </div>
                  </div>
                ) : (
                  <Alert className="border-2 border-info-text bg-info-bg">
                    <Info className="h-4 w-4 text-info-text" />
                    <AlertDescription className="ml-2">
                      <p className="font-semibold text-info-text mb-2">Kein Raum gebucht</p>
                      <p className="text-sm text-gray-700 mb-3">
                        Für diese Session ist noch kein Raum gebucht. Buche jetzt einen passenden Raum.
                      </p>
                      <Link href={`/app/raeume-finden?appointmentId=${appointment.id}`}>
                        <Button
                          size="sm"
                          className="bg-primary-blue text-white hover:bg-primary-blue/90"
                        >
                          <Building2 className="w-4 h-4 mr-2" />
                          Raum buchen
                        </Button>
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
