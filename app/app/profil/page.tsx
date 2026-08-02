'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  Target,
  Calendar,
  Download,
  CheckCircle2,
  Clock,
  Pencil,
  Camera,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { formatEuro, getClientPriceBreakdown } from '@/lib/utils/pricing';
import { downloadInvoice } from '@/lib/utils/invoice';
import { isOnlineOfferFormat } from '@/lib/utils/offer-location';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const GOALS_OPTIONS = [
  'Rückenschmerzen',
  'Stress',
  'Fitness',
  'Langlebigkeit',
  'Energie',
  'Ernährung',
  'Gewichtsmanagement',
  'Mobility',
  'Kraftaufbau',
  'Mental Health',
];

const GENDER_OPTIONS = [
  { value: 'female', label: 'Weiblich' },
  { value: 'male', label: 'Männlich' },
  { value: 'diverse', label: 'Divers' },
  { value: 'prefer_not_to_say', label: 'Keine Angabe' },
];

const LANGUAGE_OPTIONS = [
  'Arabisch',
  'Chinesisch',
  'Deutsch',
  'Englisch',
  'Französisch',
  'Italienisch',
  'Niederländisch',
  'Polnisch',
  'Portugiesisch',
  'Russisch',
  'Spanisch',
  'Türkisch',
].sort((a, b) => a.localeCompare(b, 'de'));

function parseLanguages(value: string): string[] {
  return value
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
}

function toggleLanguage(current: string, lang: string): string {
  const selected = parseLanguages(current);
  const next = selected.includes(lang)
    ? selected.filter((l) => l !== lang)
    : [...selected, lang];
  return next.sort((a, b) => a.localeCompare(b, 'de')).join(', ');
}

interface PastBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  expert: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  offer: {
    title: string;
    format: string;
  };
}

type ProfileFields = {
  title: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  languages: string;
  address: string;
  city: string;
  phone: string;
  avatarUrl: string;
};

const EMPTY_PROFILE: ProfileFields = {
  title: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  languages: '',
  address: '',
  city: '',
  phone: '',
  avatarUrl: '',
};

