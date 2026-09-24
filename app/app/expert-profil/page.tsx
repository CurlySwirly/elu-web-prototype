'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Check,
  FileText,
  Globe,
  Landmark,
  Plus,
  UserRound,
  X,
} from 'lucide-react';
import { QualificationsSection } from '@/components/QualificationsSection';
import { ExpertSedcard, type ExpertSedcardData } from '@/components/ExpertSedcard';
import { ExpertAboManage } from '@/components/ExpertAboManage';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { fetchExpertById, fetchExpertOffers, type ExpertOffer } from '@/lib/api';
import { reviewService, type Review } from '@/lib/services/review';
import { ensureMockExpertDemoState } from '@/lib/backend/mock/expert-demo-state';

type ExpertProfileFields = {
  fullName: string;
  bio: string;
  professions: string[];
  specializations: string[];
  verifiedProfessions: string[];
  yearsExperience: string;
  avatarUrl: string;
  vatId: string;
  businessAddress: string;
  businessPostalCode: string;
  businessCity: string;
  commercialRegister: string;
  vatStatus: 'kleinunternehmer' | 'heilbehandlung' | 'regelbesteuerung';
};

const EMPTY_PROFILE: ExpertProfileFields = {
  fullName: '',
  bio: '',
  professions: [],
  specializations: [],
  verifiedProfessions: [],
  yearsExperience: '',
  avatarUrl: '',
  vatId: '',
  businessAddress: '',
  businessPostalCode: '',
  businessCity: '',
  commercialRegister: '',
  vatStatus: 'kleinunternehmer',
};

const PROFESSION_SUGGESTIONS = [
  'Physiotherapie',
  'Personal Training',
  'Ernährungsberatung',
  'Yoga',
  'Coaching',
  'Massage',
  'Osteopathie',
];

const SPECIALIZATION_SUGGESTIONS = [
  'Training',
  'Coaching',
  'Ernährung',
  'Massage',
  'Physiotherapie',
  'Yoga',
  'Pilates',
  'Mental Health',
  'Rehabilitation',
  'Prävention',
];

function businessStorageKey(userId: string) {
  return `elu-expert-business:v1:${userId}`;
}

function loadBusinessFields(userId: string | null): Partial<ExpertProfileFields> {
  if (!userId || typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(businessStorageKey(userId));
    if (!raw) return {};
    return JSON.parse(raw) as Partial<ExpertProfileFields>;
  } catch {
    return {};
  }
}

