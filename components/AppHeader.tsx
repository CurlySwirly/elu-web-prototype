'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { segmentButtonClass } from '@/components/ui/tabs';
import type { BookingNotification } from '@/lib/services/booking';
import { getAppPageMeta } from '@/lib/app-page-meta';
import {
  Bell,
  CalendarCheck,
  Camera,
  Clock,
  CreditCard,
  LogOut,
  Menu,
  MessageCircle,
  Star,
  User,
  X,
} from 'lucide-react';

type NotifFilter = 'all' | 'important' | 'appointments' | 'chat';

function getNotificationCategory(type: string): NotifFilter {
  const t = type.toLowerCase();
  if (t.includes('chat') || t.includes('message') || t.includes('nachricht')) {
    return 'chat';
  }
  if (
    t.includes('cancel') ||
    t.includes('refund') ||
    t.includes('payment') ||
    t.includes('payout') ||
    t.includes('auszahlung') ||
    t.includes('wichtig') ||
    t.includes('reminder') ||
    t.includes('review') ||
    t.includes('bewertung')
  ) {
    return 'important';
  }
  return 'appointments';
}

function getNotificationVisual(type: string) {
  const t = type.toLowerCase();
  if (t.includes('review') || t.includes('bewertung')) {
    return {
      Icon: Star,
      className: 'bg-primary-blue/15 text-primary-blue',
    };
  }
  const category = getNotificationCategory(type);
  if (category === 'chat') {
    return {
      Icon: MessageCircle,
      className: 'bg-info-bg text-primary-blue',
    };
  }
  if (category === 'important') {
    if (
      t.includes('payment') ||
      t.includes('paid') ||
      t.includes('payout') ||
      t.includes('auszahlung')
    ) {
      return {
        Icon: CreditCard,
        className: 'bg-info-bg text-primary-blue',
      };
    }
    return {
      Icon: Clock,
      className: 'bg-amber-100 text-amber-600',
    };
  }
  return {
    Icon: CalendarCheck,
    className: 'bg-primary-green/25 text-text-dark',
  };
}

function formatRelativeTime(iso: string) {
  try {
    const label = formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return '';
  }
}

