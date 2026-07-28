'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Target, Calendar, Receipt, Settings, Download, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';

const GOALS_OPTIONS = [
  'Rückenschmerzen',
  'Stress',
  'Fitness',
  'Langlebigkeit',
  'Energie',
  'Ernährung',
  'Gewichtsmanagement',
  'Mobility',
  'Kraftaufbau',
  'Mental Health',
];

interface PastBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  expert: {
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
}

export default function ProfilePage() {
  const { user, role } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        // Mock data
        setName('Max Mustermann');
        setPhone('+49 170 1234567');
        setGoals(['Fitness', 'Stress', 'Energie']);
        setLoading(false);
        return;
      }

      const [profileData, preferencesData] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('client_preferences')
          .select('goals')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (profileData.data) {
        setName(profileData.data.full_name || '');
        setPhone(profileData.data.phone || '');
      }

      if (preferencesData.data) {
        setGoals(preferencesData.data.goals || []);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadPastBookings = useCallback(async () => {
    if (role !== 'client' || !user?.id) return;

    setLoadingBookings(true);
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        // Mock past bookings
        await new Promise(resolve => setTimeout(resolve, 300));
        setPastBookings([
          {
            id: 'past-1',
            start_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
            status: 'completed',
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
            id: 'past-2',
            start_time: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
            status: 'completed',
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
        ]);
        setLoadingBookings(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
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
          .in('status', ['completed', 'cancelled_by_client', 'cancelled_by_expert'])
          .order('start_time', { ascending: false })
          .limit(20);

        if (error) throw error;

        setPastBookings(data.map((apt: any) => {
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
    } catch (error) {
      console.error('Error loading past bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadPastBookings();
    }
  }, [activeTab, loadPastBookings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 500));
        toast({
          title: 'Erfolgreich gespeichert',
          description: 'Deine Profildaten wurden aktualisiert.'
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Erfolgreich gespeichert',
        description: 'Deine Profildaten wurden aktualisiert.'
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoalsSave = async () => {
    if (role !== 'client' || !user?.id) return;

    setSaving(true);
    try {
      const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
      
      if (backendMode === 'mock') {
        await new Promise(resolve => setTimeout(resolve, 500));
        toast({
          title: 'Ziele aktualisiert',
          description: 'Deine Gesundheitsziele wurden gespeichert.'
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('client_preferences')
        .upsert({
          user_id: user.id,
          goals: goals,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: 'Ziele aktualisiert',
        description: 'Deine Gesundheitsziele wurden gespeichert.'
      });
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReceipt = async (bookingId: string) => {
    // In a real implementation, this would generate/download a PDF receipt
    toast({
      title: 'Rechnung wird generiert',
      description: 'Die Rechnung wird für dich vorbereitet...'
    });
    
    // Simulate receipt generation
    setTimeout(() => {
      toast({
        title: 'Rechnung heruntergeladen',
        description: 'Die Rechnung wurde erfolgreich generiert.'
      });
    }, 1500);
  };

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
            Mein Profil
          </h1>
          <p className="text-gray-600 font-body">
            Verwalte deine persönlichen Informationen
          </p>
        </div>

        <div className="max-w-4xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full mb-6 ${role === 'client' ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <TabsTrigger value="profile" className="font-body">
                <User className="w-4 h-4 mr-2" />
                Profil
              </TabsTrigger>
              {role === 'client' && (
                <>
                  <TabsTrigger value="goals" className="font-body">
                    <Target className="w-4 h-4 mr-2" />
                    Ziele
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="font-body">
                    <Calendar className="w-4 h-4 mr-2" />
                    Vergangene Buchungen
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="settings" className="font-body">
                <Settings className="w-4 h-4 mr-2" />
                Einstellungen
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-2xl">
                        <User className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-heading text-2xl text-text-dark">
                        Profil bearbeiten
                      </CardTitle>
                      <CardDescription className="font-body">
                        Aktualisiere deine Kontaktdaten
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-body">E-Mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="font-body bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 font-body">Deine E-Mail-Adresse kann nicht geändert werden</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-body">Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Dein vollständiger Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="font-body"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-body">Telefon</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+49 123 456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="font-body"
                      />
                    </div>

                    <Button 
                      type="submit"
                      onClick={handleSubmit}
                      disabled={saving}
                      className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
                    >
                      {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Goals Tab (Client only) */}
            {role === 'client' && (
              <TabsContent value="goals">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl text-text-dark flex items-center gap-2">
                      <Target className="w-6 h-6 text-primary-blue" />
                      Meine Gesundheitsziele
                    </CardTitle>
                    <CardDescription className="font-body">
                      Wähle deine Ziele aus, um passende Expert:innen zu finden
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {GOALS_OPTIONS.map((goal) => {
                          const isSelected = goals.includes(goal);
                          return (
                            <Badge
                              key={goal}
                              variant={isSelected ? 'default' : 'outline'}
                              className={`cursor-pointer font-body text-sm py-2 px-4 ${
                                isSelected
                                  ? 'bg-primary-blue text-white hover:bg-primary-blue/90'
                                  : 'hover:bg-gray-100'
                              }`}
                              onClick={() => toggleGoal(goal)}
                            >
                              {goal}
                              {isSelected && <CheckCircle2 className="w-3 h-3 ml-2" />}
                            </Badge>
                          );
                        })}
                      </div>

                      <Button
                        onClick={handleGoalsSave}
                        disabled={saving}
                        className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body"
                      >
                        {saving ? 'Wird gespeichert...' : 'Ziele speichern'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Past Bookings Tab (Client only) */}
            {role === 'client' && (
              <TabsContent value="bookings">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="font-heading text-2xl text-text-dark flex items-center gap-2">
                      <Calendar className="w-6 h-6 text-primary-blue" />
                      Vergangene Buchungen
                    </CardTitle>
                    <CardDescription className="font-body">
                      Sieh dir deine abgeschlossenen Termine an und lade Rechnungen herunter
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingBookings ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div>
                      </div>
                    ) : pastBookings.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-body">Noch keine vergangenen Buchungen</p>
                        <Link href="/app/experten">
                          <Button variant="outline" className="mt-4 font-body">
                            Expert:innen finden
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pastBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className="p-4 rounded-lg border-2 bg-white hover:border-primary-blue transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs">
                                    {booking.expert.full_name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-heading font-semibold text-sm text-text-dark">
                                      {booking.offer.title}
                                    </p>
                                    {booking.status === 'completed' && (
                                      <Badge className="bg-info-bg text-info-text border-none text-xs font-body">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Abgeschlossen
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 font-body mb-1">
                                    mit {booking.expert.full_name}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 font-body">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {format(parseISO(booking.start_time), 'd. MMM yyyy', { locale: de })} •{' '}
                                      {format(parseISO(booking.start_time), 'HH:mm', { locale: de })} Uhr
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <p className="font-heading font-bold text-sm text-text-dark">
                                  €{booking.total_price.toFixed(2)}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadReceipt(booking.id)}
                                  className="font-body text-xs"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Rechnung
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="font-heading text-2xl text-text-dark flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary-blue" />
                    Einstellungen
                  </CardTitle>
                  <CardDescription className="font-body">
                    Verwalte deine Account-Einstellungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                      <div>
                        <h3 className="font-heading font-semibold text-text-dark mb-1">E-Mail-Benachrichtigungen</h3>
                        <p className="text-sm text-gray-600 font-body">Erhalte Updates zu deinen Buchungen</p>
                      </div>
                      <Button variant="outline" size="sm" className="font-body">
                        Aktivieren
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                      <div>
                        <h3 className="font-heading font-semibold text-text-dark mb-1">Datenschutz</h3>
                        <p className="text-sm text-gray-600 font-body">Verwalte deine Datenschutzeinstellungen</p>
                      </div>
                      <Button variant="outline" size="sm" className="font-body">
                        Verwalten
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border-2 rounded-lg">
                      <div>
                        <h3 className="font-heading font-semibold text-text-dark mb-1">Account löschen</h3>
                        <p className="text-sm text-gray-600 font-body">Permanente Löschung deines Accounts</p>
                      </div>
                      <Button variant="outline" size="sm" className="font-body text-red-600 hover:text-red-700">
                        Löschen
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
