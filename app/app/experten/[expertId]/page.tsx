'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchExpertById, fetchExpertOffers, ExpertOffer } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle2, Clock, MapPin, Video, Star } from 'lucide-react';

export default function ExpertProfilePage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<any>(null);
  const [offers, setOffers] = useState<ExpertOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpert = useCallback(async () => {
    try {
      const [expertData, offersData] = await Promise.all([
        fetchExpertById(expertId),
        fetchExpertOffers(expertId),
      ]);
      setExpert(expertData);
      setOffers(offersData);
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
      <div className="p-8">
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
      <div className="p-8">
        <Card className="border-2">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 font-body">Expert:in nicht gefunden.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E2E8FB' }}>
      <div className="bg-white px-8 py-6 border-b">
        <Link href="/app/experten" className="text-primary-blue hover:underline font-body inline-block">
          ← Zurück zur Übersicht
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <Avatar className="w-32 h-32 flex-shrink-0">
              <AvatarImage src={expert.avatar_url} alt={expert.full_name} />
              <AvatarFallback className="bg-gradient-to-r from-primary-blue to-primary-green text-white font-heading text-3xl">
                {expert.full_name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <h1 className="font-heading text-3xl font-bold text-text-dark">
                  {expert.full_name}
                </h1>
                {expert.is_verified && (
                  <CheckCircle2 className="w-6 h-6 text-primary-blue" />
                )}
              </div>

              <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-4">
                <div>
                  <p className="text-sm text-gray-500 font-body mb-1">Erfahrung</p>
                  <p className="font-heading font-semibold text-text-dark">{expert.years_experience} Jahre</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-body mb-1">Stundensatz</p>
                  <p className="font-heading font-semibold text-text-dark">Ab €{expert.hourly_rate}/Std.</p>
                </div>
                {expert.rating && expert.total_reviews && (
                  <div>
                    <p className="text-sm text-gray-500 font-body mb-1">Bewertung</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-heading font-semibold text-text-dark">
                        {expert.rating.toFixed(1)} ({expert.total_reviews} Bewertungen)
                      </span>
                    </div>
                  </div>
                )}
                {expert.location && (
                  <div>
                    <p className="text-sm text-gray-500 font-body mb-1">Standort</p>
                    <p className="font-heading font-semibold text-text-dark">{expert.location}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
          {expert.certifications?.length > 0 && (
            <Card className="border-2 mb-6">
              <CardHeader>
                <CardTitle className="font-heading text-xl text-text-dark">Zertifikate & Qualifikationen</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {expert.certifications.map((cert: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 font-body flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary-blue mt-0.5 flex-shrink-0" />
                      {cert}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          </div>

          <div className="lg:col-span-2">
          {expert.bio && (
            <Card className="border-2 mb-6">
              <CardHeader>
                <CardTitle className="font-heading text-2xl text-text-dark">Über mich</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 font-body leading-relaxed">
                  {expert.bio}
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <h2 className="font-heading text-2xl font-bold text-text-dark mb-4">Angebote</h2>

            {offers.length === 0 ? (
              <Card className="border-2">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600 font-body">Noch keine Angebote verfügbar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <Card key={offer.id} className="border-2 hover:border-primary-blue transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="font-heading text-xl text-text-dark mb-2">
                            {offer.title}
                          </CardTitle>
                          <CardDescription className="font-body">
                            {offer.description}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-heading font-bold text-text-dark">€{offer.price}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
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

                    <CardContent>
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
          </div>
        </div>
      </div>
    </div>
  );
}
