'use client';

import { useEffect, useState } from 'react';
import { verificationService } from '@/lib/services/verification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, CheckCircle, Clock, XCircle, Building2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    pendingExperts: 0,
    verifiedExperts: 0,
    rejectedExperts: 0,
    totalExperts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [pending, verified, rejected, all] = await Promise.all([
        verificationService.getAllExperts('pending'),
        verificationService.getAllExperts('verified'),
        verificationService.getAllExperts('rejected'),
        verificationService.getAllExperts(),
      ]);

      setStats({
        pendingExperts: pending.length,
        verifiedExperts: verified.length,
        rejectedExperts: rejected.length,
        totalExperts: all.length,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold text-text-dark mb-2">Dashboard</h2>
        <p className="text-gray-600 font-body">Übersicht über Plattform-Aktivitäten</p>
      </div>

      {error && (
        <Alert className="mb-6 border-error-text bg-error-bg">
          <AlertCircle className="h-4 w-4 text-error-text" />
          <AlertDescription className="text-error-text font-body">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading text-gray-600">
              <Clock className="w-5 h-5 text-yellow-500" />
              Ausstehend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-heading font-bold text-text-dark">
              {stats.pendingExperts}
            </p>
            <p className="text-sm text-gray-600 font-body mt-1">
              Expert:innen warten auf Verifizierung
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading text-gray-600">
              <CheckCircle className="w-5 h-5 text-success-text" />
              Verifiziert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-heading font-bold text-text-dark">
              {stats.verifiedExperts}
            </p>
            <p className="text-sm text-gray-600 font-body mt-1">Aktive Expert:innen</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading text-gray-600">
              <XCircle className="w-5 h-5 text-error-text" />
              Abgelehnt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-heading font-bold text-text-dark">
              {stats.rejectedExperts}
            </p>
            <p className="text-sm text-gray-600 font-body mt-1">Nicht verifiziert</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-heading text-gray-600">
              <Users className="w-5 h-5 text-primary-blue" />
              Gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-heading font-bold text-text-dark">
              {stats.totalExperts}
            </p>
            <p className="text-sm text-gray-600 font-body mt-1">Alle Expert:innen</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-text-dark">
              Schnellzugriffe
            </CardTitle>
            <CardDescription className="font-body">Wichtige Admin-Aufgaben</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/experts?status=pending">
              <Button
                variant="outline"
                className="w-full justify-start font-body"
              >
                <Clock className="w-4 h-4 mr-2" />
                Ausstehende Verifizierungen ({stats.pendingExperts})
              </Button>
            </Link>
            <Link href="/admin/experts">
              <Button
                variant="outline"
                className="w-full justify-start font-body"
              >
                <Users className="w-4 h-4 mr-2" />
                Alle Expert:innen verwalten
              </Button>
            </Link>
            <Link href="/admin/rooms">
              <Button
                variant="outline"
                className="w-full justify-start font-body"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Räume prüfen
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-text-dark">
              Systemstatus
            </CardTitle>
            <CardDescription className="font-body">Plattform-Gesundheit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-body text-gray-600">Datenbank</span>
                <span className="flex items-center gap-2 text-sm font-body text-success-text">
                  <CheckCircle className="w-4 h-4" />
                  Aktiv
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-body text-gray-600">Authentifizierung</span>
                <span className="flex items-center gap-2 text-sm font-body text-success-text">
                  <CheckCircle className="w-4 h-4" />
                  Aktiv
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-body text-gray-600">Storage</span>
                <span className="flex items-center gap-2 text-sm font-body text-success-text">
                  <CheckCircle className="w-4 h-4" />
                  Aktiv
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
