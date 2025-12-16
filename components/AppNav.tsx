'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { Calendar, Home, MapPin, Settings, TrendingUp, User, Users, Briefcase, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();
  const { role, signOut } = useAuth();

  const clientLinks = [
    { href: '/app', label: 'Dashboard', icon: Home },
    { href: '/app/experten', label: 'Expert:innen', icon: Users },
    { href: '/app/termine', label: 'Termine', icon: Calendar },
    { href: '/app/profil', label: 'Profil', icon: User },
  ];

  const expertLinks = [
    { href: '/app', label: 'Dashboard', icon: Home },
    { href: '/app/kalender', label: 'Kalender', icon: Calendar },
    { href: '/app/angebote', label: 'Angebote', icon: Briefcase },
    { href: '/app/finanzen', label: 'Finanzen', icon: DollarSign },
    { href: '/app/expert-profil', label: 'Profil', icon: User },
  ];

  const links = role === 'expert' ? expertLinks : clientLinks;

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <Link href="/app" className="text-2xl font-heading font-bold text-text-dark">
          elu
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-body',
                  isActive
                    ? 'bg-gradient-to-r from-primary-blue to-primary-green text-white'
                    : 'text-gray-700 hover:bg-info-bg hover:text-info-text'
                )}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button
          onClick={() => signOut()}
          variant="outline"
          className="w-full font-body"
        >
          Abmelden
        </Button>
      </div>
    </nav>
  );
}
