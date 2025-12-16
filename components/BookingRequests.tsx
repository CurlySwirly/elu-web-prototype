'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';

interface BookingRequest {
  id: string;
  start_time: string;
  end_time: string;
  status: 'requested' | 'confirmed' | 'cancelled';
  total_price: number;
  notes?: string;
  expert: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
  is_newly_accepted?: boolean;
}

export default function BookingRequests() {
  const { userId } = useAuth();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        // Use mock data
        await new Promise(resolve => setTimeout(resolve, 300));
        const { mockClientBookingRequests } = await import('@/lib/backend/mock/data');
        setRequests(mockClientBookingRequests);
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
            notes,
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
          .in('status', ['requested', 'confirmed'])
          .order('start_time', { ascending: true });

        if (error) throw error;

        setRequests(data.map((apt: any) => {
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
            notes: apt.notes,
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
    } catch (err: any) {
      console.error('Error loading booking requests:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getStatusBadge = (status: string, isNewlyAccepted?: boolean) => {
    if (status === 'confirmed') {
      return (
        <Badge className="bg-info-bg text-info-text border-none font-body">
          {isNewlyAccepted && <CheckCircle2 className="w-3 h-3 mr-1" />}
          Bestätigt
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-body">
        <Clock className="w-3 h-3 mr-1" />
        Ausstehend
      </Badge>
    );
  };

  const requestedCount = requests.filter(r => r.status === 'requested').length;
  const confirmedCount = requests.filter(r => r.status === 'confirmed').length;

  if (loading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Buchungsanfragen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Buchungsanfragen</CardTitle>
          <CardDescription className="font-body">
            Keine offenen Buchungsanfragen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 font-body text-sm text-center py-4">
            Du hast noch keine Buchungsanfragen gestellt.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading text-xl">Buchungsanfragen</CardTitle>
            <CardDescription className="font-body">
              {requestedCount > 0 && `${requestedCount} ausstehend`}
              {requestedCount > 0 && confirmedCount > 0 && ' • '}
              {confirmedCount > 0 && `${confirmedCount} bestätigt`}
            </CardDescription>
          </div>
          <Link href="/app/termine">
            <Badge variant="outline" className="font-body cursor-pointer hover:bg-gray-50">
              Alle anzeigen
            </Badge>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.slice(0, 5).map((request) => (
            <div
              key={request.id}
              className={`p-4 rounded-lg border-2 bg-white transition-colors ${
                request.status === 'confirmed' && request.is_newly_accepted
                  ? 'border-primary-green'
                  : request.status === 'confirmed'
                  ? 'border-info-text/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.expert.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs">
                      {request.expert.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-heading font-semibold text-sm text-text-dark truncate">
                        {request.offer.title}
                      </p>
                      {getStatusBadge(request.status, request.is_newly_accepted)}
                    </div>
                    <p className="text-xs text-gray-600 font-body mb-2">
                      mit {request.expert.full_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-body">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(parseISO(request.start_time), 'd. MMM yyyy', { locale: de })} •{' '}
                        {format(parseISO(request.start_time), 'HH:mm', { locale: de })} Uhr
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-heading font-bold text-sm text-text-dark">
                    €{request.total_price.toFixed(2)}
                  </p>
                </div>
              </div>
              {request.status === 'confirmed' && request.is_newly_accepted && (
                <div className="mt-3 pt-3 border-t border-primary-green/30">
                  <div className="flex items-center gap-2 text-xs text-text-dark font-body">
                    <CheckCircle2 className="w-3 h-3 text-primary-green" />
                    <span>Neu bestätigt! Die Expert:in hat deine Anfrage angenommen.</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {requests.length > 5 && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/app/termine">
              <p className="text-sm text-primary-blue hover:underline font-body text-center">
                Alle {requests.length} Anfragen anzeigen →
              </p>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

