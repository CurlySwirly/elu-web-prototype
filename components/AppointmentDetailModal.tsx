'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  AlertCircle,
  CalendarClock,
  Trash2,
  MessageCircle,
  FileText,
} from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { chatService } from '@/lib/services/chat';
import {
  formatLocationParts,
  formatOfferLocation,
  isOnlineOfferFormat,
} from '@/lib/utils/offer-location';
import { formatEuro, getSessionPriceBreakdown } from '@/lib/utils/pricing';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import type { InvoiceData } from '@/lib/utils/invoice';

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
  client_id?: string;
  expert_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  notes?: string;
  is_new_client?: boolean;
  client?: {
    id?: string;
    full_name: string;
    avatar_url: string;
  };
  expert?: {
    id?: string;
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
    location_address?: string;
    location_postal_code?: string;
    location_city?: string;
  };
}

function initialsFromName(name?: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function isFemaleName(fullName?: string) {
  const first = (fullName || '').trim().split(/\s+/)[0]?.toLowerCase() || '';
  return [
    'anna', 'lisa', 'sarah', 'julia', 'laura', 'maria', 'emma', 'lena', 'lea',
    'sophie', 'sophia', 'mia', 'hannah', 'hanna', 'clara', 'klara', 'nina',
    'jana', 'katharina', 'kathrin', 'katrin', 'sandra', 'sabine', 'petra',
    'monika', 'christina', 'christine', 'stefanie', 'stephanie', 'franziska',
    'vanessa', 'jennifer', 'jessica', 'michelle', 'nicole', 'nadine', 'elena',
  ].includes(first);
}

export default function AppointmentDetailModal({
  appointmentId,
  isOpen,
  onClose,
  userRole,
  onReschedule,
  onCancel,
}: AppointmentDetailModalProps) {
  const router = useRouter();
  const { userId, user } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const loadAppointmentDetails = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    setError('');

    try {
      const backendMode = getBackendMode();

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
          client_id: found.client_id || found.client?.id || `client-${found.id}`,
          expert_id: found.expert_id || found.expert?.id || mockExpert?.id,
          start_time: found.start_time,
          end_time: found.end_time,
          status: found.status,
          total_price: found.total_price,
          notes: found.notes,
          is_new_client:
            typeof found.is_new_booking === 'boolean' ? found.is_new_booking : true,
          client: found.client
            ? {
                id: found.client.id || found.client_id || `client-${found.id}`,
                full_name: found.client.full_name || '',
                avatar_url: found.client.avatar_url || '',
              }
            : undefined,
          expert: found.expert
            ? {
                id: found.expert.id || found.expert_id || mockExpert?.id,
                full_name: found.expert.full_name || mockExpert?.full_name || '',
                avatar_url: found.expert.avatar_url || mockExpert?.avatar_url || '',
                address: found.expert.address || mockExpert?.address || '',
                postal_code: found.expert.postal_code || mockExpert?.postal_code || '',
                city: found.expert.city || mockExpert?.city || '',
              }
            : mockExpert
              ? {
                  id: mockExpert.id,
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
            location_address:
              found.offer?.location_address || mockExpert?.address || '',
            location_postal_code:
              found.offer?.location_postal_code || mockExpert?.postal_code || '',
            location_city: found.offer?.location_city || mockExpert?.city || '',
          },
        });
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          expert_id,
          start_time,
          end_time,
          status,
          total_price,
          notes,
          profiles:client_id (
            id,
            full_name,
            avatar_url
          ),
          expert_profiles:expert_id (
            id,
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
            description,
            location_address,
            location_postal_code,
            location_city
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

        const clientProfile = Array.isArray(data.profiles)
          ? data.profiles[0]
          : data.profiles;

        let isNewClient = false;
        if (data.client_id && data.expert_id) {
          const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', data.client_id)
            .eq('expert_id', data.expert_id)
            .neq('id', data.id)
            .not('status', 'like', 'cancelled%')
            .lt('start_time', data.start_time);
          isNewClient = (count || 0) === 0;
        }

        setAppointment({
          id: data.id,
          client_id: data.client_id,
          expert_id: data.expert_id || expertProfiles?.id,
          start_time: data.start_time,
          end_time: data.end_time,
          status: data.status,
          total_price: data.total_price,
          notes: data.notes,
          is_new_client: isNewClient,
          client: {
            id: clientProfile?.id || data.client_id,
            full_name: clientProfile?.full_name || '',
            avatar_url: clientProfile?.avatar_url || '',
          },
          expert: {
            id: expertProfiles?.id || data.expert_id,
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
            location_address:
              (Array.isArray(data.expert_offers) ? data.expert_offers[0] : data.expert_offers)
                ?.location_address || '',
            location_postal_code:
              (Array.isArray(data.expert_offers) ? data.expert_offers[0] : data.expert_offers)
                ?.location_postal_code || '',
            location_city:
              (Array.isArray(data.expert_offers) ? data.expert_offers[0] : data.expert_offers)
                ?.location_city || '',
          },
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
    if (!isOpen) {
      setInvoiceOpen(false);
    }
  }, [appointmentId, isOpen, loadAppointmentDetails]);

  const handleStartChat = async () => {
    if (!appointment || !userId) return;

    const clientId =
      appointment.client_id ||
      appointment.client?.id ||
      (userRole === 'client' ? userId : undefined);
    const expertId =
      appointment.expert_id ||
      appointment.expert?.id ||
      (userRole === 'expert' ? userId : undefined);

    if (!clientId || !expertId) {
      setError('Chatpartner konnte nicht ermittelt werden.');
      return;
    }

    setChatLoading(true);
    setError('');
    try {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        const { mockChatThreads, mockChatMessagesByThread } = await import(
          '@/lib/backend/mock/data'
        );
        let thread = mockChatThreads.find(
          (t) =>
            t.appointment_id === appointment.id ||
            (userRole === 'expert'
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
        } else if (userRole === 'expert' && appointment.client) {
          thread.client = {
            full_name: appointment.client.full_name,
            avatar_url: appointment.client.avatar_url,
          };
          thread.offer_title = appointment.offer.title;
        } else if (userRole === 'client' && appointment.expert) {
          thread.expert = {
            full_name: appointment.expert.full_name,
            avatar_url: appointment.expert.avatar_url,
          };
          thread.offer_title = appointment.offer.title;
        }
        onClose();
        router.push(`/app/nachrichten?thread=${thread.id}`);
        return;
      }

      const thread = await chatService.getOrCreateThread(
        appointment.id,
        clientId,
        expertId
      );
      onClose();
      router.push(`/app/nachrichten?thread=${thread.id}`);
    } catch (err: any) {
      setError(err.message || 'Chat konnte nicht gestartet werden.');
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !appointment) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
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

  const sessionIsOnline = isOnlineOfferFormat(appointment.offer.format);
  const offerAddress = formatOfferLocation(appointment.offer);
  const expertAddress = appointment.expert
    ? formatLocationParts(appointment.expert)
    : '';
  const sessionAddress = sessionIsOnline
    ? 'Online'
    : offerAddress || expertAddress || 'Adresse folgt';
  const priceBreakdown = getSessionPriceBreakdown(appointment.total_price);

  const person =
    userRole === 'expert'
      ? {
          name: appointment.client?.full_name || 'Unbekannt',
          avatar: appointment.client?.avatar_url || '',
        }
      : {
          name: appointment.expert?.full_name || 'Unbekannt',
          avatar: appointment.expert?.avatar_url || '',
        };

  const isCancellableStatus = appointment.status === 'confirmed';
  const startsInFuture = isBefore(new Date(), parseISO(appointment.start_time));
  const hasEnded = isBefore(parseISO(appointment.end_time), new Date());
  const isPastSession =
    appointment.status === 'completed' ||
    (hasEnded && !appointment.status.startsWith('cancelled'));

  const showNeukunde =
    userRole === 'expert' &&
    appointment.is_new_client &&
    appointment.status === 'confirmed' &&
    !isPastSession;
  const canChat =
    (userRole === 'expert' && Boolean(appointment.client)) ||
    (userRole === 'client' && Boolean(appointment.expert));
  const showCancel =
    Boolean(onCancel) &&
    isCancellableStatus &&
    (userRole === 'expert' || startsInFuture);
  const showReschedule =
    Boolean(onReschedule) &&
    userRole === 'client' &&
    appointment.status === 'confirmed' &&
    startsInFuture;
  /** Invoice only after the session took place — never for open/upcoming bookings */
  const showInvoice = isPastSession;
  const actionCount =
    (canChat ? 1 : 0) +
    (showReschedule ? 1 : 0) +
    (showCancel ? 1 : 0) +
    (showInvoice ? 1 : 0);

  const expertAddressLabel =
    formatLocationParts({
      address: appointment.expert?.address,
      postal_code: appointment.expert?.postal_code,
      city: appointment.expert?.city,
    }) || formatOfferLocation(appointment.offer);

  const invoiceData: InvoiceData = {
    appointmentId: appointment.id,
    offerTitle: appointment.offer.title || 'Session',
    sessionStart: appointment.start_time,
    sessionEnd: appointment.end_time,
    totalPrice: appointment.total_price,
    expertName:
      appointment.expert?.full_name ||
      (userRole === 'expert' ? user?.fullName || 'Expert:in' : 'Expert:in'),
    expertAddress: expertAddressLabel || undefined,
    clientName:
      appointment.client?.full_name ||
      (userRole === 'client' ? user?.fullName || 'Klient:in' : 'Klient:in'),
    formatLabel: sessionIsOnline ? 'Online' : 'Vor Ort',
  };

  const keyInfos = [
    {
      icon: Calendar,
      label: 'Datum',
      value: format(new Date(appointment.start_time), 'dd. MMMM yyyy', { locale: de }),
    },
    {
      icon: Clock,
      label: 'Zeit',
      value: `${format(new Date(appointment.start_time), 'HH:mm')} – ${format(new Date(appointment.end_time), 'HH:mm')}`,
    },
    {
      icon: sessionIsOnline ? Video : MapPin,
      label: 'Art',
      value: sessionIsOnline ? 'Online' : 'Vor Ort',
    },
    {
      icon: MapPin,
      label: 'Adresse',
      value: sessionAddress,
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Termindetails</DialogTitle>
          <DialogDescription>
            {appointment.offer.title} mit {person.name}
          </DialogDescription>
        </DialogHeader>

        <div className="relative px-5 pt-5 pb-5 space-y-5">
          {showNeukunde && (
            <Badge className="absolute top-4 right-4 border-none text-[11px] font-body bg-primary-green/30 text-text-dark">
              {isFemaleName(appointment.client?.full_name) ? 'Neukundin' : 'Neukunde'}
            </Badge>
          )}

          <div className={cn(showNeukunde && 'pr-20')}>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 shrink-0">
                <AvatarImage src={person.avatar} alt={person.name} />
                <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-sm font-heading">
                  {initialsFromName(person.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-0.5">
                <p className="font-heading font-semibold text-text-dark text-lg leading-snug truncate">
                  {person.name}
                </p>
                <p className="font-body text-sm text-gray-600 leading-snug truncate">
                  {appointment.offer.title}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {keyInfos.map((info) => {
              const Icon = info.icon;
              return (
                <div key={info.label} className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-info-bg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-info-text" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 font-body">{info.label}</p>
                    <p className="text-sm font-semibold font-body text-text-dark leading-snug break-words">
                      {info.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {appointment.notes ? (
            <div>
              <p className="text-xs text-gray-500 font-body mb-1">Notizen</p>
              <p className="text-sm text-gray-700 font-body">{appointment.notes}</p>
            </div>
          ) : null}

          <div>
            <h4 className="font-heading font-semibold text-text-dark mb-2 text-sm">
              Kostenaufstellung
            </h4>
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="text-sm text-gray-600 font-body">
                  {userRole === 'expert' ? 'Klient:in zahlt' : 'Sessionpreis'}
                </span>
                <span className="text-sm font-body font-medium text-text-dark tabular-nums">
                  {formatEuro(priceBreakdown.clientPays)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="text-sm text-gray-600 font-body">
                  elu-Gebühr ({Math.round(priceBreakdown.feeRate * 100)}&nbsp;%, netto)
                </span>
                <span className="text-sm font-body font-medium text-text-dark tabular-nums">
                  {formatEuro(priceBreakdown.platformFeeNet)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="text-sm text-gray-600 font-body">
                  MwSt. ({Math.round(priceBreakdown.vatRate * 100)}&nbsp;%)
                </span>
                <span className="text-sm font-body font-medium text-text-dark tabular-nums">
                  {formatEuro(priceBreakdown.vatAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-bg-light/80">
                <span className="text-sm font-heading font-semibold text-text-dark">
                  {userRole === 'expert' ? 'Dein Anteil' : 'Expert:in erhält'}
                </span>
                <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
                  {formatEuro(priceBreakdown.expertPayout)}
                </span>
              </div>
            </div>
          </div>

          {actionCount > 0 && (
            <div
              className={cn(
                'grid gap-2',
                actionCount > 1 ? 'grid-cols-2' : 'grid-cols-1'
              )}
            >
              {canChat && (
                <Button
                  type="button"
                  className="font-body h-10 w-full rounded-lg bg-primary-blue hover:bg-primary-blue/90 text-white"
                  disabled={chatLoading}
                  onClick={() => void handleStartChat()}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {chatLoading ? 'Öffnet…' : 'Chat'}
                </Button>
              )}
              {showInvoice && (
                <Button
                  type="button"
                  variant="outline"
                  className="font-body h-10 w-full rounded-lg"
                  onClick={() => setInvoiceOpen(true)}
                >
                  <FileText className="w-4 h-4 mr-2 text-primary-blue" />
                  Rechnung
                </Button>
              )}
              {showReschedule && (
                <Button
                  type="button"
                  variant="outline"
                  className="font-body h-10 w-full rounded-lg"
                  onClick={() => onReschedule!(appointment.id)}
                >
                  <CalendarClock className="w-4 h-4 mr-2 text-primary-blue" />
                  Verschieben
                </Button>
              )}
              {showCancel && (
                <Button
                  type="button"
                  variant="outline"
                  className="font-body h-10 w-full rounded-lg text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onCancel!(appointment.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {userRole === 'expert' ? 'Absagen' : 'Stornieren'}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      </Dialog>

      <InvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        invoice={invoiceData}
      />
    </>
  );
}
