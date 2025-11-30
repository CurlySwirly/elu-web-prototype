'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Calendar, Clock, AlertCircle, CheckCircle2, MapPin, CreditCard, ExternalLink } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  expert_name: string;
  room_name: string;
  amount: number;
  status: string;
  date: string;
}

export default function ProviderFinancesPage() {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [connectingStripe, setConnectingStripe] = useState(false);

  const [stats, setStats] = useState({
    thisMonth: 0,
    last30Days: 0,
    total: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    if (userId) {
      loadFinancialData();
      checkStripeStatus();
    }
  }, [userId]);

  const checkStripeStatus = async () => {
    try {
      const { data } = await supabase
        .from('provider_profiles')
        .select('stripe_account_id, stripe_onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setStripeConnected(data.stripe_onboarding_completed || false);
        setStripeAccountId(data.stripe_account_id || '');
      }
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      toast({
        title: 'Stripe Connect',
        description: 'In der Produktionsversion werden Sie zu Stripe weitergeleitet, um Ihr Konto zu verbinden.'
      });

      setTimeout(async () => {
        const mockStripeAccountId = `acct_${Date.now()}`;

        const { data: profile } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('provider_profiles')
            .update({
              stripe_account_id: mockStripeAccountId,
              stripe_onboarding_completed: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          setStripeConnected(true);
          setStripeAccountId(mockStripeAccountId);

          toast({
            title: 'Erfolgreich verbunden',
            description: 'Ihr Stripe-Konto wurde erfolgreich verbunden.'
          });
        }

        setConnectingStripe(false);
      }, 2000);
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: 'Fehler',
        description: 'Stripe-Konto konnte nicht verbunden werden.',
        variant: 'destructive'
      });
      setConnectingStripe(false);
    }
  };

  const loadFinancialData = async () => {
    try {
      const { data: providerProfile } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (providerProfile) {
        const { data: rooms } = await supabase
          .from('rooms')
          .select('id')
          .eq('provider_id', providerProfile.id);

        if (rooms && rooms.length > 0) {
          const roomIds = rooms.map(r => r.id);

          const { data, error } = await supabase
            .from('room_bookings')
            .select(`
              id,
              start_time,
              total_price,
              status,
              rooms:room_id (
                name
              ),
              expert_profiles:expert_id (
                profiles:user_id (
                  full_name
                )
              )
            `)
            .in('room_id', roomIds)
            .in('status', ['confirmed', 'completed'])
            .order('start_time', { ascending: false });

          if (error) throw error;

          const mappedTransactions: Transaction[] = data.map((booking: any) => {
            const expertProfiles = Array.isArray(booking.expert_profiles)
              ? booking.expert_profiles[0]
              : booking.expert_profiles;
            const expertProfile = Array.isArray(expertProfiles?.profiles)
              ? expertProfiles?.profiles[0]
              : expertProfiles?.profiles;
            const room = Array.isArray(booking.rooms) ? booking.rooms[0] : booking.rooms;

            return {
              id: booking.id,
              expert_name: expertProfile?.full_name || 'Unbekannt',
              room_name: room?.name || 'Unbekannt',
              amount: booking.total_price,
              status: booking.status,
              date: booking.start_time,
            };
          });

          setTransactions(mappedTransactions);

          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          const thirtyDaysAgo = subDays(now, 30);

          const thisMonth = mappedTransactions
            .filter(t => {
              const date = parseISO(t.date);
              return date >= monthStart && date <= monthEnd && t.status === 'completed';
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const last30Days = mappedTransactions
            .filter(t => {
              const date = parseISO(t.date);
              return date >= thirtyDaysAgo && t.status === 'completed';
            })
            .reduce((sum, t) => sum + t.amount, 0);

          const total = mappedTransactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);

          const pending = mappedTransactions
            .filter(t => t.status === 'confirmed')
            .reduce((sum, t) => sum + t.amount, 0);

          const completed = mappedTransactions
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);

          setStats({
            thisMonth,
            last30Days,
            total,
            pending,
            completed,
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success-bg text-success-text';
      case 'confirmed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Abgeschlossen';
      case 'confirmed': return 'Bestätigt';
      default: return status;
    }
  };

  const filterTransactionsByStatus = (status?: string) => {
    if (!status) return transactions;
    return transactions.filter(t => t.status === status);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Finanzen
        </h1>
        <p className="text-gray-600 font-body">
          Übersicht über deine Raum-Vermietungen und Einnahmen
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-2 mb-8">
        <CardHeader>
          <CardTitle className="font-heading text-xl flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary-blue" />
            Zahlungsdaten (Stripe Connect)
          </CardTitle>
          <CardDescription className="font-body">
            Verbinden Sie Ihr Stripe-Konto für automatische Auszahlungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stripeConnected ? (
            <div>
              <Alert className="mb-4 border-info-text bg-info-bg">
                <AlertCircle className="h-4 w-4 text-info-text" />
                <AlertDescription className="text-info-text font-body">
                  Um Auszahlungen zu erhalten, müssen Sie Ihr Stripe-Konto verbinden.
                  Nach jedem abgeschlossenen Termin wird die Vergütung automatisch auf Ihr Konto überwiesen.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body"
                >
                  {connectingStripe ? 'Wird verbunden...' : 'Stripe Konto verbinden'}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="font-body" disabled>
                  Mehr über Stripe erfahren
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-heading font-semibold text-green-900 mb-1">
                    Stripe Konto verbunden
                  </h3>
                  <p className="text-sm text-green-700 font-body mb-2">
                    Auszahlungen werden automatisch nach jedem abgeschlossenen Termin auf Ihr Konto überwiesen.
                  </p>
                  {stripeAccountId && (
                    <p className="text-xs text-green-600 font-mono">
                      Konto-ID: {stripeAccountId}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" className="font-body">
                Dashboard öffnen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
              <Calendar className="w-5 h-5 text-primary-blue" />
              Dieser Monat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">€{stats.thisMonth.toFixed(2)}</p>
            <p className="text-sm text-gray-600 font-body mt-1">Abgeschlossene Vermietungen</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
              <Clock className="w-5 h-5 text-primary-blue" />
              Letzte 30 Tage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">€{stats.last30Days.toFixed(2)}</p>
            <p className="text-sm text-gray-600 font-body mt-1">Abgeschlossene Vermietungen</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
              <TrendingUp className="w-5 h-5 text-success-text" />
              Gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">€{stats.total.toFixed(2)}</p>
            <p className="text-sm text-gray-600 font-body mt-1">Alle Einnahmen</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base text-gray-600">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              Ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">€{stats.pending.toFixed(2)}</p>
            <p className="text-sm text-gray-600 font-body mt-1">Bestätigte Vermietungen</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-text-dark">Transaktionsverlauf</CardTitle>
          <CardDescription className="font-body">Alle deine Raum-Vermietungen im Detail</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-body mb-2">Noch keine Transaktionen vorhanden</p>
              <p className="text-sm text-gray-500 font-body">
                Sobald Expert:innen deine Räume buchen, erscheinen die Einnahmen hier.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="all" className="font-body">
                  Alle ({transactions.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="font-body">
                  Abgeschlossen ({filterTransactionsByStatus('completed').length})
                </TabsTrigger>
                <TabsTrigger value="confirmed" className="font-body">
                  Bestätigt ({filterTransactionsByStatus('confirmed').length})
                </TabsTrigger>
              </TabsList>

              {['all', 'completed', 'confirmed'].map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue}>
                  <div className="space-y-3">
                    {filterTransactionsByStatus(tabValue === 'all' ? undefined : tabValue).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-blue to-primary-green flex items-center justify-center">
                              {transaction.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              ) : (
                                <Clock className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-text-dark font-body">
                                {transaction.room_name}
                              </div>
                              <div className="text-sm text-gray-600 font-body">
                                Gebucht von {transaction.expert_name}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 font-body ml-13">
                            {format(parseISO(transaction.date), 'dd. MMMM yyyy, HH:mm', { locale: de })} Uhr
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-heading font-bold text-text-dark mb-1">
                            €{transaction.amount.toFixed(2)}
                          </div>
                          <Badge className={`${getStatusColor(transaction.status)} border-none text-xs`}>
                            {getStatusLabel(transaction.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {filterTransactionsByStatus(tabValue === 'all' ? undefined : tabValue).length === 0 && (
                    <div className="text-center py-12">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 font-body">
                        Keine Transaktionen in dieser Kategorie
                      </p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