function TagField({
  label,
  description,
  values,
  onChange,
  suggestions = [],
  placeholder,
  disabled,
}: {
  label: string;
  description?: string;
  values: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    const exists = values.some((v) => v.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft('');
      return;
    }
    onChange([...values, tag]);
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(values.filter((v) => v !== tag));
  };

  const unusedSuggestions = suggestions.filter(
    (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div>
        <Label className="font-body text-sm">{label}</Label>
        {description ? (
          <p className="text-xs text-gray-500 font-body mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {values.length === 0 ? (
          <p className="text-sm text-gray-400 font-body">Noch keine Einträge</p>
        ) : (
          values.map((tag) => (
            <Badge
              key={tag}
              className="bg-info-bg text-info-text border-none font-body text-xs pl-2.5 pr-1 py-1 gap-1"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full p-0.5 hover:bg-primary-blue/15"
                  aria-label={`${tag} entfernen`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))
        )}
      </div>
      {!disabled && (
        <>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(draft);
                }
              }}
              className="font-body h-9 text-sm"
              placeholder={placeholder || 'Eintrag hinzufügen und Enter'}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 font-body text-xs"
              onClick={() => addTag(draft)}
              disabled={!draft.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Hinzufügen
            </Button>
          </div>
          {unusedSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {unusedSuggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addTag(s)}
                  className="text-[11px] font-body px-2 py-1 rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-primary-blue hover:text-text-dark"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ExpertProfilePage() {
  const { user, userId } = useAuth();
  const searchParams = useSearchParams();
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ExpertProfileFields>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<ExpertProfileFields>(EMPTY_PROFILE);
  const [activeTab, setActiveTab] = useState('profil');
  const [sedcardOffers, setSedcardOffers] = useState<ExpertOffer[]>([]);
  const [sedcardReviews, setSedcardReviews] = useState<Review[]>([]);
  const [sedcardMeta, setSedcardMeta] = useState<{
    hourly_rate: number;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    certifications: string[];
    city?: string;
  } | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;
    if (tab === 'abo' || tab === 'konto') {
      setActiveTab('konto');
      return;
    }
    if (tab === 'overview' || tab === 'stammdaten' || tab === 'daten') {
      setActiveTab('daten');
      return;
    }
    if (tab === 'sedcard' || tab === 'reviews' || tab === 'profil') {
      setActiveTab('profil');
      return;
    }
    if (tab === 'qualifications') {
      setActiveTab('qualifications');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchExpertProfile = async () => {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        ensureMockExpertDemoState(userId);
        const {
          mockExperts,
          mockOnboardingExpertProfile,
          MOCK_ONBOARDING_EXPERT_USER_ID,
        } = await import('@/lib/backend/mock/data');

        const isOnboardingDemo = userId === MOCK_ONBOARDING_EXPERT_USER_ID;
        const business = loadBusinessFields(userId);
        const next: ExpertProfileFields = {
          ...EMPTY_PROFILE,
          ...(isOnboardingDemo
            ? {
                fullName: mockOnboardingExpertProfile.full_name,
                bio: mockOnboardingExpertProfile.bio || '',
                professions: [],
                specializations: [],
                verifiedProfessions: [],
                yearsExperience: '',
                avatarUrl: mockOnboardingExpertProfile.avatar_url || '',
              }
            : {
                fullName: mockExperts[0].full_name,
                bio: mockExperts[0].bio || '',
                professions: mockExperts[0].professions?.length
                  ? mockExperts[0].professions
                  : [mockExperts[0].specializations[0]].filter(Boolean),
                specializations: mockExperts[0].specializations || [],
                verifiedProfessions: mockExperts[0].is_verified
                  ? mockExperts[0].professions?.length
                    ? mockExperts[0].professions
                    : [mockExperts[0].specializations[0]].filter(Boolean)
                  : [],
                yearsExperience: String(mockExperts[0].years_experience ?? ''),
                avatarUrl: mockExperts[0].avatar_url || '',
                vatId: 'ATU12345678',
                businessAddress: 'Beispielgasse 12',
                businessPostalCode: '1010',
                businessCity: 'Wien',
                commercialRegister: 'FN 123456a',
                vatStatus: 'regelbesteuerung',
              }),
          ...business,
        };
        setProfile(next);
        setDraft(next);
        setExpertProfileId(
          isOnboardingDemo ? mockOnboardingExpertProfile.id : mockExperts[0].id
        );
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('expert_profiles')
          .select(
            `
            id,
            bio,
            profession,
            professions,
            specializations,
            years_experience,
            qualification_verified,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `
          )
          .eq('user_id', userId)
          .maybeSingle();

        if (data) {
          setExpertProfileId(data.id);
          const profileRow = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
          const professionsFromDb: string[] = Array.isArray(data.professions)
            ? data.professions.filter(Boolean)
            : [];
          const legacyProfession =
            typeof data.profession === 'string' && data.profession.trim()
              ? [data.profession.trim()]
              : [];
          const professions =
            professionsFromDb.length > 0 ? professionsFromDb : legacyProfession;

          let verifiedProfessions: string[] = [];
          try {
            const { data: docs } = await supabase
              .from('qualification_documents')
              .select('profession, status')
              .eq('expert_profile_id', data.id)
              .eq('status', 'approved');
            verifiedProfessions = Array.from(
              new Set(
                (docs || [])
                  .map((d) => (d.profession || '').trim())
                  .filter(Boolean)
              )
            );
          } catch {
            if (data.qualification_verified) {
              verifiedProfessions = professions;
            }
          }

          const next: ExpertProfileFields = {
            ...EMPTY_PROFILE,
            ...loadBusinessFields(userId),
            fullName: profileRow?.full_name || '',
            bio: data.bio || '',
            professions,
            specializations: Array.isArray(data.specializations)
              ? data.specializations.filter(Boolean)
              : [],
            verifiedProfessions,
            yearsExperience:
              data.years_experience != null ? String(data.years_experience) : '',
            avatarUrl: profileRow?.avatar_url || '',
          };
          setProfile(next);
          setDraft(next);
        } else {
          // Demo fallback: no expert_profiles row (e.g. auth-only login)
          const { mockExperts } = await import('@/lib/backend/mock/data');
          const demo = mockExperts[0];
          const next: ExpertProfileFields = {
            ...EMPTY_PROFILE,
            ...loadBusinessFields(userId),
            fullName: demo.full_name,
            bio: demo.bio || '',
            professions: demo.professions?.length
              ? demo.professions
              : [demo.specializations[0]].filter(Boolean),
            specializations: demo.specializations || [],
            verifiedProfessions: demo.verified_professions || demo.professions || [],
            yearsExperience: String(demo.years_experience ?? ''),
            avatarUrl: demo.avatar_url || '',
          };
          setProfile(next);
          setDraft(next);
          setExpertProfileId(demo.id);
        }
      } catch (error) {
        console.error('Error fetching expert profile:', error);
        try {
          const { mockExperts } = await import('@/lib/backend/mock/data');
          const demo = mockExperts[0];
          const next: ExpertProfileFields = {
            ...EMPTY_PROFILE,
            ...loadBusinessFields(userId),
            fullName: demo.full_name,
            bio: demo.bio || '',
            professions: demo.professions?.length
              ? demo.professions
              : [demo.specializations[0]].filter(Boolean),
            specializations: demo.specializations || [],
            verifiedProfessions: demo.verified_professions || demo.professions || [],
            yearsExperience: String(demo.years_experience ?? ''),
            avatarUrl: demo.avatar_url || '',
          };
          setProfile(next);
          setDraft(next);
          setExpertProfileId(demo.id);
        } catch {
          /* ignore */
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void fetchExpertProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (!expertProfileId) return;
    let cancelled = false;
    const loadSedcard = async () => {
      const applyMockSedcard = async () => {
        const { mockExperts, mockExpertOffers, mockExpertReviews } = await import(
          '@/lib/backend/mock/data'
        );
        const demo = mockExperts[0];
        const offers = mockExpertOffers.filter((o) => o.expert_id === demo.id);
        if (cancelled) return;
        setSedcardOffers(offers);
        setSedcardReviews(
          mockExpertReviews.filter((r) => r.expert_profile_id === demo.id) as Review[]
        );
        setSedcardMeta({
          hourly_rate: demo.hourly_rate,
          rating: demo.rating,
          total_reviews: demo.total_reviews,
          is_verified: demo.is_verified,
          certifications: demo.certifications || [],
          city: demo.city,
        });
      };

      try {
        const [expertData, offersData, reviewsData] = await Promise.all([
          fetchExpertById(expertProfileId),
          fetchExpertOffers(expertProfileId),
          reviewService.getExpertReviews(expertProfileId),
        ]);
        if (cancelled) return;

        const hasExpert = Boolean(expertData?.id);
        const hasOffers = Array.isArray(offersData) && offersData.length > 0;

        if (!hasExpert && !hasOffers) {
          await applyMockSedcard();
          return;
        }

        setSedcardOffers(offersData || []);
        if (reviewsData && reviewsData.length > 0) {
          setSedcardReviews(reviewsData);
        } else {
          const { mockExpertReviews } = await import('@/lib/backend/mock/data');
          if (!cancelled) {
            setSedcardReviews(mockExpertReviews as Review[]);
          }
        }
        if (expertData) {
          setSedcardMeta({
            hourly_rate: expertData.hourly_rate ?? 0,
            rating: expertData.rating ?? 0,
            total_reviews: expertData.total_reviews ?? 0,
            is_verified: Boolean(expertData.is_verified),
            certifications: expertData.certifications || [],
            city: expertData.city,
          });
        }
      } catch (error) {
        console.error('Failed to load Sedcard preview:', error);
        try {
          await applyMockSedcard();
        } catch {
          /* ignore */
        }
      }
    };
    void loadSedcard();
    return () => {
      cancelled = true;
    };
  }, [expertProfileId]);

  const displayName = useMemo(
    () => profile.fullName.trim() || user?.email || 'Expert:in',
    [profile.fullName, user?.email]
  );

  const sedcardExpert = useMemo((): ExpertSedcardData | null => {
    if (!expertProfileId) return null;
    return {
      id: expertProfileId,
      full_name: profile.fullName || displayName,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      specializations: profile.specializations,
      professions: profile.professions,
      verified_professions: profile.verifiedProfessions,
      hourly_rate: sedcardMeta?.hourly_rate ?? 0,
      rating: sedcardMeta?.rating ?? 0,
      total_reviews: sedcardMeta?.total_reviews ?? 0,
      is_verified: sedcardMeta?.is_verified ?? profile.verifiedProfessions.length > 0,
      certifications: sedcardMeta?.certifications,
      city: sedcardMeta?.city,
    };
  }, [expertProfileId, profile, sedcardMeta, displayName]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(profile),
    [draft, profile]
  );

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  const handleSaveProfile = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const backendMode = getBackendMode();
      if (backendMode !== 'mock' && expertProfileId) {
        await supabase
          .from('expert_profiles')
          .update({
            bio: draft.bio,
            professions: draft.professions,
            profession: draft.professions[0] || '',
            specializations: draft.specializations,
            years_experience: draft.yearsExperience
              ? Number(draft.yearsExperience)
              : null,
          })
          .eq('id', expertProfileId);

        if (userId) {
          await supabase
            .from('profiles')
            .update({ full_name: draft.fullName })
            .eq('id', userId);
        }
      }

      setProfile(draft);
      if (userId) {
        try {
          localStorage.setItem(
            businessStorageKey(userId),
            JSON.stringify({
              vatId: draft.vatId,
              businessAddress: draft.businessAddress,
              businessPostalCode: draft.businessPostalCode,
              businessCity: draft.businessCity,
              commercialRegister: draft.commercialRegister,
              vatStatus: draft.vatStatus,
            })
          );
          localStorage.setItem('elu-expert-vat-status', draft.vatStatus);
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error('Error saving expert profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppPageShell>
        <div className="animate-pulse space-y-4 max-w-4xl">
          <div className="h-7 w-56 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <AppPageHeader
        title="Expert:innen-Profil"
        description="Verwalte dein öffentliches Profil"
      />

      <div className="max-w-4xl space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full justify-stretch">
            <TabsTrigger value="profil" className="flex-1 min-w-0 text-[11px] leading-tight px-1.5 sm:px-2.5 py-1">
              <Globe className="w-3 h-3 shrink-0" />
              <span className="truncate">Profil</span>
            </TabsTrigger>
            <TabsTrigger value="daten" className="flex-1 min-w-0 text-[11px] leading-tight px-1.5 sm:px-2.5 py-1">
              <UserRound className="w-3 h-3 shrink-0" />
              <span className="truncate">Daten verwalten</span>
            </TabsTrigger>
            <TabsTrigger value="qualifications" className="flex-1 min-w-0 text-[11px] leading-tight px-1.5 sm:px-2.5 py-1">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate">Qualifikationen</span>
            </TabsTrigger>
            <TabsTrigger value="konto" className="flex-1 min-w-0 text-[11px] leading-tight px-1.5 sm:px-2.5 py-1">
              <Landmark className="w-3 h-3 shrink-0" />
              <span className="truncate">Konto & Abo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profil" className="mt-4 space-y-4">
            {sedcardExpert ? (
              <ExpertSedcard
                expert={sedcardExpert}
                offers={sedcardOffers}
                reviews={sedcardReviews}
                mode="preview"
              />
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="px-4 sm:px-5 py-8 text-center text-sm text-gray-500 font-body">
                  Profil noch nicht geladen – Vorschau nicht verfügbar.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="daten" className="mt-4 space-y-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="px-4 sm:px-5 pt-4 pb-3">
                <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                  Daten verwalten
                </CardTitle>
                <CardDescription className="font-body text-xs sm:text-sm mt-1">
                  Persönliche Angaben, öffentliches Profil und Unternehmensdaten
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4 space-y-6">
                <section className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-14 h-14 border border-gray-200 shrink-0">
                      {draft.avatarUrl || profile.avatarUrl ? (
                        <AvatarImage
                          src={draft.avatarUrl || profile.avatarUrl}
                          alt={draft.fullName || displayName}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 font-body mb-0.5">
                        Account-Sichtbarkeit
                      </p>
                      <p className="font-body text-sm text-text-dark flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-primary-blue" />
                        Sichtbar
                      </p>
                    </div>
                  </div>
                </section>

                <div className="border-t border-gray-100" />

                <section className="space-y-3">
                  <h3 className="font-heading font-semibold text-sm text-text-dark">
                    Personendaten
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">Name</Label>
                      <Input
                        value={draft.fullName}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, fullName: e.target.value }))
                        }
                        className="font-body h-9 text-sm"
                        placeholder="Dein vollständiger Name"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">E-Mail-Adresse</Label>
                      <Input
                        value={user?.email || ''}
                        disabled
                        className="font-body h-9 text-sm bg-gray-50"
                      />
                    </div>
                  </div>
                </section>

                <div className="border-t border-gray-100" />

                <section className="space-y-4">
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-text-dark">
                      Professions & Specializations
                    </h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">
                      Frei bearbeitbar. Qualifikationen werden später einer Profession
                      zugeordnet – Klient:innen sehen verifizierte Professions auf der Sedcard.
                    </p>
                  </div>
                  <TagField
                    label="Professions"
                    description="z.B. Physiotherapie, Personal Training, Coaching"
                    values={draft.professions}
                    onChange={(professions) => setDraft((d) => ({ ...d, professions }))}
                    suggestions={PROFESSION_SUGGESTIONS}
                    placeholder="Profession eingeben"
                  />
                  <TagField
                    label="Specializations"
                    description="Fachliche Schwerpunkte innerhalb deiner Professions"
                    values={draft.specializations}
                    onChange={(specializations) =>
                      setDraft((d) => ({ ...d, specializations }))
                    }
                    suggestions={SPECIALIZATION_SUGGESTIONS}
                    placeholder="Specialization eingeben"
                  />
                </section>

                <div className="border-t border-gray-100" />

                <section className="space-y-3">
                  <h3 className="font-heading font-semibold text-sm text-text-dark">
                    Öffentliches Profil
                  </h3>
                  <p className="text-xs text-gray-500 font-body">
                    Diese Angaben erscheinen auf deiner Sedcard für Klient:innen.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">Bio</Label>
                      <Textarea
                        value={draft.bio}
                        onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                        placeholder="Erzähle Kund:innen über dich und deine Expertise..."
                        rows={4}
                        className="font-body text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-body text-sm">Erfahrung (Jahre)</Label>
                      <Input
                        type="number"
                        value={draft.yearsExperience}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, yearsExperience: e.target.value }))
                        }
                        className="font-body h-9 text-sm"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </section>

                <div className="border-t border-gray-100" />

                <section className="space-y-3">
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-text-dark">
                      Unternehmensinformationen
                    </h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">
                      Steuer- und Firmendaten für Auszahlung und Honorarnoten (getrennt von
                      Privatadresse).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">USt-Status</Label>
                      <select
                        value={draft.vatStatus}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            vatStatus: e.target.value as ExpertProfileFields['vatStatus'],
                          }))
                        }
                        className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm font-body"
                      >
                        <option value="kleinunternehmer">Kleinunternehmer</option>
                        <option value="heilbehandlung">Heilbehandlung (befreit)</option>
                        <option value="regelbesteuerung">Regelbesteuerung</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">USt-IdNr.</Label>
                      <Input
                        value={draft.vatId}
                        onChange={(e) => setDraft((d) => ({ ...d, vatId: e.target.value }))}
                        className="font-body h-9 text-sm"
                        placeholder="ATU12345678"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">Firmenadresse</Label>
                      <Input
                        value={draft.businessAddress}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, businessAddress: e.target.value }))
                        }
                        className="font-body h-9 text-sm"
                        placeholder="Straße und Hausnummer"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-body text-sm">PLZ</Label>
                      <Input
                        value={draft.businessPostalCode}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, businessPostalCode: e.target.value }))
                        }
                        className="font-body h-9 text-sm"
                        placeholder="1010"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-body text-sm">Ort</Label>
                      <Input
                        value={draft.businessCity}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, businessCity: e.target.value }))
                        }
                        className="font-body h-9 text-sm"
                        placeholder="Wien"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="font-body text-sm">Handelsregister-Eintrag</Label>
                      <Input
                        value={draft.commercialRegister}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, commercialRegister: e.target.value }))
                        }
                        className="font-body h-9 text-sm"
                        placeholder="FN 123456a, HG Wien"
                      />
                    </div>
                  </div>
                </section>

                <div className="border-t border-gray-100 pt-4">
                  <Button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={!isDirty || saving}
                    className="w-full sm:w-auto sm:min-w-[200px] h-11 font-body bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {saving ? 'Speichern…' : 'Speichern'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qualifications" className="mt-4 space-y-4">
            {expertProfileId ? (
              <QualificationsSection
                expertProfileId={expertProfileId}
                professions={profile.professions}
              />
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="px-4 sm:px-5 py-8 text-center text-sm text-gray-500 font-body">
                  Profil noch nicht geladen – Qualifikationen können gerade nicht hochgeladen werden.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="konto" className="mt-4 space-y-4">
            <StripeConnectOnboarding
              userId={userId}
              email={user?.email}
              returnPath="/app/expert-profil?tab=konto&stripe=return"
              refreshPath="/app/expert-profil?tab=konto&stripe=refresh"
              onCompleted={() => {
                try {
                  const raw = sessionStorage.getItem('elu-mock-expert-checklist');
                  const prev = raw ? JSON.parse(raw) : {};
                  sessionStorage.setItem(
                    'elu-mock-expert-checklist',
                    JSON.stringify({ ...prev, checklist_stripe_connected: true })
                  );
                } catch {
                  /* ignore */
                }
              }}
            />
            <ExpertAboManage userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppPageShell>
  );
}
