'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlidersHorizontal, Star, X } from 'lucide-react';
import type { ExpertFilters as ExpertFiltersType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ExpertFiltersProps {
  filters: ExpertFiltersType;
  onFiltersChange: (filters: ExpertFiltersType) => void;
  availableSpecializations: string[];
}

export function ExpertFilters({
  filters,
  onFiltersChange,
  availableSpecializations,
}: ExpertFiltersProps) {
  const [open, setOpen] = useState(false);
  const selectedSpecs = filters.specializations || [];

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.format) count += 1;
    if (filters.minRating !== undefined) count += 1;
    if (filters.sortBy) count += 1;
    if (selectedSpecs.length > 0) count += 1;
    return count;
  }, [filters, selectedSpecs.length]);

  const setRating = (value: string) => {
    if (value === 'all') {
      const { minRating, ...rest } = filters;
      onFiltersChange(rest);
      return;
    }
    onFiltersChange({ ...filters, minRating: parseFloat(value) });
  };

  const setFormat = (value: string) => {
    if (value === 'all') {
      const { format, ...rest } = filters;
      onFiltersChange(rest);
      return;
    }
    onFiltersChange({
      ...filters,
      format: value as ExpertFiltersType['format'],
    });
  };

  const setSortBy = (value: string) => {
    if (value === 'default') {
      const { sortBy, ...rest } = filters;
      onFiltersChange(rest);
      return;
    }
    onFiltersChange({
      ...filters,
      sortBy: value as ExpertFiltersType['sortBy'],
    });
  };

  const setCategory = (value: string) => {
    if (value === 'all') {
      const { specializations, ...rest } = filters;
      onFiltersChange(rest);
      return;
    }
    onFiltersChange({ ...filters, specializations: [value] });
  };

  const clearAll = () => onFiltersChange({});

  const categoryValue = selectedSpecs.length === 1 ? selectedSpecs[0] : 'all';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-9 rounded-full px-3.5 font-body text-xs border-gray-200 shrink-0',
          open && 'border-primary-blue text-primary-blue bg-info-bg/40'
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
        Filter
        {activeCount > 0 && (
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-blue px-1 text-[10px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <Select value={categoryValue} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-auto min-w-[9rem] rounded-full border-gray-200 bg-white px-3 text-xs font-body shadow-none">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body text-sm">
                Kategorie: Alle
              </SelectItem>
              {availableSpecializations.map((spec) => (
                <SelectItem key={spec} value={spec} className="font-body text-sm">
                  {spec}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.minRating?.toString() || 'all'}
            onValueChange={setRating}
          >
            <SelectTrigger className="h-9 w-auto min-w-[8rem] rounded-full border-gray-200 bg-white px-3 text-xs font-body shadow-none">
              <SelectValue placeholder="Bewertung" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body text-sm">
                Bewertung: Alle
              </SelectItem>
              <SelectItem value="4.5" className="font-body text-sm">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.5+
                </span>
              </SelectItem>
              <SelectItem value="4.0" className="font-body text-sm">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.0+
                </span>
              </SelectItem>
              <SelectItem value="3.5" className="font-body text-sm">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 3.5+
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.format || 'all'} onValueChange={setFormat}>
            <SelectTrigger className="h-9 w-auto min-w-[7.5rem] rounded-full border-gray-200 bg-white px-3 text-xs font-body shadow-none">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body text-sm">
                Typ: Alle
              </SelectItem>
              <SelectItem value="in_person" className="font-body text-sm">
                Vor Ort
              </SelectItem>
              <SelectItem value="online" className="font-body text-sm">
                Online
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.sortBy || 'default'} onValueChange={setSortBy}>
            <SelectTrigger className="h-9 w-auto min-w-[10rem] rounded-full border-gray-200 bg-white px-3 text-xs font-body shadow-none">
              <SelectValue placeholder="Sortieren nach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="font-body text-sm">
                Sortieren nach
              </SelectItem>
              <SelectItem value="earliest_availability" className="font-body text-sm">
                Früheste Verfügbarkeit
              </SelectItem>
              <SelectItem value="best_rating" className="font-body text-sm">
                Beste Bewertungen
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {activeCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-9 rounded-full px-2.5 text-xs font-body text-gray-500 hover:text-text-dark shrink-0"
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Zurücksetzen
        </Button>
      )}
    </div>
  );
}
