'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchExpertById, fetchExpertOffers, type ExpertOffer } from '@/lib/api';
import { reviewService, type Review } from '@/lib/services/review';
import { Card, CardContent } from '@/components/ui/card';
import { ExpertSedcard, type ExpertSedcardData } from '@/components/ExpertSedcard';

function resolveParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function ExpertProfilePage() {
  const params = useParams();
  const expertId = resolveParam(params.expertId);
  const [expert, setExpert] = useState<ExpertSedcardData | null>(null);
  const [offers, setOffers] = useState<ExpertOffer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExpert = useCallback(async () => {
    if (!expertId) {
      setExpert(null);
      setOffers([]);
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const expertData = await fetchExpertById(expertId);
      setExpert(expertData as ExpertSedcardData | null);

      const [offersResult, reviewsResult] = await Promise.allSettled([
        fetchExpertOffers(expertData?.id || expertId),
        reviewService.getExpertReviews(expertData?.id || expertId),
      ]);

      setOffers(offersResult.status === 'fulfilled' ? offersResult.value : []);
      setReviews(reviewsResult.status === 'fulfilled' ? reviewsResult.value : []);
    } catch (error) {
      console.error('Failed to load expert:', error);
      setExpert(null);
      setOffers([]);
      setReviews([]);
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
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-gray-600 font-body">Expert:in nicht gefunden.</p>
            <Link
              href="/app/experten"
              className="text-sm text-primary-blue hover:underline font-body inline-block"
            >
              ← Zurück zur Übersicht
            </Link>
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
