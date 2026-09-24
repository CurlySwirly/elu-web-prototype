'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { firstNameFrom } from '@/lib/utils/name';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  Briefcase,
  CalendarClock,
  CreditCard,
  Star,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppointmentCalendar from './AppointmentCalendar';
import { reviewService } from '@/lib/services/review';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  hasActiveSubscriptionAccess,
  loadExpertSubscription,
} from '@/lib/utils/subscription';
import { loadStripeConnectStatus } from '@/lib/utils/stripe-connect';
import { ensureMockExpertDemoState } from '@/lib/backend/mock/expert-demo-state';

interface ExpertProfile {
  id: string;
  verification_status: string;
  checklist_stammdaten_completed: boolean;
  checklist_qualifications_uploaded: boolean;
  checklist_offers_created: boolean;
  checklist_availability_set: boolean;
  checklist_stripe_connected: boolean;
  checklist_abo_active?: boolean;
  qualification_verified: boolean;
  bio: string;
  profile_image_url: string;
}

interface ChecklistItem {
  title: string;
  description: string;
  status: 'completed' | 'pending' | 'in_review';
  link: string;
  key: string;
}

export default function ExpertDashboard() {
  const { user } = useAuth();
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [greetingName, setGreetingName] = useState(() => firstNameFrom(user?.fullName));
  const [stats, setStats] = useState({
    weeklyAppointments: 0,
    newBookings: 0,
    monthlyRevenue: 0
  });
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [showVerifiedToast, setShowVerifiedToast] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(true);

  useEffect(() => {
    const fromAuth = firstNameFrom(user?.fullName);
    if (fromAuth) setGreetingName(fromAuth);
  }, [user?.fullName]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('elu-mock-just-verified') === '1') {
        setShowVerifiedToast(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismissVerifiedToast = () => {
    setShowVerifiedToast(false);
    try {
      sessionStorage.removeItem('elu-mock-just-verified');
    } catch {
      /* ignore */
    }
  };

  const fetchExpertData = useCallback(async () => {
    try {
      const backendMode = getBackendMode();
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 300));
        ensureMockExpertDemoState(user?.id);

        const {
          mockExperts,
          mockExpertAppointments,
          mockOnboardingExpertProfile,
          MOCK_ONBOARDING_EXPERT_USER_ID,
        } = await import('@/lib/backend/mock/data');

        const isOnboardingDemo = user?.id === MOCK_ONBOARDING_EXPERT_USER_ID;

        if (isOnboardingDemo) {
          let checklistOverrides: Partial<typeof mockOnboardingExpertProfile> = {};
          try {
            const raw = sessionStorage.getItem('elu-mock-expert-checklist');
            if (raw) checklistOverrides = JSON.parse(raw);
          } catch {
            /* ignore */
          }

          setGreetingName(
            firstNameFrom(
              checklistOverrides.full_name ||
                mockOnboardingExpertProfile.full_name ||
                user?.fullName
            )
          );
          setExpertProfile({
            id: mockOnboardingExpertProfile.id,
            verification_status:
              checklistOverrides.verification_status ||
              mockOnboardingExpertProfile.verification_status,
            checklist_stammdaten_completed:
              checklistOverrides.checklist_stammdaten_completed ??
              mockOnboardingExpertProfile.checklist_stammdaten_completed,
            checklist_qualifications_uploaded:
              checklistOverrides.checklist_qualifications_uploaded ??
              mockOnboardingExpertProfile.checklist_qualifications_uploaded,
            checklist_offers_created:
              checklistOverrides.checklist_offers_created ??
              mockOnboardingExpertProfile.checklist_offers_created,
            checklist_availability_set:
              checklistOverrides.checklist_availability_set ??
              mockOnboardingExpertProfile.checklist_availability_set,
            checklist_stripe_connected:
              checklistOverrides.checklist_stripe_connected ??
              loadStripeConnectStatus(user?.id).completed ??
              mockOnboardingExpertProfile.checklist_stripe_connected,
            checklist_abo_active:
              (checklistOverrides as { checklist_abo_active?: boolean }).checklist_abo_active ??
              hasActiveSubscriptionAccess(loadExpertSubscription(user?.id)),
            qualification_verified:
              checklistOverrides.qualification_verified ??
              mockOnboardingExpertProfile.qualification_verified,
            bio: checklistOverrides.bio ?? mockOnboardingExpertProfile.bio,
            profile_image_url:
              checklistOverrides.profile_image_url ??
              mockOnboardingExpertProfile.profile_image_url,
          });
          setStats({ weeklyAppointments: 0, newBookings: 0, monthlyRevenue: 0 });
          setRecentReviews([]);
          setLoading(false);
          return;
        }

        setGreetingName(firstNameFrom(mockExperts[0]?.full_name || user?.fullName));
        setExpertProfile({
          id: 'mock-expert-1',
          verification_status: 'verified',
          checklist_stammdaten_completed: true,
          checklist_qualifications_uploaded: true,
          checklist_offers_created: true,
          checklist_availability_set: true,
          checklist_stripe_connected: true,
          checklist_abo_active: true,
          qualification_verified: true,
          bio: 'Zertifizierte Physiotherapeutin mit 8 Jahren Erfahrung',
          profile_image_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
        });
        
        // Calculate mock stats from mock appointments
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        
        const weeklyAppointments = mockExpertAppointments.filter(apt => {
          const aptDate = new Date(apt.start_time);
          return (
            aptDate >= weekStart &&
            aptDate < weekEnd &&
            (apt.status === 'confirmed' || apt.status === 'completed')
          );
        }).length;

        const newBookings = mockExpertAppointments.filter((apt) => apt.is_new_booking).length;
        
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const monthlyRevenue = mockExpertAppointments
          .filter(apt => {
            const aptDate = new Date(apt.start_time);
            return (
              aptDate >= monthStart &&
              aptDate <= monthEnd &&
              (apt.status === 'confirmed' || apt.status === 'completed')
            );
          })
          .reduce((sum, apt) => sum + (apt.total_price || 0), 0);
        
        setStats({
          weeklyAppointments,
          newBookings,
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

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .maybeSingle();
      setGreetingName(firstNameFrom(userProfile?.full_name || user?.fullName));

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
          
          const newBookings = appointments.filter(
            (apt) => apt.status === 'confirmed' || apt.status === 'requested'
          ).length;
          
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
            newBookings,
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
  }, [user?.id, user?.fullName]);

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
        key: 'stammdaten'
      },
      {
        title: 'Qualifikationen hochladen',
        description: 'Mind. 1 anerkannte Ausbildung (PDF oder Bild)',
        status: qualStatus,
        link: '/app/expert-profil',
        key: 'qualifications'
      },
      {
        title: 'Angebot(e) anlegen',
        description: 'Titel, Preis, Dauer, Format',
        status: expertProfile?.checklist_offers_created ? 'completed' : 'pending',
        link: '/app/angebote',
        key: 'offers'
      },
      {
        title: 'elu Abo aktivieren',
        description: 'Erforderlich, um neue Angebote anzulegen',
        status:
          expertProfile?.checklist_abo_active ||
          hasActiveSubscriptionAccess(loadExpertSubscription(user?.id))
            ? 'completed'
            : 'pending',
        link: '/app/expert-profil?tab=konto',
        key: 'abo'
      },
      {
        title: 'Verfügbarkeit anlegen',
        description: 'Mind. 1 wiederkehrender Zeitblock',
        status: expertProfile?.checklist_availability_set ? 'completed' : 'pending',
        link: '/app/kalender',
        key: 'availability'
      },
      {
        title: 'Stripe Connect verknüpfen',
        description: 'Auszahlungen einrichten',
        status: expertProfile?.checklist_stripe_connected ? 'completed' : 'pending',
        link: '/app/expert-profil?tab=konto',
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
  const isPendingReview =
    verificationStatus === 'not_verified_pending_review' ||
    (verificationStatus === 'pending' &&
      !!expertProfile?.checklist_qualifications_uploaded &&
      !expertProfile?.qualification_verified);
  const isIncomplete =
    !isVerified &&
    !isPendingReview &&
    (verificationStatus === 'not_verified_incomplete' ||
      verificationStatus === 'pending' ||
      verificationStatus === 'rejected');
  const isProfileOnline = isVerified;

  const getStatusBadge = () => {
    if (isProfileOnline) {
      return (
        <Badge className="text-text-dark text-sm px-3 py-1.5 font-body bg-info-bg border border-primary-blue">
          <CheckCircle2 className="w-4 h-4 mr-1.5" style={{ color: '#6D8EEC' }} />
          <span style={{ color: '#6D8EEC' }}>Profil: online</span>
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-600 text-sm px-3 py-1.5 font-body border-gray-300">
        <Circle className="w-4 h-4 mr-1.5" />
        Profil: offline
      </Badge>
    );
  };

  const getAlertMessage = () => {
    if (isVerified) {
      if (!showVerifiedToast) return null;
      return (
        <Alert
          className="border border-primary-blue/40 bg-info-bg cursor-pointer"
          onClick={dismissVerifiedToast}
        >
          <CheckCircle2 className="h-4 w-4 text-primary-blue" />
          <AlertDescription className="ml-2 text-sm text-text-dark font-body">
            Du bist verifiziert — dein Profil ist sichtbar und buchbar.
          </AlertDescription>
        </Alert>
      );
    }
    if (isPendingReview) {
      return (
        <Alert className="border border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="ml-2 text-sm text-yellow-900 font-body">
            Dokumente in Prüfung — Freigabe in der Regel in 1–2 Werktagen.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const welcomeSubtitle = isIncomplete
    ? 'Du bist noch nicht verifiziert. Bitte schließe alle 5 Schritte unten ab und warte auf unsere Qualifikationsprüfung.'
    : 'Verwalte deine Angebote, Termine und Finanzen.';

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4 max-w-7xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl border-2 border-primary-blue/15 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-info-bg/80 via-white to-primary-green/15" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-blue/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary-green/20 blur-2xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 sm:p-6 md:p-7">
          <div className="max-w-xl space-y-2">
            <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-text-dark leading-tight">
              Willkommen
              {greetingName ? (
                <>
                  ,{' '}
                  <span className="bg-gradient-to-r from-primary-blue to-primary-green bg-clip-text text-transparent">
                    {greetingName}
                  </span>
                </>
              ) : null}
              !
            </h1>
            <p className="font-body text-gray-600 text-sm leading-relaxed">
              {welcomeSubtitle}
            </p>
          </div>

          <div className="shrink-0">{getStatusBadge()}</div>
        </div>
      </section>

      {getAlertMessage()}

      {!isVerified && (
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="px-4 sm:px-5 pt-4 pb-2 space-y-1">
            <CardTitle className="font-heading text-base sm:text-lg">
              Verifizierungs-Checkliste
            </CardTitle>
            <CardDescription className="font-body text-xs sm:text-sm">
              {completedItems} von {checklist.length} Schritten abgeschlossen
              {inReviewItems > 0 && ` · ${inReviewItems} in Prüfung`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 space-y-3">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-primary-blue to-primary-green h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(completedItems / checklist.length) * 100}%` }}
              />
            </div>

            <div className="space-y-2">
              {checklist.map((item) => {
                const isComplete = item.status === 'completed';
                const isInReview = item.status === 'in_review';

                return (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-start gap-2.5 p-2.5 sm:p-3 rounded-lg border bg-white transition-colors',
                      isComplete
                        ? 'border-primary-blue/50'
                        : isInReview
                          ? 'border-yellow-200 bg-yellow-50/50'
                          : 'border-gray-200 hover:border-primary-blue/40'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 shrink-0',
                        isComplete
                          ? 'text-primary-blue'
                          : isInReview
                            ? 'text-yellow-600'
                            : 'text-gray-400'
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isInReview ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-semibold text-sm text-text-dark">
                          {item.title}
                        </h3>
                        <p className="text-gray-500 font-body text-xs mt-0.5 leading-relaxed">
                          {item.description}
                        </p>
                        {isInReview && (
                          <p className="text-[11px] text-yellow-700 font-medium mt-1">
                            Dokument hochgeladen – warte auf Freigabe
                          </p>
                        )}
                      </div>

                      {!isInReview && (
                        <Link href={item.link} className="shrink-0">
                          <Button
                            variant={isComplete ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                              'h-8 min-w-[7.5rem] text-xs font-body px-3',
                              isComplete ? '' : 'bg-primary-blue hover:bg-primary-blue/90'
                            )}
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
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-yellow-900">
                      Checkliste vollständig
                    </h4>
                    <p className="text-xs text-yellow-700 font-body mt-0.5 leading-relaxed">
                      Alle Schritte sind abgeschlossen. Deine Qualifikationen werden geprüft – du
                      erhältst eine E-Mail nach Freigabe.
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
            <Link
              href="/app/kalender"
              className="relative block rounded-xl border-2 bg-white transition-colors outline-none hover:border-primary-blue focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-1.5 pt-3.5 px-4">
                  <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
                    <Calendar className="w-5 h-5 text-primary-blue" />
                    Termine diese Woche
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3.5">
                  <p className="text-3xl font-heading font-bold text-text-dark">
                    {stats.weeklyAppointments}
                  </p>
                </CardContent>
              </Card>
              <ArrowRight className="absolute bottom-3.5 right-3.5 w-4 h-4 text-primary-blue" aria-hidden />
            </Link>

            <Link
              href="/app/termine"
              className="relative block rounded-xl border-2 bg-white transition-colors outline-none hover:border-primary-blue focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-1.5 pt-3.5 px-4">
                  <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
                    <Users className="w-5 h-5 text-primary-blue" />
                    Neue Buchungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3.5">
                  <p className="text-3xl font-heading font-bold text-text-dark">
                    {stats.newBookings}
                  </p>
                </CardContent>
              </Card>
              <ArrowRight className="absolute bottom-3.5 right-3.5 w-4 h-4 text-primary-blue" aria-hidden />
            </Link>

            <Link
              href="/app/finanzen"
              className="relative block rounded-xl border-2 bg-white transition-colors outline-none hover:border-primary-blue focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="pb-1.5 pt-3.5 px-4">
                  <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
                    <TrendingUp className="w-5 h-5 text-primary-blue" />
                    Umsatz diesen Monat
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3.5">
                  <p className="text-3xl font-heading font-bold text-text-dark">
                    €{stats.monthlyRevenue.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <ArrowRight className="absolute bottom-3.5 right-3.5 w-4 h-4 text-primary-blue" aria-hidden />
            </Link>
          </div>

          <div>
            <AppointmentCalendar role="expert" />
          </div>

          {/* Recent Reviews – same layout as client-facing expert profile */}
          {recentReviews.length > 0 && (
            <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
              <Card className="border-2 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-lg sm:text-xl font-semibold text-text-dark">
                        Aktuelle Bewertungen
                      </p>
                      <p className="text-sm text-gray-500 font-body mt-0.5">
                        Die letzten {recentReviews.length} Bewertungen von Kund:innen
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200',
                        reviewsOpen && 'rotate-180'
                      )}
                    />
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-gray-100">
                    <div className="space-y-3 pt-4">
                      {recentReviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex flex-col items-center w-[4.5rem] shrink-0">
                              <Avatar className="w-11 h-11">
                                <AvatarImage
                                  src={review.client?.avatar_url}
                                  alt={review.client?.full_name}
                                />
                                <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-xs">
                                  {(review.client?.full_name || 'A')
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-heading font-semibold text-text-dark text-xs text-center mt-2 leading-snug line-clamp-2 w-full">
                                {review.client?.full_name || 'Anonym'}
                              </p>
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                {review.title ? (
                                  <p className="font-heading font-semibold text-text-dark text-sm leading-snug min-w-0">
                                    {review.title}
                                  </p>
                                ) : (
                                  <span className="min-w-0" />
                                )}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3.5 h-3.5 ${
                                        star <= review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 font-body leading-relaxed">
                                {review.review_text}
                              </p>

                              <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                                {review.appointment?.offer?.title ? (
                                  <p className="text-xs text-gray-500 font-body min-w-0 truncate">
                                    Session: {review.appointment.offer.title}
                                  </p>
                                ) : (
                                  <span />
                                )}
                                <span className="text-xs text-gray-500 font-body shrink-0">
                                  {format(parseISO(review.created_at), 'dd. MMM yyyy', {
                                    locale: de,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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
