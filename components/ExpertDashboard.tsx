'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  FileText,
  Award,
  Briefcase,
  CalendarClock,
  CreditCard,
  ShieldCheck,
  Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppointmentCalendar from './AppointmentCalendar';
import { reviewService } from '@/lib/services/review';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ExpertProfile {
  id: string;
  verification_status: string;
  checklist_stammdaten_completed: boolean;
  checklist_qualifications_uploaded: boolean;
  checklist_offers_created: boolean;
  checklist_availability_set: boolean;
  checklist_stripe_connected: boolean;
  qualification_verified: boolean;
  bio: string;
  profile_image_url: string;
}

interface ChecklistItem {
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'in_review';
  link: string;
  icon: any;
  key: string;
}

export default function ExpertDashboard() {
  const { user } = useAuth();
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weeklyAppointments: 0,
    activeClients: 0,
    monthlyRevenue: 0
  });
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  const fetchExpertData = useCallback(async () => {
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        // Use mock verified expert profile
        await new Promise(resolve => setTimeout(resolve, 300));
        setExpertProfile({
          id: 'mock-expert-1',
          verification_status: 'verified',
          checklist_stammdaten_completed: true,
          checklist_qualifications_uploaded: true,
          checklist_offers_created: true,
          checklist_availability_set: true,
          checklist_stripe_connected: true,
          qualification_verified: true,
          bio: 'Zertifizierte Physiotherapeutin mit 8 Jahren Erfahrung',
          profile_image_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
        });
        
        // Calculate mock stats from mock appointments
        const { mockExpertAppointments } = await import('@/lib/backend/mock/data');
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weeklyAppointments = mockExpertAppointments.filter(apt => {
          const aptDate = new Date(apt.start_time);
          return aptDate >= weekStart && aptDate < weekEnd;
        }).length;
        
        const uniqueClients = new Set(mockExpertAppointments.map(apt => apt.client?.full_name)).size;
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const monthlyRevenue = mockExpertAppointments
          .filter(apt => {
            const aptDate = new Date(apt.start_time);
            return aptDate >= monthStart && aptDate <= monthEnd && apt.status === 'confirmed';
          })
          .reduce((sum, apt) => sum + (apt.total_price || 0), 0);
        
        setStats({
          weeklyAppointments,
          activeClients: uniqueClients,
          monthlyRevenue,
        });
        
        // Load recent reviews - create mock reviews with appointment details
        const mockReviews = [
          {
            id: 'review-1',
            appointment_id: 'apt-expert-1',
            expert_profile_id: 'mock-expert-1',
            client_id: 'client-1',
            rating: 5,
            title: 'Sehr professionell und einfühlsam',
            review_text: 'Die Sitzung war genau das, was ich gebraucht habe. Sehr professionell und einfühlsam. Ich fühle mich deutlich besser.',
            helpful_count: 3,
            created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
            client: {
              full_name: 'Max Mustermann',
              avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
            },
            appointment: {
              start_time: new Date(Date.now() - 10 * 86400000).toISOString(),
              end_time: new Date(Date.now() - 10 * 86400000 + 60 * 60 * 1000).toISOString(),
              offer: {
                title: 'Erstberatung & Analyse',
                format: 'Präsenz',
              },
            },
          },
          {
            id: 'review-2',
            appointment_id: 'apt-expert-2',
            expert_profile_id: 'mock-expert-1',
            client_id: 'client-2',
            rating: 5,
            title: 'Hervorragende Behandlung',
            review_text: 'Die Expertin hat sich viel Zeit genommen und alle meine Fragen beantwortet. Die Behandlung war sehr effektiv.',
            helpful_count: 2,
            created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
            client: {
              full_name: 'Anna Schmidt',
              avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
            },
            appointment: {
              start_time: new Date(Date.now() - 15 * 86400000).toISOString(),
              end_time: new Date(Date.now() - 15 * 86400000 + 45 * 60 * 1000).toISOString(),
              offer: {
                title: 'Manuelle Therapie',
                format: 'Online',
              },
            },
          },
          {
            id: 'review-3',
            appointment_id: 'apt-expert-3',
            expert_profile_id: 'mock-expert-1',
            client_id: 'client-3',
            rating: 4,
            title: 'Gute Erfahrung',
            review_text: 'Gute Sitzung, sehr kompetent. Würde wieder buchen.',
            helpful_count: 1,
            created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            client: {
              full_name: 'Tom Weber',
              avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
            },
            appointment: {
              start_time: new Date(Date.now() - 25 * 86400000).toISOString(),
              end_time: new Date(Date.now() - 25 * 86400000 + 60 * 60 * 1000).toISOString(),
              offer: {
                title: 'Massage & Entspannung',
                format: 'Präsenz',
              },
            },
          },
        ];
        setRecentReviews(mockReviews);
        
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setExpertProfile(profile);
        
        // Calculate real stats
        const { data: appointments } = await supabase
          .from('appointments')
          .select('start_time, status, total_price, client_id')
          .eq('expert_id', profile.id);
        
        if (appointments) {
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay() + 1);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);
          
          const weeklyAppointments = appointments.filter(apt => {
            const aptDate = new Date(apt.start_time);
            return aptDate >= weekStart && aptDate < weekEnd;
          }).length;
          
          const uniqueClients = new Set(appointments.map(apt => apt.client_id)).size;
          
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const monthlyRevenue = appointments
            .filter(apt => {
              const aptDate = new Date(apt.start_time);
              return aptDate >= monthStart && aptDate <= monthEnd && apt.status === 'confirmed';
            })
            .reduce((sum, apt) => sum + (apt.total_price || 0), 0);
          
          setStats({
            weeklyAppointments,
            activeClients: uniqueClients,
            monthlyRevenue,
          });
        }
        
        // Load recent reviews (already includes appointment details via reviewService)
        try {
          const reviews = await reviewService.getExpertReviews(profile.id);
          setRecentReviews(reviews.slice(0, 3));
        } catch (err) {
          console.error('Error loading reviews:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching expert data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchExpertData();
    }
  }, [user, fetchExpertData]);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getChecklist = (): ChecklistItem[] => {
    const qualStatus = expertProfile?.checklist_qualifications_uploaded
      ? (expertProfile?.qualification_verified ? 'completed' : 'in_review')
      : 'pending';

    return [
      {
        title: 'Stammdaten vervollständigen',
        description: 'Name, Profilfoto, Adresse (Bezirk), kurze Bio',
        status: expertProfile?.checklist_stammdaten_completed ? 'completed' : 'pending',
        link: '/app/expert-profil',
        icon: FileText,
        key: 'stammdaten'
      },
      {
        title: 'Qualifikationen hochladen',
        description: 'Mind. 1 anerkannte Ausbildung (PDF oder Bild)',
        status: qualStatus,
        link: '/app/expert-profil',
        icon: Award,
        key: 'qualifications'
      },
      {
        title: 'Angebot(e) anlegen',
        description: 'Titel, Preis, Dauer, Format',
        status: expertProfile?.checklist_offers_created ? 'completed' : 'pending',
        link: '/app/angebote',
        icon: Briefcase,
        key: 'offers'
      },
      {
        title: 'Verfügbarkeit anlegen',
        description: 'Mind. 1 wiederkehrender Zeitblock',
        status: expertProfile?.checklist_availability_set ? 'completed' : 'pending',
        link: '/app/kalender',
        icon: CalendarClock,
        key: 'availability'
      },
      {
        title: 'Stripe Connect verknüpfen',
        description: 'Via Stripe-Onboarding für Auszahlungen',
        status: expertProfile?.checklist_stripe_connected ? 'completed' : 'pending',
        link: '/app/finanzen',
        icon: CreditCard,
        key: 'stripe'
      }
    ];
  };

  const checklist = getChecklist();
  const completedItems = checklist.filter(item => item.status === 'completed').length;
  const inReviewItems = checklist.filter(item => item.status === 'in_review').length;
  const allComplete = completedItems === checklist.length;

  const verificationStatus = expertProfile?.verification_status || 'not_verified_incomplete';
  const isVerified = verificationStatus === 'verified';
  const isPendingReview = verificationStatus === 'not_verified_pending_review';
  const isIncomplete = verificationStatus === 'not_verified_incomplete';

  const getStatusBadge = () => {
    if (isVerified) {
      return (
        <Badge className="text-text-dark text-base px-4 py-2" style={{ backgroundColor: '#E2E8FB', borderColor: '#6D8EEC', borderWidth: '1px' }}>
          <ShieldCheck className="w-4 h-4 mr-2" style={{ color: '#6D8EEC' }} />
          <span style={{ color: '#6D8EEC' }}>Verified Expert</span>
        </Badge>
      );
    }
    if (isPendingReview) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-base px-4 py-2">
          <Clock className="w-4 h-4 mr-2" />
          Qualifikation in Prüfung
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-600 text-base px-4 py-2">
        <Circle className="w-4 h-4 mr-2" />
        Profil unvollständig
      </Badge>
    );
  };

  const getAlertMessage = () => {
    if (isVerified) {
      return (
        <Alert className="border-2" style={{ backgroundColor: '#E2E8FB', borderColor: '#6D8EEC' }}>
          <CheckCircle2 className="h-5 w-5" style={{ color: '#6D8EEC' }} />
          <AlertDescription className="ml-2 text-text-dark">
            <strong className="font-semibold">Du bist verifiziert!</strong> Dein Profil ist jetzt sichtbar und buchbar. Klient:innen können dich finden und Termine vereinbaren.
          </AlertDescription>
        </Alert>
      );
    }
    if (isPendingReview) {
      return (
        <Alert className="border-2 border-yellow-200 bg-yellow-50">
          <Clock className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="ml-2 text-yellow-900">
            <strong className="font-semibold">Wir haben deine Dokumente erhalten und prüfen sie aktuell.</strong> Du erhältst eine Benachrichtigung, sobald dein Profil freigegeben ist. Dies dauert in der Regel 1-2 Werktage.
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <Alert className="border-2 border-info-text bg-info-bg">
        <AlertCircle className="h-5 w-5 text-info-text" />
        <AlertDescription className="ml-2 text-info-text">
          <strong className="font-semibold">Du bist noch nicht verifiziert.</strong> Bitte schließe alle 5 Schritte unten ab und warte auf unsere Qualifikationsprüfung.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
            Expert:innen Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
            Verwalte deine Angebote, Termine und Finanzen
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {getAlertMessage()}

      {!isVerified && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Verifizierungs-Checkliste</CardTitle>
            <CardDescription className="font-body text-base">
              {completedItems} von {checklist.length} Schritten abgeschlossen
              {inReviewItems > 0 && ` • ${inReviewItems} in Prüfung`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-primary-blue to-primary-green h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(completedItems / checklist.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              {checklist.map((item) => {
                const Icon = item.icon;
                const isComplete = item.status === 'completed';
                const isInReview = item.status === 'in_review';

                return (
                  <div
                    key={item.key}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                      isComplete
                        ? 'bg-primary-green/10 border-primary-green'
                        : isInReview
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-white border-gray-200 hover:border-primary-blue'
                    }`}
                  >
                    <div className={`mt-1 ${
                      isComplete
                        ? 'text-primary-green'
                        : isInReview
                        ? 'text-yellow-600'
                        : 'text-gray-400'
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : isInReview ? (
                        <Clock className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-heading font-semibold text-lg text-text-dark mb-1">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 font-body text-sm mb-3">
                            {item.description}
                          </p>
                          {isInReview && (
                            <p className="text-xs text-yellow-700 font-semibold">
                              ⏳ Dokument hochgeladen – warte auf Admin-Freigabe
                            </p>
                          )}
                        </div>
                        <Icon className="w-8 h-8 text-primary-blue flex-shrink-0" />
                      </div>

                      {!isInReview && (
                        <Link href={item.link}>
                          <Button
                            variant={isComplete ? 'outline' : 'default'}
                            size="sm"
                            className={isComplete ? '' : 'bg-primary-blue hover:bg-primary-blue/90'}
                          >
                            {isComplete ? 'Bearbeiten' : 'Jetzt ausfüllen'}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isPendingReview && (
              <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-yellow-900 mb-1">
                      Checkliste vollständig!
                    </h4>
                    <p className="text-sm text-yellow-700 font-body">
                      Alle Schritte sind abgeschlossen. Deine Qualifikationen werden gerade von unserem Team geprüft.
                      Du erhältst eine E-Mail, sobald dein Profil freigegeben ist.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isVerified && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Calendar className="w-5 h-5 text-primary-blue" />
                  Termine diese Woche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-text-dark">{stats.weeklyAppointments}</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Users className="w-5 h-5 text-primary-blue" />
                  Aktive Kund:innen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-text-dark">{stats.activeClients}</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <TrendingUp className="w-5 h-5 text-primary-blue" />
                  Umsatz diesen Monat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-text-dark">€{stats.monthlyRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <AppointmentCalendar role="expert" />
          </div>

          {/* Recent Reviews */}
          {recentReviews.length > 0 && (
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-xl">Aktuelle Bewertungen</CardTitle>
                    <CardDescription className="font-body">
                      Die letzten {recentReviews.length} Bewertungen von Kund:innen
                    </CardDescription>
                  </div>
                  <Link href="/app/expert-profil#reviews">
                    <Button variant="outline" size="sm" className="font-body">
                      Alle Bewertungen
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReviews.map((review) => (
                    <div key={review.id} className="p-4 border-2 rounded-lg bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {review.client && (
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={review.client.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white">
                                {review.client.full_name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <p className="font-heading font-semibold text-text-dark">
                              {review.client?.full_name || 'Anonym'}
                            </p>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="text-sm text-gray-600 ml-2 font-body">
                                {format(parseISO(review.created_at), 'dd. MMM yyyy', { locale: de })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {review.appointment && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-heading font-semibold text-text-dark mb-1">
                            Session: {review.appointment.offer?.title || 'Unbekanntes Angebot'}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(review.appointment.start_time), 'dd. MMMM yyyy', { locale: de })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(parseISO(review.appointment.start_time), 'HH:mm', { locale: de })} - {format(parseISO(review.appointment.end_time), 'HH:mm', { locale: de })}
                            </div>
                            {review.appointment.offer?.format && (
                              <Badge variant="outline" className="text-xs">
                                {review.appointment.offer.format}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <h4 className="font-heading font-semibold text-lg text-text-dark mb-2 mt-3">
                        {review.title}
                      </h4>
                      <p className="text-gray-700 font-body leading-relaxed">
                        {review.review_text}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-2 mt-6">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Schnellzugriff</CardTitle>
              <CardDescription className="font-body">Häufig verwendete Funktionen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/app/angebote">
                <Button variant="outline" className="w-full justify-start">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Angebote verwalten
                </Button>
              </Link>
              <Link href="/app/kalender">
                <Button variant="outline" className="w-full justify-start">
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Verfügbarkeiten bearbeiten
                </Button>
              </Link>
              <Link href="/app/finanzen">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Auszahlungen ansehen
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
