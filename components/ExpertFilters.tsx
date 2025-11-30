'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { ExpertFilters } from '@/lib/types';

interface ExpertFiltersProps {
  filters: ExpertFilters;
  onFiltersChange: (filters: ExpertFilters) => void;
  availableSpecializations: string[];
}

export function ExpertFilters({
  filters,
  onFiltersChange,
  availableSpecializations,
}: ExpertFiltersProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.minPrice || 0,
    filters.maxPrice || 200,
  ]);

  const handleLocationChange = (value: string) => {
    onFiltersChange({ ...filters, location: value || undefined });
  };

  const handleExperienceChange = (value: string) => {
    if (value === 'all') {
      const { minExperience, maxExperience, ...rest } = filters;
      onFiltersChange(rest);
    } else if (value === '0-2') {
      onFiltersChange({ ...filters, minExperience: 0, maxExperience: 2 });
    } else if (value === '3-5') {
      onFiltersChange({ ...filters, minExperience: 3, maxExperience: 5 });
    } else if (value === '6-10') {
      onFiltersChange({ ...filters, minExperience: 6, maxExperience: 10 });
    } else if (value === '10+') {
      onFiltersChange({ ...filters, minExperience: 10, maxExperience: undefined });
    }
  };

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
  };

  const handlePriceRangeCommit = () => {
    onFiltersChange({
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    });
  };

  const handleRatingChange = (value: string) => {
    if (value === 'all') {
      const { minRating, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, minRating: parseFloat(value) });
    }
  };

  const handleAvailabilityChange = (value: string) => {
    if (value === 'all') {
      const { availability, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({
        ...filters,
        availability: value as 'available' | 'busy' | 'unavailable',
      });
    }
  };

  const handleSpecializationToggle = (spec: string) => {
    const current = filters.specializations || [];
    const updated = current.includes(spec)
      ? current.filter((s) => s !== spec)
      : [...current, spec];
    onFiltersChange({
      ...filters,
      specializations: updated.length > 0 ? updated : undefined,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setPriceRange([0, 200]);
  };

  const hasActiveFilters =
    filters.location ||
    filters.minExperience !== undefined ||
    filters.minPrice !== undefined ||
    filters.minRating !== undefined ||
    filters.availability ||
    (filters.specializations && filters.specializations.length > 0);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-xl">Filter</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-sm font-body"
            >
              Alle zurücksetzen
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="location" className="font-body font-medium">
            Standort
          </Label>
          <Input
            id="location"
            placeholder="z.B. Berlin, München..."
            value={filters.location || ''}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="font-body"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="experience" className="font-body font-medium">
            Erfahrung (Jahre)
          </Label>
          <Select
            value={
              filters.minExperience === undefined
                ? 'all'
                : filters.minExperience === 0 && filters.maxExperience === 2
                ? '0-2'
                : filters.minExperience === 3 && filters.maxExperience === 5
                ? '3-5'
                : filters.minExperience === 6 && filters.maxExperience === 10
                ? '6-10'
                : filters.minExperience === 10
                ? '10+'
                : 'all'
            }
            onValueChange={handleExperienceChange}
          >
            <SelectTrigger className="font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">Alle</SelectItem>
              <SelectItem value="0-2" className="font-body">0-2 Jahre</SelectItem>
              <SelectItem value="3-5" className="font-body">3-5 Jahre</SelectItem>
              <SelectItem value="6-10" className="font-body">6-10 Jahre</SelectItem>
              <SelectItem value="10+" className="font-body">10+ Jahre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="font-body font-medium">
            Preis pro Stunde: €{priceRange[0]} - €{priceRange[1]}
          </Label>
          <Slider
            min={0}
            max={200}
            step={5}
            value={priceRange}
            onValueChange={handlePriceRangeChange}
            onValueCommit={handlePriceRangeCommit}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rating" className="font-body font-medium">
            Mindestbewertung
          </Label>
          <Select
            value={filters.minRating?.toString() || 'all'}
            onValueChange={handleRatingChange}
          >
            <SelectTrigger className="font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">Alle</SelectItem>
              <SelectItem value="4.5" className="font-body">4.5+ Sterne</SelectItem>
              <SelectItem value="4.0" className="font-body">4.0+ Sterne</SelectItem>
              <SelectItem value="3.5" className="font-body">3.5+ Sterne</SelectItem>
              <SelectItem value="3.0" className="font-body">3.0+ Sterne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="availability" className="font-body font-medium">
            Verfügbarkeit
          </Label>
          <Select
            value={filters.availability || 'all'}
            onValueChange={handleAvailabilityChange}
          >
            <SelectTrigger className="font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">Alle</SelectItem>
              <SelectItem value="available" className="font-body">Verfügbar</SelectItem>
              <SelectItem value="busy" className="font-body">Beschäftigt</SelectItem>
              <SelectItem value="unavailable" className="font-body">Nicht verfügbar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="font-body font-medium">Spezialisierungen</Label>
          <div className="flex flex-wrap gap-2">
            {availableSpecializations.map((spec) => {
              const isSelected = filters.specializations?.includes(spec);
              return (
                <Badge
                  key={spec}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer font-body ${
                    isSelected
                      ? 'bg-primary-blue text-white hover:bg-primary-blue/90'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleSpecializationToggle(spec)}
                >
                  {spec}
                  {isSelected && <X className="ml-1 w-3 h-3" />}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
