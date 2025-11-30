'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, Users } from 'lucide-react';
import ProviderDashboard from '@/components/ProviderDashboard';
import ExpertDashboard from '@/components/ExpertDashboard';

export default function AppDashboard() {
  const { role } = useAuth();

  if (role === 'client') {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 font-body">
            Willkommen zurück! Hier ist eine Übersicht deiner Aktivitäten.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Calendar className="w-5 h-5 text-primary-blue" />
                Kommende Termine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading font-bold text-text-dark">3</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <Users className="w-5 h-5 text-primary-blue" />
                Gebuchte Expert:innen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading font-bold text-text-dark">2</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-lg">
                <TrendingUp className="w-5 h-5 text-primary-blue" />
                Insgesamt Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-heading font-bold text-text-dark">12</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Nächste Termine</CardTitle>
            <CardDescription className="font-body">Deine bevorstehenden Wellness-Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 font-body">Noch keine Termine gebucht. Starte jetzt!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role === 'expert') {
    return <ExpertDashboard />;
  }

  if (role === 'provider') {
    return <ProviderDashboard />;
  }

  return null;
}
