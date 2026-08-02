'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Expert, ExpertOffer } from '@/lib/types';
import type { Review } from '@/lib/services/review';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CheckCircle2, Clock, MapPin, Video, Star, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export type ExpertSedcardData = Pick<
  Expert,
  | 'id'
  | 'full_name'
  | 'avatar_url'
  | 'bio'
  | 'specializations'
  | 'hourly_rate'
  | 'rating'
  | 'total_reviews'
  | 'is_verified'
> & {
  professions?: string[];
  verified_professions?: string[];
  certifications?: string[];
  location?: string;
  city?: string;
};

interface ExpertSedcardProps {
  expert: ExpertSedcardData;
  offers: ExpertOffer[];
  reviews?: Review[];
  /** `public` = client booking view; `preview` = expert Sedcard tab (no booking) */
  mode?: 'public' | 'preview';
  className?: string;
}

/**
 * Public expert profile (“Sedcard”) – identical for clients and for the expert’s preview tab.
 */
export function ExpertSedcard({
  expert,
  offers,
  reviews = [],
  mode = 'public',
  className,
}: ExpertSedcardProps) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const isPreview = mode === 'preview';
  const location = expert.location || expert.city;

  const initials = expert.full_name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-2xl border-2 bg-white p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
          <Avatar className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
            <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
            <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-text-dark">
                {expert.full_name}
              </h1>
              {expert.is_verified && (
                <CheckCircle2 className="w-5 h-5 text-primary-blue shrink-0" />
              )}
            </div>

            <div className="flex flex-wrap gap-4 sm:gap-6 justify-center md:justify-start mb-3">
              <div>
                <p className="text-xs text-gray-500 font-body mb-0.5">Stundensatz</p>
                <p className="font-heading font-semibold text-text-dark text-sm sm:text-base">
                  Ab €{expert.hourly_rate}
                </p>
              </div>
              {expert.rating != null && expert.total_reviews != null && expert.total_reviews > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">Bewertung</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-heading font-semibold text-text-dark text-sm sm:text-base">
                      {expert.rating.toFixed(1)} ({expert.total_reviews})
                    </span>
                  </div>
                </div>
              )}
              {location && (
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">Standort</p>
                  <p className="font-heading font-semibold text-text-dark text-sm sm:text-base">
                    {location}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {(expert.specializations || []).map((spec, index) => (
                <Badge
                  key={`spec-${index}`}
                  className="bg-info-bg text-info-text border-none font-body"
                >
                  {spec}
                </Badge>
              ))}
              {(expert.professions || [])
                .filter(
                  (profession) =>
                    !(expert.specializations || []).some(
                      (s) => s.toLowerCase() === profession.toLowerCase()
                    )
                )
                .map((profession) => {
                  const verified =
                    expert.verified_professions?.includes(profession) ||
                    (expert.is_verified && !expert.verified_professions?.length);
                  return (
                    <Badge
                      key={`prof-${profession}`}
                      className="bg-primary-blue/10 text-text-dark border-none font-body gap-1"
                    >
                      {verified && <CheckCircle2 className="w-3 h-3 text-primary-blue" />}
                      {profession}
                    </Badge>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:space-y-4">
        {(expert.bio || (expert.certifications && expert.certifications.length > 0)) && (
          <Card className="border-2">
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                {expert.bio && (
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-text-dark mb-2">
                      Über mich
                    </h3>
                    <p className="text-sm text-gray-600 font-body leading-relaxed whitespace-pre-wrap">
                      {expert.bio}
                    </p>
                  </div>
                )}

                {expert.certifications && expert.certifications.length > 0 && (
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-text-dark mb-2">
                      Zertifikate & Qualifikationen
                    </h3>
                    <ul className="space-y-2">
                      {expert.certifications.map((cert, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 font-body flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary-blue mt-0.5 flex-shrink-0" />
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {offers.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 font-body text-sm">Noch keine Angebote verfügbar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {offers.map((offer) => (
              <Card
                key={offer.id}
                className="border-2 hover:border-primary-blue transition-colors h-full flex flex-col"
              >
                <CardHeader className="pb-3 pt-4 px-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-heading text-lg text-text-dark mb-1">
                        {offer.title}
                      </CardTitle>
                      <CardDescription className="font-body line-clamp-3">
                        {offer.description}
                      </CardDescription>
                    </div>
                    <p className="text-lg font-heading font-bold text-text-dark shrink-0">
                      €{offer.price}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="bg-info-bg text-info-text border-none font-body">
                      {offer.category}
                    </Badge>
                    <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                      {offer.format === 'online' ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {offer.format === 'online' ? 'Online' : 'Vor Ort'}
                    </Badge>
                    <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {offer.duration_minutes} Min.
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4 mt-auto">
                  {isPreview ? (
                    <Button
                      type="button"
                      disabled
                      className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white opacity-80 font-body"
                    >
                      Termin buchen
                    </Button>
                  ) : (
                    <Link href={`/app/buchen/${expert.id}?offerId=${offer.id}`}>
                      <Button className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body">
                        Termin buchen
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {mode === 'public' && (
      <Collapsible open={reviewsOpen} onOpenChange={setReviewsOpen}>
        <Card className="border-2 overflow-hidden">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-gray-50/80 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-heading text-lg sm:text-xl font-semibold text-text-dark">
                  Bewertungen
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-500 shrink-0 transition-transform duration-200',
                  reviewsOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-gray-100">
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-500 font-body py-6 text-center">
                  Diese Expert:in hat noch keine Bewertungen.
                </p>
              ) : (
                <div className="space-y-3 pt-4">
                  {reviews.map((review) => (
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}
    </div>
  );
}
