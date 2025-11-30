'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { fetchExperts, Expert } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExpertFilters } from '@/components/ExpertFilters';
import { Star, Search, MapPin, CheckCircle2, Clock } from 'lucide-react';
import type { ExpertFilters as ExpertFiltersType } from '@/lib/types';

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ExpertFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadExperts();
  }, []);

  const loadExperts = async () => {
    try {
      const data = await fetchExperts();
      setExperts(data);
    } catch (error) {
      console.error('Failed to load experts:', error);
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
    return experts.filter((expert) => {
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

      if (filters.location) {
        const locationLower = filters.location.toLowerCase();
        if (!expert.city?.toLowerCase().includes(locationLower)) {
          return false;
        }
      }

      if (filters.minExperience !== undefined) {
        const experience = expert.years_experience || 0;
        if (experience < filters.minExperience) {
          return false;
        }
      }

      if (filters.maxExperience !== undefined) {
        const experience = expert.years_experience || 0;
        if (experience > filters.maxExperience) {
          return false;
        }
      }

      if (filters.minPrice !== undefined) {
        if (expert.hourly_rate < filters.minPrice) {
          return false;
        }
      }

      if (filters.maxPrice !== undefined) {
        if (expert.hourly_rate > filters.maxPrice) {
          return false;
        }
      }

      if (filters.minRating !== undefined) {
        if (expert.rating < filters.minRating) {
          return false;
        }
      }

      if (filters.availability) {
        if (expert.availability_status !== filters.availability) {
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
  }, [experts, searchTerm, filters]);

  const getAvailabilityBadge = (status?: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 font-body">
            <Clock className="w-3 h-3 mr-1" />
            Verfügbar
          </Badge>
        );
      case 'busy':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 font-body">
            <Clock className="w-3 h-3 mr-1" />
            Beschäftigt
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300 font-body">
            <Clock className="w-3 h-3 mr-1" />
            Nicht verfügbar
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
            <p className="text-gray-600 font-body">Lädt Expert:innen...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-heading font-bold text-text-dark mb-2">
          Expert:innen finden
        </h1>
        <p className="text-gray-600 font-body">
          Durchsuche unser Netzwerk von zertifizierten Wellness-Expert:innen
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Suche nach Name, Spezialisierung oder Stadt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 font-body"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="font-body"
        >
          {showFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {showFilters && (
          <div className="lg:col-span-1">
            <ExpertFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableSpecializations={availableSpecializations}
            />
          </div>
        )}

        <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
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
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 font-body">
                  {filteredExperts.length} Expert:innen gefunden
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredExperts.map((expert) => (
                  <Card
                    key={expert.id}
                    className="border-2 hover:border-primary-blue transition-colors hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
                          <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading">
                            {expert.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="font-heading text-xl text-text-dark">
                              {expert.full_name}
                            </CardTitle>
                            {expert.is_verified && (
                              <CheckCircle2 className="w-5 h-5 text-primary-blue" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-body text-gray-600">
                              {expert.rating.toFixed(1)} ({expert.total_reviews} Bewertungen)
                            </span>
                          </div>
                          {expert.city && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-body text-gray-600">
                                {expert.city}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {expert.availability_status && (
                        <div className="mb-3">
                          {getAvailabilityBadge(expert.availability_status)}
                        </div>
                      )}

                      <CardDescription className="font-body line-clamp-2 min-h-[40px]">
                        {expert.bio || 'Noch keine Beschreibung verfügbar.'}
                      </CardDescription>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {expert.specializations.slice(0, 3).map((spec, index) => (
                          <Badge
                            key={index}
                            className="bg-info-bg text-info-text border-none font-body"
                          >
                            {spec}
                          </Badge>
                        ))}
                        {expert.specializations.length > 3 && (
                          <Badge className="bg-gray-100 text-gray-600 border-none font-body">
                            +{expert.specializations.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 font-body">
                            Ab{' '}
                            <span className="font-semibold text-text-dark">
                              €{expert.hourly_rate}
                            </span>
                            /Stunde
                          </p>
                          {expert.years_experience !== undefined &&
                            expert.years_experience > 0 && (
                              <p className="text-xs text-gray-500 font-body mt-1">
                                {expert.years_experience} Jahre Erfahrung
                              </p>
                            )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <Link href={`/app/experten/${expert.id}`}>
                        <Button className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body">
                          Profil ansehen
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
