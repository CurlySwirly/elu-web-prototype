'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Euro, TrendingUp, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Transaction {
  id: string;
  client_name: string;
  offer_title: string;
  amount: number;
  status: string;
  date: string;
}

export default function FinancesPage() {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({
    thisMonth: 0,
    last30Days: 0,
    total: 0,
    pending: 0,
    completed: 0,
  });

  const loadFinancialData = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('expert_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile) {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            total_price,
            status,
            profiles:client_id (
              full_name
            ),
            expert_offers:offer_id (
              title
            )
          `)
          .eq('expert_id', profile.id)
          .in('status', ['confirmed', 'completed'])
          .order('start_time', { ascending: false });

        if (error) throw error;

        const mappedTransactions: Transaction[] = data.map((apt: any) => ({
          id: apt.id,
          client_name: apt.profiles?.full_name || 'Unbekannt',
          offer_title: apt.expert_offers?.title || 'Unbekannt',
          amount: apt.total_price,
          status: apt.status,
          date: apt.start_time,
        }));

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadFinancialData();
    }
  }, [userId, loadFinancialData]);

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
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
          Finanzen
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-body mt-1">
          Übersicht über deine Einnahmen und Transaktionen
        </p>
      </div>

      {error && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      <Alert className="mb-6 border-info-text bg-info-bg">
        <AlertCircle className="h-4 w-4 text-info-text" />
        <AlertDescription className="text-info-text font-body">
          Mock-Finanzübersicht: In der Produktionsumgebung werden echte Zahlungen über Stripe Connect abgewickelt.
        </AlertDescription>
      </Alert>

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
            <p className="text-sm text-gray-600 font-body mt-1">Abgeschlossene Sessions</p>
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
            <p className="text-sm text-gray-600 font-body mt-1">Abgeschlossene Sessions</p>
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
              <Euro className="w-5 h-5 text-yellow-500" />
              Ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-text-dark">€{stats.pending.toFixed(2)}</p>
            <p className="text-sm text-gray-600 font-body mt-1">Bestätigte Sessions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-text-dark">Transaktionsverlauf</CardTitle>
          <CardDescription className="font-body">Alle deine Einnahmen im Detail</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Euro className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-body mb-2">Noch keine Transaktionen vorhanden</p>
              <p className="text-sm text-gray-500 font-body">
                Sobald du Sessions durchführst, erscheinen sie hier.
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
                                {transaction.offer_title}
                              </div>
                              <div className="text-sm text-gray-600 font-body">
                                mit {transaction.client_name}
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
                      <Euro className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
