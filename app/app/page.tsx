'use client';

import { Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ExpertDashboard from '@/components/ExpertDashboard';
import ClientDashboard from '@/components/ClientDashboard';

function DashboardContent() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 font-body text-gray-500">Wird geladen…</div>
    );
  }

  if (role === 'expert') {
    return <ExpertDashboard />;
  }

  if (role === 'client') {
    return <ClientDashboard />;
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
