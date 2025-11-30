'use client';

import { AdminGuard } from '@/components/AdminGuard';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, Home, Building2 } from 'lucide-react';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/experts', label: 'Expert:innen', icon: Users },
  { href: '/admin/rooms', label: 'Räume', icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-bg-light">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary-blue" />
                <h1 className="text-2xl font-heading font-bold text-text-dark">
                  Admin Portal
                </h1>
              </div>
              <Link
                href="/app"
                className="text-sm text-gray-600 hover:text-primary-blue font-body"
              >
                Zurück zur App
              </Link>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="flex gap-4 mb-8 border-b border-gray-200">
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 font-body border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-blue text-primary-blue'
                      : 'border-transparent text-gray-600 hover:text-primary-blue hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {children}
        </div>
      </div>
    </AdminGuard>
  );
}
