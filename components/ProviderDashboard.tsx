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
  CreditCard,
  Building2,
  FileText,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProviderProfile {
  id: string;
  approval_status: string;
  profile_completed: boolean;
  stripe_onboarding_completed: boolean;
  has_active_rooms: boolean;
  company_name: string;
  business_name: string;
}

interface ProviderOnboarding {
  ready_for_approval: boolean;
  stripe_connected: boolean;
  rooms_created: boolean;
  onboarding_completed: boolean;
}

interface ChecklistItem {
  title: string;
  description: string;
  status: 'completed' | 'partial' | 'pending';
  link: string;
  icon: any;
  key: string;
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [onboarding, setOnboarding] = useState<ProviderOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weeklyBookings: 0,
    activeRooms: 0,
    monthlyRevenue: 0
  });

  const fetchProviderData = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        setProviderProfile(profile);

        const { data: onboardingData } = await supabase
          .from('provider_onboarding')
          .select('*')
          .eq('provider_profile_id', profile.id)
          .maybeSingle();

        setOnboarding(onboardingData);

        const { count: roomCount } = await supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', profile.id);

        setStats(prev => ({ ...prev, activeRooms: roomCount || 0 }));
      }
    } catch (error) {
      console.error('Error fetching provider data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchProviderData();
    }
  }, [user, fetchProviderData]);

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
    return [
      {
        title: 'Stammdaten vervollständigen',
        description: 'Firmenname, Adresse, Kontaktdaten und Rechnungsinformationen',
        status: providerProfile?.profile_completed ? 'completed' : 'pending',
        link: '/app/profil',
        icon: FileText,
        key: 'profile'
      },
      {
        title: 'Zahlungsdaten (Stripe) hinterlegen',
        description: 'Stripe Konto verbinden für automatische Auszahlungen',
        status: providerProfile?.stripe_onboarding_completed ? 'completed' : 'pending',
        link: '/app/finanzen-provider',
        icon: CreditCard,
        key: 'stripe'
      },
      {
        title: 'Räume anlegen',
        description: 'Mindestens einen Raum mit Fotos und Verfügbarkeiten erstellen',
        status: providerProfile?.has_active_rooms ? 'completed' : 'pending',
        link: '/app/raeume',
        icon: Building2,
        key: 'rooms'
      }
    ];
  };

  const checklist = getChecklist();
  const completedItems = checklist.filter(item => item.status === 'completed').length;
  const allComplete = completedItems === checklist.length;
  const isApproved = providerProfile?.approval_status === 'approved';
  const isPending = providerProfile?.approval_status === 'pending' && allComplete;

  const getStatusBadge = () => {
    if (isApproved) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Freigegeben
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          In Prüfung
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-600">
        <Circle className="w-3 h-3 mr-1" />
        Profil unvollständig
      </Badge>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
            Raumanbieter Dashboard
          </h1>
          <p className="text-gray-600 font-body">
            {providerProfile?.business_name || providerProfile?.company_name || 'Willkommen'}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {!isApproved && (
        <Alert className="mb-8 border-2 border-info-text bg-info-bg">
          <AlertCircle className="h-5 w-5 text-info-text" />
          <AlertDescription className="ml-2">
            {!allComplete && (
              <>
                <strong className="font-semibold">Profil unvollständig:</strong> Vervollständigen Sie alle drei Schritte unten, um Ihr Profil zur Freigabe einzureichen.
              </>
            )}
            {allComplete && !isPending && (
              <>
                <strong className="font-semibold">Bereit zur Prüfung:</strong> Alle Schritte abgeschlossen! Ihr Profil wird automatisch zur Admin-Freigabe weitergeleitet.
              </>
            )}
            {isPending && (
              <>
                <strong className="font-semibold">In Prüfung:</strong> Ihr Profil wird gerade von unserem Team geprüft. Sie erhalten eine Benachrichtigung, sobald Ihre Räume freigegeben sind.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!isApproved && (
        <Card className="border-2 mb-8">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Onboarding Checkliste</CardTitle>
            <CardDescription className="font-body text-base">
              {completedItems} von {checklist.length} Schritten abgeschlossen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-green h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(completedItems / checklist.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-4">
              {checklist.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                      item.status === 'completed'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-200 hover:border-primary-blue'
                    }`}
                  >
                    <div className={`mt-1 ${
                      item.status === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-400'
                    }`}>
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6" />
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
                        </div>
                        <Icon className="w-8 h-8 text-primary-blue flex-shrink-0" />
                      </div>

                      <Link href={item.link}>
                        <Button
                          variant={item.status === 'completed' ? 'outline' : 'default'}
                          size="sm"
                          className={item.status === 'completed' ? '' : 'bg-primary-blue hover:bg-primary-blue/90'}
                        >
                          {item.status === 'completed' ? 'Bearbeiten' : 'Jetzt ausfüllen'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {allComplete && !isPending && (
              <div className="mt-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-heading font-semibold text-green-900 mb-1">
                      Checkliste vollständig!
                    </h4>
                    <p className="text-sm text-green-700 font-body">
                      Ihr Profil wird automatisch zur Admin-Prüfung weitergeleitet. Sie erhalten eine Benachrichtigung per E-Mail, sobald Ihre Räume freigegeben sind.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isApproved && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Calendar className="w-5 h-5 text-primary-blue" />
                  Buchungen diese Woche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-text-dark">{stats.weeklyBookings}</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <Building2 className="w-5 h-5 text-primary-blue" />
                  Aktive Räume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-text-dark">{stats.activeRooms}</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-lg">
                  <TrendingUp className="w-5 h-5 text-primary-blue" />
                  Einnahmen diesen Monat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-heading font-bold text-text-dark">€{stats.monthlyRevenue.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Aktuelle Buchungen</CardTitle>
                <CardDescription className="font-body">Übersicht Ihrer Raumbuchungen</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 font-body">Alle Räume verfügbar. Warten auf Buchungen.</p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Schnellzugriff</CardTitle>
                <CardDescription className="font-body">Häufig verwendete Funktionen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/app/raeume">
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="w-4 h-4 mr-2" />
                    Räume verwalten
                  </Button>
                </Link>
                <Link href="/app/kalender">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="w-4 h-4 mr-2" />
                    Verfügbarkeiten bearbeiten
                  </Button>
                </Link>
                <Link href="/app/finanzen-provider">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Auszahlungen ansehen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