export function AppHeader({
  mobileNavOpen = false,
  onToggleMobileNav,
}: {
  mobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
}) {
  const { userId, role, user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pageMeta = getAppPageMeta(pathname);
  const pageTitle = pageMeta?.title || 'elu';
  const pageDescription = pageMeta?.description;
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileHref = role === 'expert' ? '/app/expert-profil' : '/app/profil';
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter((n) => getNotificationCategory(n.notification_type) === filter);
  }, [notifications, filter]);

  const loadNotifications = useCallback(async () => {
    const { getMyNotifications } = await import('@/lib/services/booking');
    const { data } = await getMyNotifications();
    setNotifications(data ?? []);
  }, []);

  const loadAvatar = useCallback(async () => {
    if (!userId) return;

    const backendMode = getBackendMode();
    if (backendMode === 'mock') {
      const {
        mockExperts,
        mockProfile,
        mockOnboardingExpertProfile,
        MOCK_ONBOARDING_EXPERT_USER_ID,
      } = await import('@/lib/backend/mock/data');
      if (role === 'expert') {
        if (userId === MOCK_ONBOARDING_EXPERT_USER_ID) {
          setAvatarUrl(mockOnboardingExpertProfile.avatar_url || null);
          setDisplayName(mockOnboardingExpertProfile.full_name);
        } else {
          const expert = mockExperts[0];
          setAvatarUrl(expert?.avatar_url ?? null);
          setDisplayName(expert?.full_name ?? 'Expert:in');
        }
      } else {
        setAvatarUrl(mockProfile.avatar_url ?? null);
        setDisplayName(mockProfile.full_name ?? 'Profil');
      }
      return;
    }

    const { supabase } = await import('@/lib/supabase');
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', userId)
      .maybeSingle();

    let url = profile?.avatar_url ?? null;
    let name = profile?.full_name || user?.fullName || '';

    if (role === 'expert') {
      const { data: expert } = await supabase
        .from('expert_profiles')
        .select('profile_image_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (expert?.profile_image_url) {
        url = expert.profile_image_url;
      }
    }

    setAvatarUrl(url);
    setDisplayName(name || user?.email || 'Profil');
  }, [userId, role, user?.email, user?.fullName]);

  useEffect(() => {
    loadNotifications();
    loadAvatar();
  }, [loadNotifications, loadAvatar]);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next) {
      setFilter('all');
      await loadNotifications();
    }
  };

  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    const { markNotificationAsRead } = await import('@/lib/services/booking');
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleNotificationClick = async (n: BookingNotification) => {
    await handleMarkRead(n.id, n.is_read);
    setOpen(false);

    const type = n.notification_type.toLowerCase();
    if (type.includes('review') && role === 'client') {
      router.push(`/app?review=${encodeURIComponent(n.booking_id)}`);
      return;
    }
    if (type.includes('review') && role === 'expert') {
      router.push('/app');
      return;
    }
    if (type.includes('payment') || type.includes('paid') || type.includes('payout') || type.includes('auszahlung')) {
      router.push(role === 'expert' ? '/app/finanzen' : '/app/termine');
      return;
    }
    if (type.includes('chat') || type.includes('message') || type.includes('nachricht')) {
      router.push('/app/nachrichten');
      return;
    }
    if (type.includes('booking') || type.includes('reminder') || type.includes('termin')) {
      router.push(role === 'expert' ? '/app/termine' : '/app/termine');
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId || !file.type.startsWith('image/')) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setAvatarUploading(true);

    try {
      const backendMode = getBackendMode();
      if (backendMode === 'mock') {
        const { mockExperts, mockProfile } = await import('@/lib/backend/mock/data');
        if (role === 'expert' && mockExperts[0]) {
          mockExperts[0].avatar_url = previewUrl;
        } else {
          mockProfile.avatar_url = previewUrl;
        }
        return;
      }

      const { supabase } = await import('@/lib/supabase');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        console.error('Avatar upload failed:', uploadError);
        return;
      }

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);

      if (role === 'expert') {
        await supabase
          .from('expert_profiles')
          .update({ profile_image_url: publicUrl })
          .eq('user_id', userId);
      }

      setAvatarUrl(publicUrl);
    } catch (err) {
      console.error('Avatar update failed:', err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'EL';

  const filters: { id: NotifFilter; label: string }[] = [
    { id: 'all', label: `Alle (${notifications.length})` },
    { id: 'important', label: 'Wichtig' },
    { id: 'appointments', label: 'Termine' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <header className="sticky top-0 z-30 min-h-16 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="min-h-16 px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onToggleMobileNav && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full lg:hidden shrink-0"
              onClick={onToggleMobileNav}
              aria-label={mobileNavOpen ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5 text-text-dark" />
              ) : (
                <Menu className="h-5 w-5 text-text-dark" />
              )}
            </Button>
          )}
          <div className="min-w-0 flex flex-col justify-center gap-px">
            <h1 className="font-heading text-lg sm:text-xl font-bold text-text-dark truncate leading-tight">
              {pageTitle}
            </h1>
            {pageDescription ? (
              <p className="font-body text-[11px] sm:text-xs text-gray-500 truncate leading-tight">
                {pageDescription}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full"
              aria-label={
                unreadCount > 0
                  ? `Benachrichtigungen, ${unreadCount} neu`
                  : 'Benachrichtigungen'
              }
            >
              <Bell className="h-5 w-5 text-text-dark" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[min(420px,calc(100vw-1.5rem))] p-0 rounded-2xl border-2 shadow-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
              <p className="font-heading text-lg font-bold text-text-dark">
                Benachrichtigungen
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
              >
                <X className="h-4 w-4 text-text-dark" />
              </Button>
            </div>

            <div className="px-3 sm:px-4 pb-3">
              <div className="flex items-center gap-0.5 rounded-full bg-gray-100 p-0.5 overflow-x-auto">
                {filters.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={cn(
                      'flex-1 text-[11px] sm:text-xs',
                      segmentButtonClass(filter === tab.id)
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[min(360px,60vh)] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-500 font-body">
                  Keine Benachrichtigungen in dieser Kategorie
                </p>
              ) : (
                <ul>
                  {filteredNotifications.map((n, index) => {
                    const { Icon, className } = getNotificationVisual(n.notification_type);
                    return (
                      <li key={n.id}>
                        {index > 0 && <div className="mx-5 border-t border-gray-100" />}
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            'w-full text-left px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors',
                            !n.is_read && 'bg-info-bg/30'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                className
                              )}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-text-dark font-body">
                                {n.title}
                              </p>
                              <p className="text-sm text-text-dark/80 font-body mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-xs text-gray-400 font-body mt-2">
                                {formatRelativeTime(n.created_at)}
                              </p>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <HoverCard openDelay={80} closeDelay={180}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="rounded-full ring-offset-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
              aria-label="Profilmenü"
            >
              <Avatar className="h-9 w-9 border border-gray-200">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            align="end"
            sideOffset={10}
            className="w-56 rounded-2xl border-2 p-4 shadow-lg"
          >
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-2 border-primary-blue/20 shadow-md">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-2xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <p className="font-heading text-base font-bold text-text-dark text-center leading-tight truncate max-w-full">
                {displayName || 'Profil'}
              </p>

              <div className="flex w-full flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full font-body border-2 rounded-xl justify-center"
                >
                  <Camera className="w-4 h-4 mr-2 shrink-0" />
                  {avatarUploading ? 'Wird hochgeladen…' : 'Profilbild ändern'}
                </Button>
                <Button
                  asChild
                  className="w-full font-body rounded-xl bg-primary-blue hover:bg-primary-blue/90 text-white justify-center"
                >
                  <Link href={profileHref}>
                    <User className="w-4 h-4 mr-2 shrink-0" />
                    Zum Profil
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void signOut()}
                  className="w-full font-body border-2 rounded-xl justify-center text-gray-700"
                >
                  <LogOut className="w-4 h-4 mr-2 shrink-0" />
                  Abmelden
                </Button>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleAvatarFileChange}
          aria-hidden
          tabIndex={-1}
        />
        </div>
      </div>
    </header>
  );
}
