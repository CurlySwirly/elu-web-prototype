'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import type { Expert } from '@/lib/api';

interface ExpertShowcaseProps {
  experts: Expert[];
}

export function ExpertShowcase({ experts }: ExpertShowcaseProps) {
  if (experts.length === 0) {
    return (
      <section className="py-12 sm:py-14 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark mb-2">
              Unsere Top-Expert:innen
            </h2>
            <p className="text-sm sm:text-base text-gray-600 font-body max-w-2xl mx-auto mb-5">
              Bald findest du hier unsere verifizierten Expert:innen.
            </p>
            <Link href="/app/experten">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity text-sm sm:text-base"
              >
                Expert:innen entdecken
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-14 lg:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 lg:px-6">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-text-dark mb-2">
            Unsere Top-Expert:innen
          </h2>
          <p className="text-sm sm:text-base text-gray-600 font-body max-w-2xl mx-auto">
            Entdecke qualifizierte Fachpersonen, die bereits hunderte Kund:innen auf ihrem
            Gesundheitsweg begleiten.
          </p>
        </div>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-5xl mx-auto mb-8"
        >
          <CarouselContent className="-ml-2 md:-ml-3">
            {experts.map((expert) => (
              <CarouselItem key={expert.id} className="pl-2 md:pl-3 md:basis-1/2 lg:basis-1/3">
                <Card className="border-2 hover:border-primary-blue transition-all group h-full">
                  <CardHeader className="text-center p-4 sm:p-5">
                    <div className="flex justify-center mb-3">
                      <div className="relative">
                        <Avatar className="w-20 h-20 border-2 border-white shadow-md">
                          <AvatarImage
                            src={
                              expert.avatar_url ||
                              'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'
                            }
                            alt={expert.full_name}
                          />
                          <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary-blue to-primary-green text-white">
                            {expert.full_name.split(' ')[0][0]}
                          </AvatarFallback>
                        </Avatar>
                        {expert.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-primary-blue rounded-full p-1 shadow-md">
                            <BadgeCheck className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    <CardTitle className="font-heading text-lg text-text-dark mb-1">
                      {expert.full_name.split(' ')[0]}
                    </CardTitle>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mb-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{expert.city || 'Deutschland'}</span>
                    </div>

                    <div className="flex items-center justify-center gap-1 mb-3">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm text-gray-900">
                        {expert.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">({expert.total_reviews})</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                      {expert.specializations.slice(0, 2).map((spec, index) => (
                        <Badge
                          key={index}
                          className="bg-info-bg text-info-text hover:bg-info-bg/80 text-[11px] px-2 py-0.5"
                        >
                          {spec}
                        </Badge>
                      ))}
                      {expert.specializations.length > 2 && (
                        <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                          +{expert.specializations.length - 2}
                        </Badge>
                      )}
                    </div>

                    <div className="text-center mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                      <p className="text-xs text-gray-500 font-body mb-0.5">ab</p>
                      <p className="text-xl font-bold text-primary-blue">{expert.hourly_rate}€</p>
                      <p className="text-xs text-gray-500 font-body">pro Stunde</p>
                    </div>

                    <Link href={`/app/experten/${expert.id}`}>
                      <Button className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity text-sm">
                        Profil ansehen
                      </Button>
                    </Link>
                  </CardHeader>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-10" />
          <CarouselNext className="hidden md:flex -right-10" />
        </Carousel>

        <div className="text-center">
          <Link href="/app/experten">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white transition-colors text-sm sm:text-base"
            >
              Alle Expert:innen entdecken
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
