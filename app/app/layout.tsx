'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppNav } from '@/components/AppNav';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, role, userId } = useAuth();
  const [profileCheckLoading, setProfileCheckLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Check if expert profile is complete
    const checkExpertProfile = async () => {
      if (!loading && user && role === 'expert' && pathname !== '/app/complete-profile') {
        // Check if we're in mock mode
        const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';
        
        if (backendMode === 'mock') {
          // In mock mode, skip profile check - allow access to all pages
          setProfileCheckLoading(false);
          return;
        }

        // In Supabase mode, check profile completion
        try {
          const { data } = await supabase
            .from('expert_profiles')
            .select('is_profile_complete, profile_completion_status')
            .eq('user_id', userId)
            .maybeSingle();

          if (data && !data.is_profile_complete) {
            router.push('/app/complete-profile');
          }
        } catch (error) {
          // If check fails, don't block access - just log error
          console.error('Error checking expert profile:', error);
        }
      }
      setProfileCheckLoading(false);
    };

    checkExpertProfile();
  }, [user, loading, role, userId, router, pathname]);

  if (loading || profileCheckLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
          <p className="mt-4 text-gray-600 font-body">Lädt...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <AppNav />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </AuthProvider>
  );
}
