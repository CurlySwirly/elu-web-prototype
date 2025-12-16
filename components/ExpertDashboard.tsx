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
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AppointmentCalendar from './AppointmentCalendar';

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

  const fetchExpertData = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setExpertProfile(profile);
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
      <div className="p-8">
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
        <Badge className="bg-green-100 text-green-800 border-green-200 text-base px-4 py-2">
          <ShieldCheck className="w-4 h-4 mr-2" />
          Verified Expert
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
        <Alert className="border-2 border-green-200 bg-green-50">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertDescription className="ml-2 text-green-900">
            <strong className="font-semibold">Du bist verifiziert!</strong> Dein Profil ist jetzt sichtbar und buchbar. Expert:innen können dich finden und Termine vereinbaren.
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
            Expert:innen Dashboard
          </h1>
          <p className="text-gray-600 font-body">
            Verwalte deine Angebote, Termine und Finanzen
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {getAlertMessage()}

      {!isVerified && (
        <Card className="border-2 mt-8">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Verifizierungs-Checkliste</CardTitle>
            <CardDescription className="font-body text-base">
              {completedItems} von {checklist.length} Schritten abgeschlossen
              {inReviewItems > 0 && ` • ${inReviewItems} in Prüfung`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
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
                        ? 'bg-green-50 border-green-200'
                        : isInReview
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-white border-gray-200 hover:border-primary-blue'
                    }`}
                  >
                    <div className={`mt-1 ${
                      isComplete
                        ? 'text-green-600'
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-8">
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

          <AppointmentCalendar role="expert" />

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