function displayValue(value: string) {
  return value?.trim() ? value : '—';
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function extrasStorageKey(userId: string) {
  return `elu-client-profile-extras:${userId}`;
}

export default function ProfilePage() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileFields>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<ProfileFields>(EMPTY_PROFILE);
  const [goals, setGoals] = useState<string[]>([]);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const email = user?.email || 'client@test.com';
  const displayedAvatarUrl = editing ? draft.avatarUrl : profile.avatarUrl;

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const backendMode = getBackendMode();
      let next: ProfileFields = { ...EMPTY_PROFILE };

      if (backendMode === 'mock') {
        const { mockProfile } = await import('@/lib/backend/mock/data');
        const { firstName, lastName } = splitName(mockProfile.full_name || 'Max Mustermann');
        next = {
          ...EMPTY_PROFILE,
          firstName,
          lastName,
          phone: mockProfile.phone || '',
          avatarUrl: mockProfile.avatar_url || '',
          title: '',
          city: 'München',
          languages: 'Deutsch, Englisch',
        };
        setMemberSince(mockProfile.created_at || null);
        setGoals(['Fitness', 'Stress', 'Energie']);
      } else {
        const [profileData, preferencesData] = await Promise.all([
          supabase
            .from('profiles')
            .select('full_name, phone, avatar_url, created_at')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('client_preferences')
            .select('goals, location_city, languages')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        const { firstName, lastName } = splitName(profileData.data?.full_name || '');
        const preferenceLanguages = preferencesData.data?.languages;
        next = {
          ...EMPTY_PROFILE,
          firstName,
          lastName,
          phone: profileData.data?.phone || '',
          avatarUrl: profileData.data?.avatar_url || '',
          city: preferencesData.data?.location_city || '',
          languages: Array.isArray(preferenceLanguages)
            ? preferenceLanguages.join(', ')
            : '',
        };
        setMemberSince(profileData.data?.created_at || null);
        setGoals(preferencesData.data?.goals || []);
      }

      try {
        const raw = localStorage.getItem(extrasStorageKey(user.id));
        if (raw) {
          const extras = JSON.parse(raw) as Partial<ProfileFields> & { username?: string };
          const { username: legacyUsername, ...rest } = extras;
          next = {
            ...next,
            ...rest,
            title: rest.title || legacyUsername || next.title,
          };
        }
      } catch {
        /* ignore */
      }

      setProfile(next);
      setDraft(next);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadPastBookings = useCallback(async () => {
    if (role !== 'client' || !user?.id) return;

    setLoadingBookings(true);
    try {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 250));
        setPastBookings([
          {
            id: 'past-1',
            start_time: '2026-03-25T11:22:00.000Z',
            end_time: '2026-03-25T12:22:00.000Z',
            status: 'completed',
            total_price: 85.0,
            expert: {
              id: '1',
              full_name: 'Sarah Müller',
              avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
            },
            offer: {
              title: 'Erstberatung & Analyse',
              format: 'Präsenz',
            },
          },
          {
            id: 'past-2',
            start_time: '2026-02-12T09:00:00.000Z',
            end_time: '2026-02-12T10:00:00.000Z',
            status: 'completed',
            total_price: 75.0,
            expert: {
              id: '2',
              full_name: 'Michael Schmidt',
              avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
            },
            offer: {
              title: 'Personal Training Session',
              format: 'online',
            },
          },
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          total_price,
          expert_id,
          expert_profiles:expert_id (
            id,
            profile_image_url,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          expert_offers:offer_id (
            title,
            format
          )
        `)
        .eq('client_id', user.id)
        .in('status', ['completed', 'cancelled_by_client', 'cancelled_by_expert'])
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) throw error;

      setPastBookings(
        (data || []).map((apt: any) => {
          const expertProfiles = Array.isArray(apt.expert_profiles)
            ? apt.expert_profiles[0]
            : apt.expert_profiles;
          const expertProfile = Array.isArray(expertProfiles?.profiles)
            ? expertProfiles?.profiles[0]
            : expertProfiles?.profiles;
          const offer = Array.isArray(apt.expert_offers)
            ? apt.expert_offers[0]
            : apt.expert_offers;

          return {
            id: apt.id,
            start_time: apt.start_time,
            end_time: apt.end_time,
            status: apt.status,
            total_price: Number(apt.total_price) || 0,
            expert: {
              id: expertProfiles?.id || apt.expert_id || '',
              full_name: expertProfile?.full_name || 'Expert:in',
              avatar_url:
                expertProfile?.avatar_url || expertProfiles?.profile_image_url || '',
            },
            offer: {
              title: offer?.title || 'Session',
              format: offer?.format || '',
            },
          };
        })
      );
    } catch (error) {
      console.error('Error loading past bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadPastBookings();
    }
  }, [activeTab, loadPastBookings]);

  const startEditing = () => {
    setDraft(profile);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(profile);
    setEditing(false);
  };

  const persistAvatarUrl = async (nextUrl: string) => {
    if (!user?.id) return;

    const backendMode = getBackendMode();
    if (backendMode === 'mock') {
      const { mockProfile } = await import('@/lib/backend/mock/data');
      mockProfile.avatar_url = nextUrl;
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: nextUrl || null, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
    }

    try {
      const raw = localStorage.getItem(extrasStorageKey(user.id));
      const extras = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        extrasStorageKey(user.id),
        JSON.stringify({ ...extras, avatarUrl: nextUrl })
      );
    } catch {
      // ignore storage errors
    }

    setProfile((p) => ({ ...p, avatarUrl: nextUrl }));
    setDraft((d) => ({ ...d, avatarUrl: nextUrl }));
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.id || !file.type.startsWith('image/')) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarUploading(true);
    setProfile((p) => ({ ...p, avatarUrl: previewUrl }));
    setDraft((d) => ({ ...d, avatarUrl: previewUrl }));

    try {
      const backendMode = getBackendMode();
      if (backendMode === 'mock') {
        await persistAvatarUrl(previewUrl);
        toast({
          title: 'Profilbild aktualisiert',
          description: 'Dein neues Profilbild wurde gespeichert.',
        });
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      await persistAvatarUrl(publicData.publicUrl);
      toast({
        title: 'Profilbild aktualisiert',
        description: 'Dein neues Profilbild wurde gespeichert.',
      });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      toast({
        title: 'Upload fehlgeschlagen',
        description: 'Das Profilbild konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await persistAvatarUrl('');
      toast({
        title: 'Profilbild entfernt',
        description: 'Dein Profilbild wurde gelöscht.',
      });
    } catch (err) {
      console.error('Avatar remove failed:', err);
      toast({
        title: 'Löschen fehlgeschlagen',
        description: 'Das Profilbild konnte nicht entfernt werden.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const backendMode = getBackendMode();
      const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(' ').trim();

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const { mockProfile } = await import('@/lib/backend/mock/data');
        mockProfile.full_name = fullName || mockProfile.full_name;
        mockProfile.phone = draft.phone;
        mockProfile.avatar_url = draft.avatarUrl;
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: draft.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        const languages = draft.languages
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean);

        const { error: prefError } = await supabase.from('client_preferences').upsert(
          {
            user_id: user.id,
            location_city: draft.city,
            languages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (prefError) throw prefError;
      }

      localStorage.setItem(
        extrasStorageKey(user.id),
        JSON.stringify({
          title: draft.title,
          firstName: draft.firstName,
          lastName: draft.lastName,
          birthDate: draft.birthDate,
          gender: draft.gender,
          languages: draft.languages,
          address: draft.address,
          city: draft.city,
          phone: draft.phone,
          avatarUrl: draft.avatarUrl,
        })
      );

      setProfile(draft);
      setEditing(false);
      toast({
        title: 'Erfolgreich gespeichert',
        description: 'Deine Profildaten wurden aktualisiert.',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGoalsSave = async () => {
    if (role !== 'client' || !user?.id) return;

    setSaving(true);
    try {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        await new Promise((resolve) => setTimeout(resolve, 400));
      } else {
        const { error } = await supabase.from('client_preferences').upsert(
          {
            user_id: user.id,
            goals,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
        if (error) throw error;
      }

      toast({
        title: 'Ziele aktualisiert',
        description: 'Deine Gesundheitsziele wurden gespeichert.',
      });
    } catch (error) {
      console.error('Error saving goals:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReceipt = async (booking: PastBooking) => {
    toast({
      title: 'Rechnung wird generiert',
      description: 'Die Rechnung wird für dich vorbereitet…',
    });
    try {
      downloadInvoice({
        appointmentId: booking.id,
        offerTitle: booking.offer.title || 'Session',
        sessionStart: booking.start_time,
        sessionEnd: booking.end_time,
        totalPrice: booking.total_price,
        expertName: booking.expert.full_name || 'Expert:in',
        clientName:
          [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() ||
          user?.fullName ||
          'Klient:in',
        formatLabel: isOnlineOfferFormat(booking.offer.format) ? 'Online' : 'Vor Ort',
        forClient: true,
      });
      toast({
        title: 'Rechnung heruntergeladen',
        description: 'Die Rechnung wurde erfolgreich generiert.',
      });
    } catch {
      toast({
        title: 'Fehler',
        description: 'Rechnung konnte nicht erstellt werden.',
        variant: 'destructive',
      });
    }
  };

  const toggleGoal = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const initials = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'EL';

  const displayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Dein Profil';

  const memberSinceLabel = memberSince
    ? `Mitglied seit ${format(parseISO(memberSince), 'MMMM yyyy', { locale: de })}`
    : null;

  const genderLabel =
    GENDER_OPTIONS.find((g) => g.value === profile.gender)?.label || profile.gender;

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="animate-pulse space-y-4 max-w-4xl">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Expert: keep a compact edit form
  if (role !== 'client') {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div>
          <h1 className="text-lg sm:text-xl font-heading font-bold text-text-dark">
            Mein Profil
          </h1>
          <p className="text-sm text-gray-500 font-body mt-1">
            Verwalte deine persönlichen Informationen.
          </p>
        </div>
        <Card className="border-2 max-w-xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Profil</CardTitle>
            <CardDescription className="font-body">
              Name und Kontaktdaten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">E-Mail</Label>
              <Input value={email} disabled className="font-body bg-gray-50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-body">Vorname</Label>
                <Input
                  value={draft.firstName}
                  onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Nachname</Label>
                <Input
                  value={draft.lastName}
                  onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                  className="font-body"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-body"
            >
              {saving ? 'Wird gespeichert…' : 'Änderungen speichern'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-heading font-bold text-text-dark">
          Mein Profil
        </h1>
        <p className="text-sm text-gray-500 font-body mt-1">
          Verwalte deine persönlichen Informationen.
        </p>
      </div>

      <div className="max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-5">
            <TabsTrigger value="profile" className="py-2.5">
              <User className="w-4 h-4 mr-2" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="goals" className="py-2.5">
              <Target className="w-4 h-4 mr-2" />
              Ziele
            </TabsTrigger>
            <TabsTrigger value="bookings" className="py-2.5">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Vergangene Buchungen</span>
              <span className="sm:hidden">Buchungen</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <Card className="border-2">
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={avatarUploading}
                          className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 disabled:opacity-60"
                          aria-label="Profilbild ändern oder löschen"
                        >
                          <Avatar className="w-20 h-20 border border-gray-200">
                            {displayedAvatarUrl ? (
                              <AvatarImage
                                src={displayedAvatarUrl}
                                alt={displayName}
                              />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-xl">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-primary-blue text-white shadow-sm">
                            <Camera className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52 font-body">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={avatarUploading}
                          onSelect={() => fileInputRef.current?.click()}
                        >
                          <Camera className="w-4 h-4 mr-2 text-primary-blue" />
                          {avatarUploading ? 'Wird hochgeladen…' : 'Profilbild ändern'}
                        </DropdownMenuItem>
                        {displayedAvatarUrl ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              disabled={avatarUploading}
                              onSelect={() => {
                                void handleRemoveAvatar();
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Profilbild löschen
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

                  <div className="min-w-0">
                    <p className="font-heading font-bold text-text-dark text-lg sm:text-xl leading-snug truncate">
                      {displayName}
                    </p>
                    {memberSinceLabel && (
                      <p className="text-sm text-gray-500 font-body mt-1">
                        {memberSinceLabel}
                      </p>
                    )}
                  </div>
                </div>

                {!editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={startEditing}
                    className="font-body shrink-0"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </Button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="font-body"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
                    >
                      {saving ? 'Speichern…' : 'Speichern'}
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="border-t border-gray-100" />

                {!editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    {(
                      [
                        { label: 'Titel', value: profile.title },
                        { label: 'Vorname', value: profile.firstName },
                        { label: 'Nachname', value: profile.lastName },
                        {
                          label: 'Geburtsdatum',
                          value: profile.birthDate
                            ? format(parseISO(profile.birthDate), 'd. MMMM yyyy', { locale: de })
                            : '',
                        },
                        { label: 'Geschlecht', value: genderLabel },
                        { label: 'Gesprochene Sprachen', value: profile.languages },
                        { label: 'Adresse', value: profile.address },
                        { label: 'Stadt', value: profile.city },
                        { label: 'E-Mail-Adresse', value: email, emphasize: true },
                      ] as const
                    ).map((field) => (
                      <div key={field.label}>
                        <p className="text-sm text-gray-500 font-body mb-1">{field.label}</p>
                        <p
                          className={cn(
                            'font-body text-text-dark',
                            'emphasize' in field && field.emphasize && 'font-semibold'
                          )}
                        >
                          {displayValue(field.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-body">Titel</Label>
                      <Input
                        value={draft.title}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        className="font-body"
                        placeholder="z. B. Dr."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Vorname</Label>
                      <Input
                        value={draft.firstName}
                        onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Nachname</Label>
                      <Input
                        value={draft.lastName}
                        onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Geburtsdatum</Label>
                      <Input
                        type="date"
                        value={draft.birthDate}
                        onChange={(e) => setDraft((d) => ({ ...d, birthDate: e.target.value }))}
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Geschlecht</Label>
                      <Select
                        value={draft.gender || undefined}
                        onValueChange={(value) => setDraft((d) => ({ ...d, gender: value }))}
                      >
                        <SelectTrigger className="font-body">
                          <SelectValue placeholder="Auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="font-body">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Gesprochene Sprachen</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between font-body font-normal h-10 px-3"
                          >
                            <span
                              className={cn(
                                'truncate text-left',
                                !draft.languages.trim() && 'text-muted-foreground'
                              )}
                            >
                              {draft.languages.trim() || 'Sprachen auswählen'}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto"
                        >
                          {LANGUAGE_OPTIONS.map((lang) => {
                            const selected = parseLanguages(draft.languages);
                            return (
                              <DropdownMenuCheckboxItem
                                key={lang}
                                checked={selected.includes(lang)}
                                onCheckedChange={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    languages: toggleLanguage(d.languages, lang),
                                  }))
                                }
                                onSelect={(e) => e.preventDefault()}
                                className="font-body"
                              >
                                {lang}
                              </DropdownMenuCheckboxItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="font-body">Adresse</Label>
                      <Input
                        value={draft.address}
                        onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">Stadt</Label>
                      <Input
                        value={draft.city}
                        onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-body">E-Mail-Adresse</Label>
                      <Input value={email} disabled className="font-body bg-gray-50" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="mt-0">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-text-dark flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary-blue" />
                  Meine Gesundheitsziele
                </CardTitle>
                <CardDescription className="font-body text-sm">
                  Wähle deine Ziele aus, um passende Expert:innen zu finden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-2.5">
                  {GOALS_OPTIONS.map((goal) => {
                    const isSelected = goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className={cn(
                          'inline-flex items-center rounded-full px-4 py-2 text-sm font-body transition-colors border',
                          isSelected
                            ? 'bg-primary-blue text-white border-primary-blue'
                            : 'bg-white text-text-dark border-gray-200 hover:border-primary-blue/40'
                        )}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={handleGoalsSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 font-body font-semibold rounded-xl px-6"
                >
                  {saving ? 'Wird gespeichert…' : 'Ziele speichern'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="mt-0">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-text-dark flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-blue" />
                  Vergangene Buchungen
                </CardTitle>
                <CardDescription className="font-body text-sm">
                  Sieh dir deine abgeschlossenen Termine an und lade Rechnungen herunter
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
                  </div>
                ) : pastBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-body mb-4">
                      Noch keine vergangenen Buchungen
                    </p>
                    <Button asChild variant="outline" className="font-body">
                      <Link href="/app/experten">Expert:innen finden</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pastBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 rounded-xl border-2 bg-white hover:border-primary-blue/40 transition-colors"
                      >
                        <div className="flex items-stretch gap-3">
                          <Avatar className="w-11 h-11 shrink-0 self-start">
                            <AvatarImage
                              src={booking.expert.avatar_url}
                              alt={booking.expert.full_name}
                            />
                            <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white text-xs font-heading">
                              {booking.expert.full_name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="font-heading font-semibold text-text-dark">
                                  {booking.offer.title}
                                </p>
                                {booking.status === 'completed' && (
                                  <Badge className="bg-info-bg text-info-text border-none text-xs font-body">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Abgeschlossen
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 font-body">
                                mit{' '}
                                {booking.expert.id ? (
                                  <Link
                                    href={`/app/experten/${booking.expert.id}`}
                                    className="text-primary-blue font-medium hover:underline"
                                  >
                                    {booking.expert.full_name}
                                  </Link>
                                ) : (
                                  booking.expert.full_name
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-body">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {format(parseISO(booking.start_time), 'd. MMMM yyyy', {
                                  locale: de,
                                })}{' '}
                                •{' '}
                                {format(parseISO(booking.start_time), 'HH:mm', {
                                  locale: de,
                                })}{' '}
                                Uhr
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end justify-between gap-2">
                            <div className="text-right">
                              <p className="font-heading font-bold text-text-dark">
                                {formatEuro(
                                  getClientPriceBreakdown(booking.total_price).clientTotal
                                )}
                              </p>
                              <p className="text-[11px] text-gray-400 font-body mt-0.5">
                                inkl. Servicegebühr
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadReceipt(booking)}
                              className="font-body h-8"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              Rechnung
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
