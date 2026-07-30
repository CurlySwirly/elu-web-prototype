'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function GuestBrowseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-light">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-5">
          <Link href="/" className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
            elu
          </Link>
          <Link href="/login">
            <Button className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body text-sm">
              Login/Signup
            </Button>
          </Link>
        </div>
      </header>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function isGuestBrowsePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname === '/app/experten' ||
    pathname.startsWith('/app/experten/') ||
    pathname.startsWith('/app/buchen/')
  );
}
