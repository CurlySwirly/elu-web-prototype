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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
              Unsere Top-Expert:innen
            </h2>
            <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto mb-8">
              Bald findest du hier unsere verifizierten Expert:innen.
            </p>
            <Link href="/signup/client">
              <Button size="lg" className="bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity">
                Benachrichtigung erhalten
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-text-dark mb-4">
            Unsere Top-Expert:innen
          </h2>
          <p className="text-xl text-gray-600 font-body max-w-3xl mx-auto">
            Entdecke qualifizierte Fachpersonen, die bereits hunderte Kund:innen auf ihrem Gesundheitsweg begleiten.
          </p>
        </div>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto mb-12"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {experts.map((expert) => (
              <CarouselItem key={expert.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="border-2 hover:border-primary-blue transition-all hover:shadow-xl group h-full">
                  <CardHeader className="text-center p-6">
                    <div className="flex justify-center mb-4">
                      <div className="relative">
                        <Avatar className="w-28 h-28 border-4 border-white shadow-lg">
                          <AvatarImage src={expert.avatar_url || 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'} alt={expert.full_name} />
                          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary-blue to-primary-green text-white">
                            {expert.full_name.split(' ')[0][0]}
                          </AvatarFallback>
                        </Avatar>
                        {expert.is_verified && (
                          <div className="absolute -bottom-1 -right-1 bg-primary-blue rounded-full p-1.5 shadow-md">
                            <BadgeCheck className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    <CardTitle className="font-heading text-2xl text-text-dark mb-2">
                      {expert.full_name.split(' ')[0]}
                    </CardTitle>

                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{expert.city || 'Deutschland'}</span>
                    </div>

                    <div className="flex items-center justify-center gap-1 mb-4">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-lg text-gray-900">{expert.rating.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">({expert.total_reviews} Bewertungen)</span>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {expert.specializations.slice(0, 2).map((spec, index) => (
                        <Badge key={index} className="bg-info-bg text-info-text hover:bg-info-bg/80 text-xs px-3 py-1">
                          {spec}
                        </Badge>
                      ))}
                      {expert.specializations.length > 2 && (
                        <Badge variant="secondary" className="text-xs px-3 py-1">
                          +{expert.specializations.length - 2}
                        </Badge>
                      )}
                    </div>

                    <div className="text-center mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 font-body mb-1">ab</p>
                      <p className="text-3xl font-bold text-primary-blue">{expert.hourly_rate}€</p>
                      <p className="text-sm text-gray-600 font-body">pro Stunde</p>
                    </div>

                    <Link href={`/app/experten/${expert.id}`}>
                      <Button className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 transition-opacity shadow-lg">
                        Profil ansehen
                      </Button>
                    </Link>
                  </CardHeader>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-12" />
          <CarouselNext className="hidden md:flex -right-12" />
        </Carousel>

        <div className="text-center">
          <Link href="/app/experten">
            <Button size="lg" variant="outline" className="border-2 border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white transition-colors">
              Alle Expert:innen entdecken
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
