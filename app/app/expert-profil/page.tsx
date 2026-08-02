'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useState, useEffect, useMemo } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Globe,
  MessageSquare,
  Pencil,
  Landmark,
  Plus,
  Star,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { QualificationsSection } from '@/components/QualificationsSection';
import { ExpertSedcard, type ExpertSedcardData } from '@/components/ExpertSedcard';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { fetchExpertById, fetchExpertOffers, type ExpertOffer } from '@/lib/api';
import { reviewService, type Review } from '@/lib/services/review';

type ExpertProfileFields = {
  fullName: string;
  bio: string;
  professions: string[];
  specializations: string[];
  verifiedProfessions: string[];
  yearsExperience: string;
  avatarUrl: string;
};

type PayoutAccount = {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
};

const EMPTY_PROFILE: ExpertProfileFields = {
  fullName: '',
  bio: '',
  professions: [],
  specializations: [],
  verifiedProfessions: [],
  yearsExperience: '',
  avatarUrl: '',
};

const EMPTY_PAYOUT: PayoutAccount = {
  accountHolder: '',
  iban: '',
  bic: '',
  bankName: '',
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

function displayValue(value?: string) {
  const trimmed = (value || '').trim();
  return trimmed || '—';
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function maskIban(iban: string) {
  const compact = iban.replace(/\s+/g, '').toUpperCase();
  if (compact.length < 8) return compact || '—';
  const country = compact.slice(0, 4);
  const last4 = compact.slice(-4);
  return `${country} **** **** ${last4}`;
}

function payoutStorageKey(userId: string) {
  return `elu-expert-payout:v2:${userId}`;
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
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ExpertProfileFields>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<ExpertProfileFields>(EMPTY_PROFILE);
  const [payout, setPayout] = useState<PayoutAccount>(EMPTY_PAYOUT);
  const [payoutDraft, setPayoutDraft] = useState<PayoutAccount>(EMPTY_PAYOUT);
  const [editingPayout, setEditingPayout] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
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
    const fetchExpertProfile = async () => {
      const backendMode = getBackendMode();

      if (backendMode === 'mock') {
        const {
          mockExperts,
          mockOnboardingExpertProfile,
          MOCK_ONBOARDING_EXPERT_USER_ID,
        } = await import('@/lib/backend/mock/data');

        const isOnboardingDemo = userId === MOCK_ONBOARDING_EXPERT_USER_ID;
        const next: ExpertProfileFields = isOnboardingDemo
          ? {
              fullName: mockOnboardingExpertProfile.full_name,
              bio: mockOnboardingExpertProfile.bio || '',
              professions: ['Physiotherapie'],
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
    if (!userId) return;
    try {
      const raw = localStorage.getItem(payoutStorageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw) as PayoutAccount;
        // Upgrade incomplete/empty saves with demo kontodaten
        if (parsed.iban?.trim() && parsed.accountHolder?.trim()) {
          setPayout(parsed);
          setPayoutDraft(parsed);
          return;
        }
      }

      void import('@/lib/backend/mock/data').then(({ mockExpertPayoutAccount }) => {
          const seed: PayoutAccount = {
            accountHolder: mockExpertPayoutAccount.accountHolder,
            iban: mockExpertPayoutAccount.iban,
            bic: mockExpertPayoutAccount.bic,
            bankName: mockExpertPayoutAccount.bankName,
          };
          setPayout(seed);
          setPayoutDraft(seed);
          localStorage.setItem(payoutStorageKey(userId), JSON.stringify(seed));
        });
    } catch {
      /* ignore */
    }
  }, [userId, profile.fullName]);

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

  const reviewStats = useMemo(() => {
    const count = sedcardReviews.length;
    const average =
      count > 0
        ? sedcardReviews.reduce((sum, r) => sum + r.rating, 0) / count
        : sedcardMeta?.rating ?? 0;
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: sedcardReviews.filter((r) => r.rating === stars).length,
    }));
    return {
      count: count || sedcardMeta?.total_reviews || 0,
      average,
      distribution,
    };
  }, [sedcardReviews, sedcardMeta]);

  const { first: firstName, last: lastName } = useMemo(
    () => splitName(profile.fullName),
    [profile.fullName]
  );

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  const payoutConfigured = Boolean(payout.iban.trim() && payout.accountHolder.trim());

  const startEditing = () => {
    setDraft(profile);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(profile);
    setEditing(false);
  };

  const handleSaveProfile = async () => {
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
      setEditing(false);
    } catch (error) {
      console.error('Error saving expert profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayout = async () => {
    if (!userId) return;
    setSavingPayout(true);
    setPayoutSaved(false);
    try {
      const next = {
        accountHolder: payoutDraft.accountHolder.trim(),
        iban: payoutDraft.iban.trim(),
        bic: payoutDraft.bic.trim(),
        bankName: payoutDraft.bankName.trim(),
      };
      localStorage.setItem(payoutStorageKey(userId), JSON.stringify(next));
      setPayout(next);
      setPayoutDraft(next);
      setEditingPayout(false);
      setPayoutSaved(true);
      window.setTimeout(() => setPayoutSaved(false), 2500);
    } catch (error) {
      console.error('Error saving payout account:', error);
    } finally {
      setSavingPayout(false);
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
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex h-auto min-w-full sm:min-w-0 w-max justify-start rounded-full bg-gray-100 p-0.5 gap-0.5">
              <TabsTrigger
                value="overview"
                className="gap-1 rounded-full px-2.5 py-1 text-[11px] leading-tight data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <Eye className="w-3 h-3" />
                Profilübersicht
              </TabsTrigger>
              <TabsTrigger
                value="stammdaten"
                className="gap-1 rounded-full px-2.5 py-1 text-[11px] leading-tight data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <UserRound className="w-3 h-3" />
                Stammdaten verwalten
              </TabsTrigger>
              <TabsTrigger
                value="qualifications"
                className="gap-1 rounded-full px-2.5 py-1 text-[11px] leading-tight data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <FileText className="w-3 h-3" />
                Qualifikationen
              </TabsTrigger>
              <TabsTrigger
                value="sedcard"
                className="gap-1 rounded-full px-2.5 py-1 text-[11px] leading-tight data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <Globe className="w-3 h-3" />
                Sedcard
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="gap-1 rounded-full px-2.5 py-1 text-[11px] leading-tight data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <MessageSquare className="w-3 h-3" />
                Bewertungen
              </TabsTrigger>
              <TabsTrigger
                value="konto"
                className="gap-1 rounded-full px-2.5 py-1 text-[11px] leading-tight data-[state=active]:bg-white data-[state=active]:text-text-dark data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <Landmark className="w-3 h-3" />
                Konto
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="px-4 sm:px-5 py-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border border-gray-200 shrink-0">
                      {profile.avatarUrl ? (
                        <AvatarImage src={profile.avatarUrl} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-text-dark text-base sm:text-lg leading-snug truncate">
                        {displayName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 font-body mt-0.5 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('stammdaten');
                      startEditing();
                    }}
                    className="font-body shrink-0 h-8 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Bearbeiten
                  </Button>
                </div>
                <div className="border-t border-gray-100" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-xs text-gray-500 font-body mb-0.5">Vorname</p>
                    <p className="font-body text-sm text-text-dark">{displayValue(firstName)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-body mb-0.5">Nachname</p>
                    <p className="font-body text-sm text-text-dark">{displayValue(lastName)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-body mb-0.5">E-Mail-Adresse</p>
                    <p className="font-body text-sm text-text-dark font-semibold">
                      {displayValue(user?.email)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-body mb-0.5">
                      Account-Sichtbarkeitsstatus
                    </p>
                    <p className="font-body text-sm text-text-dark flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-primary-blue" />
                      Sichtbar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stammdaten" className="mt-4 space-y-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
                <div>
                  <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                    Stammdaten verwalten
                  </CardTitle>
                  <CardDescription className="font-body text-xs sm:text-sm mt-1">
                    Pflege deiner personenbezogenen Basisdaten
                  </CardDescription>
                </div>
                {!editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="font-body shrink-0 h-8 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Bearbeiten
                  </Button>
                ) : (
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      disabled={saving}
                      className="font-body h-8 text-xs"
                    >
                      Abbrechen
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleSaveProfile()}
                      disabled={saving}
                      className="font-body h-8 text-xs bg-gradient-to-r from-primary-blue to-primary-green text-white"
                    >
                      {saving ? 'Speichern…' : 'Speichern'}
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4 space-y-6">
                <section className="space-y-3">
                  <h3 className="font-heading font-semibold text-sm text-text-dark">
                    Personendaten
                  </h3>
                  {!editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-gray-500 font-body mb-0.5">Name</p>
                        <p className="font-body text-sm text-text-dark">
                          {displayValue(profile.fullName)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-body mb-0.5">E-Mail-Adresse</p>
                        <p className="font-body text-sm text-text-dark font-semibold">
                          {displayValue(user?.email)}
                        </p>
                      </div>
                    </div>
                  ) : (
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
                  )}
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
                    values={editing ? draft.professions : profile.professions}
                    onChange={(professions) => setDraft((d) => ({ ...d, professions }))}
                    suggestions={PROFESSION_SUGGESTIONS}
                    placeholder="Profession eingeben"
                    disabled={!editing}
                  />
                  <TagField
                    label="Specializations"
                    description="Fachliche Schwerpunkte innerhalb deiner Professions"
                    values={editing ? draft.specializations : profile.specializations}
                    onChange={(specializations) =>
                      setDraft((d) => ({ ...d, specializations }))
                    }
                    suggestions={SPECIALIZATION_SUGGESTIONS}
                    placeholder="Specialization eingeben"
                    disabled={!editing}
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
                  {!editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="text-xs text-gray-500 font-body mb-0.5">Erfahrung (Jahre)</p>
                        <p className="font-body text-sm text-text-dark">
                          {displayValue(profile.yearsExperience)}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-500 font-body mb-0.5">Bio</p>
                        <p className="font-body text-sm text-text-dark whitespace-pre-wrap leading-relaxed">
                          {displayValue(profile.bio)}
                        </p>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </section>
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

          <TabsContent value="sedcard" className="mt-4 space-y-4">
            {sedcardExpert ? (
              <ExpertSedcard
                expert={sedcardExpert}
                offers={sedcardOffers}
                mode="preview"
              />
            ) : (
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="px-4 sm:px-5 py-8 text-center text-sm text-gray-500 font-body">
                  Profil noch nicht geladen – Sedcard-Vorschau nicht verfügbar.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_1fr] gap-4">
              <Card className="border border-gray-200 shadow-sm h-fit">
                <CardHeader className="px-4 sm:px-5 pt-4 pb-2">
                  <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                    Übersicht
                  </CardTitle>
                  <CardDescription className="font-body text-xs sm:text-sm">
                    Deine wichtigsten Kennzahlen
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-5 space-y-5">
                  <div className="text-center rounded-xl bg-gray-50 border border-gray-100 px-4 py-5">
                    <p className="text-4xl font-heading font-bold text-text-dark tabular-nums">
                      {reviewStats.count > 0 ? reviewStats.average.toFixed(1) : '—'}
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            reviewStats.count > 0 && star <= Math.round(reviewStats.average)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 font-body">
                      Sterne-Durchschnitt
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 px-4 py-3 flex items-baseline justify-between gap-3">
                    <p className="text-sm text-gray-500 font-body">Bewertungen gesamt</p>
                    <p className="text-xl font-heading font-bold text-text-dark tabular-nums">
                      {reviewStats.count}
                    </p>
                  </div>

                  {reviewStats.count > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-body">Verteilung</p>
                      {reviewStats.distribution.map(({ stars, count }) => {
                        const pct =
                          reviewStats.count > 0
                            ? Math.round((count / reviewStats.count) * 100)
                            : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2">
                            <span className="w-3 text-xs text-gray-500 font-body tabular-nums">
                              {stars}
                            </span>
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                            <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary-blue"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-gray-500 font-body tabular-nums">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-gray-200 shadow-sm">
                <CardHeader className="px-4 sm:px-5 pt-4 pb-2">
                  <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                    Alle Bewertungen
                  </CardTitle>
                  <CardDescription className="font-body text-xs sm:text-sm">
                    Rückmeldungen deiner Klient:innen
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-6">
                  {sedcardReviews.length === 0 ? (
                    <p className="text-sm text-gray-500 font-body text-center py-6">
                      Noch keine Bewertungen vorhanden.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sedcardReviews.map((review) => (
                        <div
                          key={review.id}
                          className="rounded-xl border border-gray-100 bg-gray-50/60 p-4"
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="flex flex-col items-center w-[4.5rem] shrink-0">
                              <Avatar className="w-11 h-11">
                                <AvatarImage
                                  src={review.client?.avatar_url}
                                  alt={review.client?.full_name}
                                />
                                <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-xs">
                                  {(review.client?.full_name || 'A')
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-heading font-semibold text-text-dark text-xs text-center mt-2 leading-snug line-clamp-2 w-full">
                                {review.client?.full_name || 'Anonym'}
                              </p>
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                {review.title ? (
                                  <p className="font-heading font-semibold text-text-dark text-sm leading-snug min-w-0">
                                    {review.title}
                                  </p>
                                ) : (
                                  <span className="min-w-0" />
                                )}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-3.5 h-3.5 ${
                                        star <= review.rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 font-body leading-relaxed">
                                {review.review_text}
                              </p>

                              <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                                {review.appointment?.offer?.title ? (
                                  <p className="text-xs text-gray-500 font-body min-w-0 truncate">
                                    Session: {review.appointment.offer.title}
                                  </p>
                                ) : (
                                  <span />
                                )}
                                <span className="text-xs text-gray-500 font-body shrink-0">
                                  {format(parseISO(review.created_at), 'dd. MMM yyyy', {
                                    locale: de,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="konto" className="mt-4 space-y-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
                <div className="min-w-0">
                  <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                    Auszahlungskonto
                  </CardTitle>
                  <CardDescription className="font-body text-xs sm:text-sm mt-1 max-w-xl">
                    Deine Honorare werden per SEPA auf dieses Konto überwiesen. elu speichert keine
                    Kreditkarte für Expert:innen – Auszahlungen laufen nur auf eine verifizierte
                    IBAN.
                  </CardDescription>
                </div>
                {!editingPayout && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setPayoutDraft(
                        payoutConfigured
                          ? payout
                          : {
                              accountHolder: '',
                              iban: '',
                              bic: '',
                              bankName: '',
                            }
                      );
                      setEditingPayout(true);
                      setPayoutSaved(false);
                    }}
                    className="font-body shrink-0 h-8 text-xs bg-primary-blue text-white hover:bg-primary-blue/90"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Konto hinterlegen
                  </Button>
                )}
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-5 space-y-4">
                {payoutSaved && (
                  <Alert className="border-primary-green/40 bg-primary-green/10 py-2">
                    <Check className="h-4 w-4 text-text-dark" />
                    <AlertDescription className="font-body text-sm text-text-dark">
                      Kontodaten gespeichert.
                    </AlertDescription>
                  </Alert>
                )}

                {editingPayout ? (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="accountHolder" className="font-body text-sm">
                          Kontoinhaber *
                        </Label>
                        <Input
                          id="accountHolder"
                          value={payoutDraft.accountHolder}
                          onChange={(e) =>
                            setPayoutDraft((d) => ({ ...d, accountHolder: e.target.value }))
                          }
                          className="font-body h-9 text-sm"
                          placeholder="Demo Expert GmbH"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="iban" className="font-body text-sm">
                          IBAN *
                        </Label>
                        <Input
                          id="iban"
                          value={payoutDraft.iban}
                          onChange={(e) =>
                            setPayoutDraft((d) => ({ ...d, iban: e.target.value }))
                          }
                          className="font-body h-9 text-sm"
                          placeholder="AT12 1234 5678 9078 90"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bic" className="font-body text-sm">
                          BIC
                        </Label>
                        <Input
                          id="bic"
                          value={payoutDraft.bic}
                          onChange={(e) =>
                            setPayoutDraft((d) => ({ ...d, bic: e.target.value }))
                          }
                          className="font-body h-9 text-sm"
                          placeholder="GIBAATWWXXX"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName" className="font-body text-sm">
                          Bank
                        </Label>
                        <Input
                          id="bankName"
                          value={payoutDraft.bankName}
                          onChange={(e) =>
                            setPayoutDraft((d) => ({ ...d, bankName: e.target.value }))
                          }
                          className="font-body h-9 text-sm"
                          placeholder="Erste Bank"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPayoutDraft(payout);
                          setEditingPayout(false);
                        }}
                        disabled={savingPayout}
                        className="font-body h-8 text-xs"
                      >
                        Abbrechen
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleSavePayout()}
                        disabled={
                          savingPayout ||
                          !payoutDraft.accountHolder.trim() ||
                          !payoutDraft.iban.trim()
                        }
                        className="font-body h-8 text-xs bg-primary-blue text-white hover:bg-primary-blue/90"
                      >
                        {savingPayout ? 'Speichern…' : 'Speichern'}
                      </Button>
                    </div>
                  </div>
                ) : payoutConfigured ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                      <Landmark className="h-5 w-5 text-gray-600" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="font-heading font-semibold text-text-dark text-sm tabular-nums">
                        {maskIban(payout.iban)}
                      </p>
                      <p className="text-xs text-gray-500 font-body">
                        Kontoinhaber: {displayValue(payout.accountHolder)}
                      </p>
                      <p className="text-xs text-gray-500 font-body">
                        BIC: {displayValue(payout.bic)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPayoutDraft(payout);
                          setEditingPayout(true);
                          setPayoutSaved(false);
                        }}
                        className="font-body h-8 text-xs"
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!userId) return;
                          const cleared = { ...EMPTY_PAYOUT };
                          setPayout(cleared);
                          setPayoutDraft(cleared);
                          setEditingPayout(false);
                          setPayoutSaved(false);
                          localStorage.removeItem(payoutStorageKey(userId));
                        }}
                        className="font-body h-8 w-8 p-0 text-red-600 border-gray-200 hover:bg-red-50 hover:text-red-700"
                        aria-label="Konto löschen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center">
                    <Landmark className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500 font-body">
                      Noch kein Auszahlungskonto hinterlegt.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppPageShell>
  );
}
