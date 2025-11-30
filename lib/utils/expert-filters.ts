import type { Expert, ExpertFilters } from '@/lib/types';

export function filterExperts(experts: Expert[], searchTerm: string, filters: ExpertFilters): Expert[] {
  if (experts.length === 0) return [];

  const searchLower = searchTerm.toLowerCase();

  return experts.filter((expert) => {
    if (searchTerm && !matchesSearch(expert, searchLower)) {
      return false;
    }

    if (filters.location && !matchesLocation(expert, filters.location)) {
      return false;
    }

    if (!matchesExperienceRange(expert, filters.minExperience, filters.maxExperience)) {
      return false;
    }

    if (!matchesPriceRange(expert, filters.minPrice, filters.maxPrice)) {
      return false;
    }

    if (filters.minRating !== undefined && expert.rating < filters.minRating) {
      return false;
    }

    if (filters.availability && expert.availability_status !== filters.availability) {
      return false;
    }

    if (filters.specializations && filters.specializations.length > 0) {
      if (!matchesSpecializations(expert, filters.specializations)) {
        return false;
      }
    }

    return true;
  });
}

function matchesSearch(expert: Expert, searchLower: string): boolean {
  return (
    expert.full_name.toLowerCase().includes(searchLower) ||
    expert.specializations.some((spec) => spec.toLowerCase().includes(searchLower)) ||
    expert.city?.toLowerCase().includes(searchLower) ||
    false
  );
}

function matchesLocation(expert: Expert, location: string): boolean {
  return expert.city?.toLowerCase().includes(location.toLowerCase()) || false;
}

function matchesExperienceRange(
  expert: Expert,
  min?: number,
  max?: number
): boolean {
  const experience = expert.years_experience || 0;

  if (min !== undefined && experience < min) return false;
  if (max !== undefined && experience > max) return false;

  return true;
}

function matchesPriceRange(expert: Expert, min?: number, max?: number): boolean {
  if (min !== undefined && expert.hourly_rate < min) return false;
  if (max !== undefined && expert.hourly_rate > max) return false;

  return true;
}

function matchesSpecializations(
  expert: Expert,
  filterSpecs: string[]
): boolean {
  return filterSpecs.some((filterSpec) =>
    expert.specializations.includes(filterSpec)
  );
}

export function extractSpecializations(experts: Expert[]): string[] {
  const specs = new Set<string>();

  for (const expert of experts) {
    for (const spec of expert.specializations) {
      specs.add(spec);
    }
  }

  return Array.from(specs).sort();
}
