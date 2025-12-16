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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { X, ChevronDown, Clock, Calendar as CalendarIcon } from 'lucide-react';
import type { ExpertFilters } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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

  const [isAvailabilityPopoverOpen, setIsAvailabilityPopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const timePeriods = [
    { id: 'morning', label: 'Vormittag (08:00-12:00)' },
    { id: 'afternoon', label: 'Nachmittag (12:00-17:00)' },
    { id: 'evening', label: 'Abend (17:00-21:00)' },
  ];

  const dayOptions = [
    { id: 'weekdays', label: 'Wochentage (Mo-Fr)' },
    { id: 'weekends', label: 'Wochenende (Sa-So)' },
    { id: 'monday', label: 'Montag' },
    { id: 'tuesday', label: 'Dienstag' },
    { id: 'wednesday', label: 'Mittwoch' },
    { id: 'thursday', label: 'Donnerstag' },
    { id: 'friday', label: 'Freitag' },
    { id: 'saturday', label: 'Samstag' },
    { id: 'sunday', label: 'Sonntag' },
  ];

  const handleAvailabilityDayToggle = (dayId: string) => {
    const current = filters.availabilityDays || [];
    const updated = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId];
    onFiltersChange({
      ...filters,
      availabilityDays: updated.length > 0 ? updated : undefined,
    });
  };

  const handleAvailabilityTimePeriodToggle = (periodId: string) => {
    const current = filters.availabilityTimePeriods || [];
    const updated = current.includes(periodId)
      ? current.filter((p) => p !== periodId)
      : [...current, periodId];
    onFiltersChange({
      ...filters,
      availabilityTimePeriods: updated.length > 0 ? updated : undefined,
    });
  };

  const handleSpecificTimeChange = (time: string) => {
    onFiltersChange({
      ...filters,
      availabilitySpecificTime: time || undefined,
    });
    setSelectedTime(time);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Add the specific date to availabilityDays
      const dateStr = format(date, 'yyyy-MM-dd');
      const current = filters.availabilityDays || [];
      if (!current.includes(dateStr)) {
        onFiltersChange({
          ...filters,
          availabilityDays: [...current, dateStr],
        });
      }
    } else {
      // Remove date if deselected
      const current = filters.availabilityDays || [];
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
      if (dateStr && current.includes(dateStr)) {
        onFiltersChange({
          ...filters,
          availabilityDays: current.filter((d) => d !== dateStr),
        });
      }
    }
  };

  const clearAvailabilityFilters = () => {
    const { availabilityDays, availabilityTimePeriods, availabilitySpecificTime, ...rest } = filters;
    onFiltersChange(rest);
    setSelectedDate(undefined);
    setSelectedTime('');
  };

  const hasAvailabilityFilters =
    (filters.availabilityDays && filters.availabilityDays.length > 0) ||
    (filters.availabilityTimePeriods && filters.availabilityTimePeriods.length > 0) ||
    filters.availabilitySpecificTime;

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
    hasAvailabilityFilters ||
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="availability" className="font-body font-medium">
              Verfügbarkeit
            </Label>
            {hasAvailabilityFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAvailabilityFilters}
                className="text-xs font-body h-auto p-1"
              >
                <X className="w-3 h-3 mr-1" />
                Zurücksetzen
              </Button>
            )}
          </div>
          
          <Popover open={isAvailabilityPopoverOpen} onOpenChange={setIsAvailabilityPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-body"
              >
                <span className="text-left">
                  {hasAvailabilityFilters
                    ? `${filters.availabilityDays?.length || 0} Tag(e), ${filters.availabilityTimePeriods?.length || 0} Zeitraum(e)${filters.availabilitySpecificTime ? `, ${filters.availabilitySpecificTime}` : ''}`
                    : 'Verfügbarkeit filtern'}
                </span>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                {/* Specific Date Selection */}
                <div className="space-y-2">
                  <Label className="font-body font-medium text-sm flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Spezifisches Datum
                  </Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={de}
                    className="rounded-md border"
                  />
                </div>

                {/* Day Selection */}
                <div className="space-y-2">
                  <Label className="font-body font-medium text-sm">Wochentage</Label>
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map((day) => {
                      const isSelected = filters.availabilityDays?.includes(day.id);
                      return (
                        <Badge
                          key={day.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className={`cursor-pointer font-body text-xs ${
                            isSelected
                              ? 'bg-primary-blue text-white hover:bg-primary-blue/90'
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handleAvailabilityDayToggle(day.id)}
                        >
                          {day.label}
                          {isSelected && <X className="ml-1 w-3 h-3" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Time Period Selection */}
                <div className="space-y-2">
                  <Label className="font-body font-medium text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Zeiträume
                  </Label>
                  <div className="space-y-2">
                    {timePeriods.map((period) => {
                      const isSelected = filters.availabilityTimePeriods?.includes(period.id);
                      return (
                        <div
                          key={period.id}
                          className={`flex items-center gap-2 p-2 rounded border-2 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary-blue bg-info-bg'
                              : 'border-gray-200 hover:border-primary-blue/50'
                          }`}
                          onClick={() => handleAvailabilityTimePeriodToggle(period.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-primary-blue"
                          />
                          <span className="font-body text-sm">{period.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Specific Time Selection */}
                <div className="space-y-2">
                  <Label htmlFor="specific-time" className="font-body font-medium text-sm">
                    Spezifische Uhrzeit (optional)
                  </Label>
                  <Input
                    id="specific-time"
                    type="time"
                    value={filters.availabilitySpecificTime || ''}
                    onChange={(e) => handleSpecificTimeChange(e.target.value)}
                    className="font-body"
                  />
                </div>

                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAvailabilityPopoverOpen(false)}
                    className="w-full font-body"
                  >
                    Anwenden
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Show selected filters */}
          {hasAvailabilityFilters && (
            <div className="flex flex-wrap gap-2 pt-2">
              {filters.availabilityDays?.map((day) => {
                const dayOption = dayOptions.find((d) => d.id === day);
                if (!dayOption && !day.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
                return (
                  <Badge
                    key={day}
                    variant="outline"
                    className="font-body text-xs bg-info-bg border-info-text"
                  >
                    {dayOption?.label || format(new Date(day), 'd. MMM', { locale: de })}
                    <X
                      className="ml-1 w-3 h-3 cursor-pointer"
                      onClick={() => handleAvailabilityDayToggle(day)}
                    />
                  </Badge>
                );
              })}
              {filters.availabilityTimePeriods?.map((period) => {
                const periodOption = timePeriods.find((p) => p.id === period);
                return (
                  <Badge
                    key={period}
                    variant="outline"
                    className="font-body text-xs bg-info-bg border-info-text"
                  >
                    {periodOption?.label}
                    <X
                      className="ml-1 w-3 h-3 cursor-pointer"
                      onClick={() => handleAvailabilityTimePeriodToggle(period)}
                    />
                  </Badge>
                );
              })}
              {filters.availabilitySpecificTime && (
                <Badge
                  variant="outline"
                  className="font-body text-xs bg-info-bg border-info-text"
                >
                  {filters.availabilitySpecificTime} Uhr
                  <X
                    className="ml-1 w-3 h-3 cursor-pointer"
                    onClick={() => handleSpecificTimeChange('')}
                  />
                </Badge>
              )}
            </div>
          )}
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
