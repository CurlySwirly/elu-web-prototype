'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppNav } from '@/components/AppNav';
import { AppHeader } from '@/components/AppHeader';
import { GuestBrowseShell, isGuestBrowsePath } from '@/components/GuestBrowseShell';
import { cn } from '@/lib/utils';

const DESKTOP_NAV_STORAGE_KEY = 'elu-desktop-nav-collapsed';

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, role, userId } = useAuth();
  const [profileCheckLoading, setProfileCheckLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);
  const guestAllowed = isGuestBrowsePath(pathname);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DESKTOP_NAV_STORAGE_KEY);
      if (stored === '1') setDesktopNavCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDesktopCollapsedChange = (collapsed: boolean) => {
    setDesktopNavCollapsed(collapsed);
    try {
      localStorage.setItem(DESKTOP_NAV_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setProfileCheckLoading(false);
      if (!guestAllowed) {
        router.push('/login');
      }
      return;
    }

    const checkExpertProfile = async () => {
      if (role === 'expert' && pathname !== '/app/complete-profile') {
        const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';

        if (backendMode === 'mock') {
          setProfileCheckLoading(false);
          return;
        }

        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('expert_profiles')
            .select('is_profile_complete, profile_completion_status')
            .eq('user_id', userId)
            .maybeSingle();

          if (data && !data.is_profile_complete) {
            router.push('/app/complete-profile');
          }
        } catch (error) {
          console.error('Error checking expert profile:', error);
        }
      }
      setProfileCheckLoading(false);
    };

    checkExpertProfile();
  }, [user, loading, role, userId, router, pathname, guestAllowed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (loading || (user && profileCheckLoading)) {
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
    if (guestAllowed) {
      return <GuestBrowseShell>{children}</GuestBrowseShell>;
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <AppNav
        mobileOpen={mobileNavOpen}
        onMobileOpenChange={setMobileNavOpen}
        desktopCollapsed={desktopNavCollapsed}
        onDesktopCollapsedChange={handleDesktopCollapsedChange}
      />
      <div
        className={cn(
          'min-h-screen flex flex-col transition-[margin] duration-200 ease-in-out',
          desktopNavCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        )}
      >
        <AppHeader
          mobileNavOpen={mobileNavOpen}
          onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
