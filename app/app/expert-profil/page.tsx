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
import { Pencil } from 'lucide-react';
import { DocumentUpload } from '@/components/DocumentUpload';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { cn } from '@/lib/utils';

type ExpertProfileFields = {
  fullName: string;
  bio: string;
  specializations: string;
  yearsExperience: string;
  avatarUrl: string;
};

const EMPTY_PROFILE: ExpertProfileFields = {
  fullName: '',
  bio: '',
  specializations: '',
  yearsExperience: '',
  avatarUrl: '',
};

function displayValue(value?: string) {
  const trimmed = (value || '').trim();
  return trimmed || '—';
}

export default function ExpertProfilePage() {
  const { user, userId } = useAuth();
  const [expertProfileId, setExpertProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ExpertProfileFields>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<ExpertProfileFields>(EMPTY_PROFILE);

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
              specializations: '',
              yearsExperience: '',
              avatarUrl: mockOnboardingExpertProfile.avatar_url || '',
            }
          : {
              fullName: mockExperts[0].full_name,
              bio: mockExperts[0].bio || '',
              specializations: (mockExperts[0].specializations || []).join(', '),
              yearsExperience: String(mockExperts[0].years_experience ?? ''),
              avatarUrl: mockExperts[0].avatar_url || '',
            };
        setProfile(next);
        setDraft(next);
        setExpertProfileId(
          isOnboardingDemo ? mockOnboardingExpertProfile.id : `mock-expert-${userId}`
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
            specializations,
            years_experience,
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
          const next: ExpertProfileFields = {
            fullName: profileRow?.full_name || '',
            bio: data.bio || '',
            specializations: Array.isArray(data.specializations)
              ? data.specializations.join(', ')
              : data.specializations || '',
            yearsExperience:
              data.years_experience != null ? String(data.years_experience) : '',
            avatarUrl: profileRow?.avatar_url || '',
          };
          setProfile(next);
          setDraft(next);
        }
      } catch (error) {
        console.error('Error fetching expert profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void fetchExpertProfile();
    }
  }, [userId]);

  const displayName = useMemo(
    () => profile.fullName.trim() || user?.email || 'Expert:in',
    [profile.fullName, user?.email]
  );

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

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
        const specializations = draft.specializations
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        await supabase
          .from('expert_profiles')
          .update({
            bio: draft.bio,
            specializations,
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
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
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
                <p className="text-xs sm:text-sm text-gray-500 font-body mt-0.5">
                  Öffentliches Expert:innen-Profil
                </p>
              </div>
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

          <CardContent className="px-4 sm:px-5 pb-4 space-y-4">
            <div className="border-t border-gray-100" />

            {!editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">Name</p>
                  <p className="font-body text-sm text-text-dark">{displayValue(profile.fullName)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">Spezialisierungen</p>
                  <p className="font-body text-sm text-text-dark">
                    {displayValue(profile.specializations)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">Erfahrung (Jahre)</p>
                  <p className="font-body text-sm text-text-dark">
                    {displayValue(profile.yearsExperience)}
                  </p>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-gray-500 font-body mb-0.5">Bio</p>
                  <p className="font-body text-sm text-text-dark whitespace-pre-wrap leading-relaxed">
                    {displayValue(profile.bio)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">E-Mail-Adresse</p>
                  <p className={cn('font-body text-sm text-text-dark font-semibold')}>
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
                    onChange={(e) => setDraft((d) => ({ ...d, fullName: e.target.value }))}
                    className="font-body h-9 text-sm"
                    placeholder="Dein vollständiger Name"
                  />
                </div>
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
                  <Label className="font-body text-sm">Spezialisierungen</Label>
                  <Input
                    value={draft.specializations}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, specializations: e.target.value }))
                    }
                    className="font-body h-9 text-sm"
                    placeholder="z.B. Massage, Yoga, Meditation"
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
          </CardContent>
        </Card>

        {expertProfileId && (
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="px-4 sm:px-5 pt-4 pb-2 space-y-1">
              <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
                Qualifikationen hochladen
              </CardTitle>
              <CardDescription className="font-body text-xs sm:text-sm">
                Lade deine Abschlüsse, Zertifikate und Lizenzen hoch für die Verifizierung
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 pb-4">
              <DocumentUpload
                expertProfileId={expertProfileId}
                onUploadComplete={() => {
                  console.log('Documents uploaded successfully');
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </AppPageShell>
  );
}
