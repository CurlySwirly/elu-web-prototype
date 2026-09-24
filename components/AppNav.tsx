'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  HelpCircle,
  MessageCircle,
  Settings,
  User,
  Users,
  Briefcase,
  Euro,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type AppNavProps = {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  desktopCollapsed?: boolean;
  onDesktopCollapsedChange?: (collapsed: boolean) => void;
};

export function AppNav({
  mobileOpen = false,
  onMobileOpenChange,
  desktopCollapsed = false,
  onDesktopCollapsedChange,
}: AppNavProps) {
  const pathname = usePathname();
  const { role } = useAuth();

  const clientLinks = [
    { href: '/app', label: 'Dashboard', icon: Home },
    { href: '/app/experten', label: 'Expert:innen', icon: Users },
    { href: '/app/nachrichten', label: 'Nachrichten', icon: MessageCircle },
    { href: '/app/profil', label: 'Profil', icon: User },
  ];

  const expertLinks = [
    { href: '/app', label: 'Dashboard', icon: Home },
    { href: '/app/kalender', label: 'Kalender', icon: Calendar },
    { href: '/app/angebote', label: 'Angebote', icon: Briefcase },
    { href: '/app/nachrichten', label: 'Nachrichten', icon: MessageCircle },
    { href: '/app/finanzen', label: 'Finanzen', icon: Euro },
    { href: '/app/expert-profil', label: 'Profil', icon: User },
  ];

  const links = role === 'expert' ? expertLinks : clientLinks;
  const settingsHref = '/app/einstellungen';
  const helpHref = '/app/hilfe';
  const settingsActive =
    pathname === settingsHref || pathname.startsWith(`${settingsHref}/`);
  const helpActive = pathname === helpHref || pathname.startsWith(`${helpHref}/`);

  const NavBody = ({
    onNavigate,
    collapsed = false,
  }: {
    onNavigate?: () => void;
    collapsed?: boolean;
  }) => (
    <>
      <div className="flex-1 overflow-y-auto py-3">
        <div className={cn('space-y-0.5', collapsed ? 'px-1.5' : 'px-2.5')}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === '/app'
                ? pathname === '/app'
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                title={collapsed ? link.label : undefined}
                className={cn(
                  'flex items-center rounded-md transition-colors font-body text-sm',
                  collapsed ? 'justify-center px-1.5 py-2' : 'gap-2 px-2.5 py-1.5',
                  isActive
                    ? 'bg-gradient-to-r from-primary-blue to-primary-green text-white'
                    : 'text-gray-700 hover:bg-info-bg hover:text-info-text'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="leading-tight">{link.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <div className={cn('border-t border-gray-200 space-y-0.5', collapsed ? 'p-1.5' : 'p-2.5')}>
        <Link
          href={helpHref}
          onClick={onNavigate}
          title={collapsed ? 'Hilfe' : undefined}
          className={cn(
            'flex items-center rounded-md transition-colors font-body text-sm',
            collapsed ? 'justify-center px-1.5 py-2' : 'gap-2 px-2.5 py-1.5',
            helpActive
              ? 'bg-gradient-to-r from-primary-blue to-primary-green text-white'
              : 'text-gray-700 hover:bg-info-bg hover:text-info-text'
          )}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="leading-tight">Hilfe</span>}
        </Link>
        <Link
          href={settingsHref}
          onClick={onNavigate}
          title={collapsed ? 'Einstellungen' : undefined}
          className={cn(
            'flex items-center rounded-md transition-colors font-body text-sm',
            collapsed ? 'justify-center px-1.5 py-2' : 'gap-2 px-2.5 py-1.5',
            settingsActive
              ? 'bg-gradient-to-r from-primary-blue to-primary-green text-white'
              : 'text-gray-700 hover:bg-info-bg hover:text-info-text'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="leading-tight">Einstellungen</span>}
        </Link>
      </div>
    </>
  );

  return (
    <>
      <nav
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out lg:flex',
          desktopCollapsed ? 'w-14' : 'w-52'
        )}
      >
        <div
          className={cn(
            'border-b border-gray-200 flex items-center',
            desktopCollapsed ? 'p-2 justify-center' : 'px-3 py-3 justify-between gap-2'
          )}
        >
          {!desktopCollapsed && (
            <Link href="/app" className="text-xl font-heading font-bold text-text-dark truncate">
              elu
            </Link>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full shrink-0"
            onClick={() => onDesktopCollapsedChange?.(!desktopCollapsed)}
            aria-label={desktopCollapsed ? 'Menü ausklappen' : 'Menü einklappen'}
            title={desktopCollapsed ? 'Menü ausklappen' : 'Menü einklappen'}
          >
            {desktopCollapsed ? (
              <ChevronRight className="h-4 w-4 text-text-dark" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-text-dark" />
            )}
          </Button>
        </div>
        <NavBody collapsed={desktopCollapsed} />
      </nav>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[240px] p-0 flex flex-col [&>button]:hidden">
          <SheetHeader className="px-4 py-3 border-b border-gray-200 text-left">
            <div className="flex items-center justify-between gap-3 pr-1">
              <SheetTitle className="font-heading text-xl font-bold text-text-dark">
                elu
              </SheetTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0"
                onClick={() => onMobileOpenChange?.(false)}
                aria-label="Menü schließen"
              >
                <X className="h-4 w-4 text-text-dark" />
              </Button>
            </div>
          </SheetHeader>
          <NavBody onNavigate={() => onMobileOpenChange?.(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
