'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchExpertById, fetchExpertOffers, ExpertOffer } from '@/lib/api';
import { reviewService, type Review } from '@/lib/services/review';
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

export default function ExpertProfilePage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<any>(null);
  const [offers, setOffers] = useState<ExpertOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  const loadExpert = useCallback(async () => {
    try {
      const [expertData, offersData, reviewsData] = await Promise.all([
        fetchExpertById(expertId),
        fetchExpertOffers(expertId),
        reviewService.getExpertReviews(expertId),
      ]);
      setExpert(expertData);
      setOffers(offersData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Failed to load expert:', error);
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  useEffect(() => {
    loadExpert();
  }, [loadExpert]);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
            <p className="text-gray-600 font-body">Lädt Profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!expert) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 font-body">Expert:in nicht gefunden.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <Link
        href="/app/experten"
        className="text-sm text-primary-blue hover:underline font-body inline-block"
      >
        ← Zurück zur Übersicht
      </Link>

      <div className="rounded-2xl border-2 bg-white p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
          <Avatar className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
            <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
            <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-2xl">
              {expert.full_name.split(' ').map((n: string) => n[0]).join('')}
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
              {expert.rating && expert.total_reviews && (
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
              {expert.location && (
                <div>
                  <p className="text-xs text-gray-500 font-body mb-0.5">Standort</p>
                  <p className="font-heading font-semibold text-text-dark text-sm sm:text-base">
                    {expert.location}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {expert.specializations.map((spec: string, index: number) => (
                <Badge key={index} className="bg-info-bg text-info-text border-none font-body">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:space-y-4">
        {(expert.bio || expert.certifications?.length > 0) && (
          <Card className="border-2">
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                {expert.bio && (
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-text-dark mb-2">
                      Über mich
                    </h3>
                    <p className="text-sm text-gray-600 font-body leading-relaxed">
                      {expert.bio}
                    </p>
                  </div>
                )}

                {expert.certifications?.length > 0 && (
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-text-dark mb-2">
                      Zertifikate & Qualifikationen
                    </h3>
                    <ul className="space-y-2">
                      {expert.certifications.map((cert: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600 font-body flex items-start gap-2">
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
          <div className="space-y-2.5">
            {offers.map((offer) => (
              <Card key={offer.id} className="border-2 hover:border-primary-blue transition-colors">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-heading text-lg text-text-dark mb-1">
                        {offer.title}
                      </CardTitle>
                      <CardDescription className="font-body">
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
                      {offer.format === 'online' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      {offer.format === 'online' ? 'Online' : 'Vor Ort'}
                    </Badge>
                    <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {offer.duration_minutes} Min.
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-4">
                  <Link href={`/app/buchen/${expertId}?offerId=${offer.id}`}>
                    <Button className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity font-body">
                      Termin buchen
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
                              {format(parseISO(review.created_at), 'dd. MMM yyyy', { locale: de })}
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
    </div>
  );
}
