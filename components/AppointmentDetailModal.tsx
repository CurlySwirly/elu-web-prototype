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
  Info,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';

interface AppointmentDetailModalProps {
  appointmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'client' | 'expert';
  onReschedule?: (appointmentId: string) => void;
  onCancel?: (appointmentId: string) => void;
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
    address?: string;
    postal_code?: string;
    city?: string;
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
      postal_code?: string;
    };
    provider: {
      business_name: string;
    };
  };
}

function isOnlineFormat(format?: string) {
  const normalized = (format || '').trim().toLowerCase();
  return normalized === 'online';
}

function formatAddressParts(parts: {
  address?: string;
  postal_code?: string;
  city?: string;
}) {
  const cityLine = [parts.postal_code, parts.city].filter(Boolean).join(' ');
  return [parts.address, cityLine].filter(Boolean).join(', ');
}

export default function AppointmentDetailModal({
  appointmentId,
  isOpen,
  onClose,
  userRole,
  onReschedule,
  onCancel,
}: AppointmentDetailModalProps) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadAppointmentDetails = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    setError('');

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const {
          mockClientAppointments,
          mockExpertAppointments,
          mockClientBookingRequests,
          mockExperts,
        } = await import('@/lib/backend/mock/data');

        const found =
          mockClientAppointments.find((a) => a.id === appointmentId) ||
          mockExpertAppointments.find((a) => a.id === appointmentId) ||
          mockClientBookingRequests.find((a) => a.id === appointmentId);

        if (!found) {
          setAppointment(null);
          setError('Termin nicht gefunden');
          return;
        }

        const mockExpert = mockExperts.find(
          (expert) =>
            expert.id === found.expert_id ||
            expert.id === found.expert?.id ||
            expert.full_name === found.expert?.full_name
        );

        setAppointment({
          id: found.id,
          start_time: found.start_time,
          end_time: found.end_time,
          status: found.status,
          total_price: found.total_price,
          notes: found.notes,
          client: found.client
            ? {
                full_name: found.client.full_name || '',
                avatar_url: found.client.avatar_url || '',
                phone: found.client.phone || '',
                email: found.client.email || '',
              }
            : undefined,
          expert: found.expert
            ? {
                full_name: found.expert.full_name || mockExpert?.full_name || '',
                avatar_url: found.expert.avatar_url || mockExpert?.avatar_url || '',
                address: found.expert.address || mockExpert?.address || '',
                postal_code: found.expert.postal_code || mockExpert?.postal_code || '',
                city: found.expert.city || mockExpert?.city || '',
              }
            : mockExpert
              ? {
                  full_name: mockExpert.full_name,
                  avatar_url: mockExpert.avatar_url || '',
                  address: mockExpert.address || '',
                  postal_code: mockExpert.postal_code || '',
                  city: mockExpert.city || '',
                }
              : undefined,
          offer: {
            title: found.offer?.title || '',
            format: found.offer?.format || '',
            description: found.offer?.description || '',
          },
          room_booking: found.room_booking
            ? {
                id: found.room_booking.id,
                room: {
                  name: found.room_booking.room?.name || '',
                  address: found.room_booking.room?.address || '',
                  city: found.room_booking.room?.city || '',
                  postal_code: found.room_booking.room?.postal_code || '',
                },
                provider: {
                  business_name: found.room_booking.provider?.business_name || '',
                },
              }
            : undefined,
        });
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
          room_booking_id,
          profiles:client_id (
            full_name,
            avatar_url,
            phone,
            email
          ),
          expert_profiles:expert_id (
            address,
            postal_code,
            city,
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
              city,
              postal_code
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
            address: expertProfiles?.address || '',
            postal_code: expertProfiles?.postal_code || '',
            city: expertProfiles?.city || '',
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
              postal_code: room?.postal_code || '',
            },
            provider: {
              business_name: provider?.business_name || '',
            }
          } : undefined
        });
      } else {
        setAppointment(null);
        setError('Termin nicht gefunden');
      }
    } catch (err: any) {
      setError(err.message || 'Fetch error');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (appointmentId && isOpen) {
      loadAppointmentDetails();
    }
  }, [appointmentId, isOpen, loadAppointmentDetails]);

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

  const sessionIsOnline = isOnlineFormat(appointment.offer.format);
  const roomAddress = appointment.room_booking
    ? formatAddressParts(appointment.room_booking.room)
    : '';
  const expertAddress = appointment.expert
    ? formatAddressParts(appointment.expert)
    : '';
  const sessionAddress = roomAddress || expertAddress;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl text-text-dark mb-2">
            {appointment.offer.title}
          </DialogTitle>
          <DialogDescription className="font-body">
            {userRole === 'expert'
              ? `Gebucht von ${appointment.client?.full_name || 'Unbekannt'}`
              : `mit ${appointment.expert?.full_name || 'Unbekannt'}`
            }
          </DialogDescription>
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
                {sessionIsOnline ? (
                  <Video className="w-5 h-5 text-info-text" />
                ) : (
                  <MapPin className="w-5 h-5 text-info-text" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 font-body">Format</p>
                <p className="font-semibold font-body">
                  {sessionIsOnline ? 'Online' : 'Vor Ort'}
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

          {userRole === 'client' && !sessionIsOnline && sessionAddress && (
            <>
              <Separator />
              <div>
                <h4 className="font-heading font-semibold text-text-dark mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse
                </h4>
                {appointment.room_booking?.room.name ? (
                  <p className="font-semibold font-body text-text-dark mb-1">
                    {appointment.room_booking.room.name}
                  </p>
                ) : null}
                <p className="text-gray-700 font-body">{sessionAddress}</p>
              </div>
            </>
          )}

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
                        {roomAddress && (
                          <p className="text-sm text-gray-600 font-body flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {roomAddress}
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

          {userRole === 'client' &&
            appointment.status === 'confirmed' &&
            (onReschedule || onCancel) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onReschedule && isBefore(new Date(), parseISO(appointment.start_time)) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="font-body h-10 w-full rounded-lg"
                    onClick={() => onReschedule(appointment.id)}
                  >
                    <CalendarClock className="w-4 h-4 mr-2 text-primary-blue" />
                    Termin verschieben
                  </Button>
                )}
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    className="font-body h-10 w-full rounded-lg text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onCancel(appointment.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Termin stornieren
                  </Button>
                )}
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
