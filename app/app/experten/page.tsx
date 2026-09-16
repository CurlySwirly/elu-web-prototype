'use client';

import { getBackendMode } from '@/lib/backend/mode';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchExperts, fetchExpertOffers, Expert } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpertFilters } from '@/components/ExpertFilters';
import { Search, MapPin, CheckCircle2, Star } from 'lucide-react';
import type { ExpertFilters as ExpertFiltersType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { getAppPageMeta } from '@/lib/app-page-meta';

function normalizeOfferFormat(format: string): 'online' | 'in_person' | null {
  const value = format.trim().toLowerCase();
  if (value === 'online') return 'online';
  if (
    value === 'präsenz' ||
    value === 'praesenz' ||
    value === 'vor ort' ||
    value === 'in_person' ||
    value === 'in-person' ||
    value === 'in person'
  ) {
    return 'in_person';
  }
  return null;
}

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [expertFormats, setExpertFormats] = useState<
    Record<string, Set<'online' | 'in_person'>>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ExpertFiltersType>({});

  useEffect(() => {
    loadExperts();
  }, []);

  const loadExperts = async () => {
    try {
      const data = await fetchExperts();
      setExperts(data);

      const formatsMap: Record<string, Set<'online' | 'in_person'>> = {};
      const backendMode = getBackendMode();
      const usingMockIds = data.some((e) => /^\d+$/.test(e.id) || e.id.startsWith('mock-'));

      if (backendMode === 'mock' || usingMockIds) {
        const { mockExpertOffers } = await import('@/lib/backend/mock/data');
        for (const offer of mockExpertOffers) {
          const normalized = normalizeOfferFormat(offer.format);
          if (!normalized) continue;
          if (!formatsMap[offer.expert_id]) {
            formatsMap[offer.expert_id] = new Set();
          }
          formatsMap[offer.expert_id].add(normalized);
        }
      } else {
        const ids = data.map((e) => e.id);
        if (ids.length > 0) {
          const { data: offers, error: offersError } = await supabase
            .from('expert_offers')
            .select('expert_id, format')
            .in('expert_id', ids);

          if (offersError) {
            await Promise.all(
              data.map(async (expert) => {
                const offers = await fetchExpertOffers(expert.id);
                for (const offer of offers) {
                  const normalized = normalizeOfferFormat(offer.format);
                  if (!normalized) continue;
                  if (!formatsMap[expert.id]) formatsMap[expert.id] = new Set();
                  formatsMap[expert.id].add(normalized);
                }
              })
            );
          } else {
            for (const offer of offers || []) {
              const normalized = normalizeOfferFormat(offer.format || '');
              if (!normalized) continue;
              if (!formatsMap[offer.expert_id]) {
                formatsMap[offer.expert_id] = new Set();
              }
              formatsMap[offer.expert_id].add(normalized);
            }
          }
        }
      }

      setExpertFormats(formatsMap);
    } catch (error) {
      console.error('Failed to load experts:', error);
      try {
        const { mockExperts, mockExpertOffers } = await import('@/lib/backend/mock/data');
        setExperts(mockExperts);
        const formatsMap: Record<string, Set<'online' | 'in_person'>> = {};
        for (const offer of mockExpertOffers) {
          const normalized = normalizeOfferFormat(offer.format);
          if (!normalized) continue;
          if (!formatsMap[offer.expert_id]) formatsMap[offer.expert_id] = new Set();
          formatsMap[offer.expert_id].add(normalized);
        }
        setExpertFormats(formatsMap);
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  };

  const availableSpecializations = useMemo(() => {
    const specs = new Set<string>();
    experts.forEach((expert) => {
      expert.specializations.forEach((spec) => specs.add(spec));
    });
    return Array.from(specs).sort();
  }, [experts]);

  const filteredExperts = useMemo(() => {
    const availabilityRank = (status?: string) => {
      if (status === 'available') return 0;
      if (status === 'busy') return 1;
      return 2;
    };

    const filtered = experts.filter((expert) => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = expert.full_name.toLowerCase().includes(searchLower);
        const matchesSpec = expert.specializations.some((spec) =>
          spec.toLowerCase().includes(searchLower)
        );
        const matchesCity = expert.city?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesSpec && !matchesCity) {
          return false;
        }
      }

      if (filters.format) {
        const formats = expertFormats[expert.id];
        if (!formats?.has(filters.format)) {
          return false;
        }
      }

      if (filters.minRating !== undefined) {
        if (expert.rating < filters.minRating) {
          return false;
        }
      }

      if (filters.specializations && filters.specializations.length > 0) {
        const hasMatchingSpec = filters.specializations.some((filterSpec) =>
          expert.specializations.includes(filterSpec)
        );
        if (!hasMatchingSpec) {
          return false;
        }
      }

      return true;
    });

    if (!filters.sortBy) return filtered;

    return [...filtered].sort((a, b) => {
      if (filters.sortBy === 'best_rating') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.total_reviews || 0) - (a.total_reviews || 0);
      }

      const rankDiff =
        availabilityRank(a.availability_status) - availabilityRank(b.availability_status);
      if (rankDiff !== 0) return rankDiff;
      return b.rating - a.rating;
    });
  }, [experts, expertFormats, searchTerm, filters]);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4" />
            <p className="text-gray-600 font-body">Lädt Expert:innen...</p>
          </div>
        </div>
      </div>
    );
  }

  const pageMeta = getAppPageMeta('/app/experten');

  return (
    <AppPageShell>
      <AppPageHeader
        title={pageMeta?.title || 'Expert:innen finden'}
        description={
          pageMeta?.description ||
          'Durchsuche unser Netzwerk von zertifizierten Wellness-Expert:innen'
        }
      />

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Suche nach Name, Spezialisierung oder Stadt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 font-body h-11 rounded-xl border-gray-200"
            />
          </div>
        </div>

        <ExpertFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableSpecializations={availableSpecializations}
        />
      </div>

      {filteredExperts.length === 0 ? (
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 font-body">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Keine Expert:innen gefunden. Versuche einen anderen Suchbegriff oder passe die Filter an.'
                : 'Noch keine Expert:innen verfügbar.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-body">
            {filteredExperts.length} Expert:innen gefunden
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredExperts.map((expert) => (
              <Card
                key={expert.id}
                className="border-2 hover:border-primary-blue transition-colors"
              >
                <CardHeader className="p-3.5 sm:p-4 pb-3 space-y-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
                      <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-sm">
                        {expert.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <CardTitle className="font-heading text-base sm:text-lg text-text-dark truncate">
                              {expert.full_name}
                            </CardTitle>
                            {expert.is_verified && (
                              <CheckCircle2 className="w-4 h-4 text-primary-blue shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-body text-gray-500">
                              {expert.rating.toFixed(1)} ({expert.total_reviews})
                            </span>
                          </div>
                          {expert.city && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-body text-gray-500 truncate">
                                {expert.city}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="shrink-0 text-right flex items-baseline justify-end gap-1">
                          <span className="text-[10px] text-gray-500 font-body">ab</span>
                          <span className="font-heading font-bold text-text-dark text-base sm:text-lg">
                            €{expert.hourly_rate}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 py-5">
                    {expert.specializations.slice(0, 3).map((spec, index) => (
                      <Badge
                        key={index}
                        className="bg-info-bg text-info-text border-none font-body text-[11px]"
                      >
                        {spec}
                      </Badge>
                    ))}
                    {expert.specializations.length > 3 && (
                      <Badge className="bg-gray-100 text-gray-600 border-none font-body text-[11px]">
                        +{expert.specializations.length - 3}
                      </Badge>
                    )}
                  </div>

                  <CardDescription className="font-body text-sm line-clamp-2 !mt-0">
                    {expert.bio || 'Noch keine Beschreibung verfügbar.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-0">
                  <Link href={`/app/experten/${expert.id}`}>
                    <Button className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body">
                      Profil ansehen
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppPageShell>
  );
}
