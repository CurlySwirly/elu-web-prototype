'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchExpertById, fetchExpertOffers, type ExpertOffer } from '@/lib/api';
import { reviewService, type Review } from '@/lib/services/review';
import { Card, CardContent } from '@/components/ui/card';
import { ExpertSedcard, type ExpertSedcardData } from '@/components/ExpertSedcard';

export default function ExpertProfilePage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<ExpertSedcardData | null>(null);
  const [offers, setOffers] = useState<ExpertOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpert = useCallback(async () => {
    try {
      const [expertData, offersData, reviewsData] = await Promise.all([
        fetchExpertById(expertId),
        fetchExpertOffers(expertId),
        reviewService.getExpertReviews(expertId),
      ]);
      setExpert(expertData as ExpertSedcardData);
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

      <ExpertSedcard expert={expert} offers={offers} reviews={reviews} mode="public" />
    </div>
  );
}
