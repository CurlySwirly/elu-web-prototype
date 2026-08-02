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
  const { user, loading } = useAuth();
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
    if (!user && !guestAllowed) {
      router.push('/login');
    }
  }, [user, loading, router, guestAllowed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // While auth resolves, still allow guest browse routes; otherwise keep a short shell spinner.
  if (loading) {
    if (guestAllowed) {
      return <GuestBrowseShell>{children}</GuestBrowseShell>;
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light">
        <div className="text-center px-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue" />
          <p className="mt-4 text-gray-600 font-body">Weiterleitung zur Anmeldung…</p>
        </div>
      </div>
    );
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
          desktopNavCollapsed ? 'lg:ml-14' : 'lg:ml-52'
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
