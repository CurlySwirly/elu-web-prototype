'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ExpertDashboard from '@/components/ExpertDashboard';
import ClientDashboard from '@/components/ClientDashboard';

function DashboardContent() {
  const { role } = useAuth();

  if (role === 'client') {
    return <ClientDashboard />;
  }

  if (role === 'expert') {
    return <ExpertDashboard />;
  }

  return null;
}

export default function AppDashboard() {
  return (
    <Suspense fallback={<div className="p-3 sm:p-4 lg:p-5 font-body text-gray-500">Wird geladen…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
