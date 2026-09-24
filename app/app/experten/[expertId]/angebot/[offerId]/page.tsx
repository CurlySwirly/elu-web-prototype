'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchExpertById, fetchExpertOffers, type ExpertOffer } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, MapPin, Video } from 'lucide-react';
import { formatOfferLocation, isOnlineOfferFormat } from '@/lib/utils/offer-location';
import { formatEuro, getClientPriceBreakdown } from '@/lib/utils/pricing';

function resolveParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

export default function ExpertOfferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = resolveParam(params.expertId);
  const offerId = resolveParam(params.offerId);
  const [offer, setOffer] = useState<ExpertOffer | null>(null);
  const [expertName, setExpertName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!expertId || !offerId) {
      setOffer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [expertData, offers] = await Promise.all([
        fetchExpertById(expertId),
        fetchExpertOffers(expertId),
      ]);
      const found = (offers || []).find((o) => o.id === offerId) || null;
      setOffer(found);
      setExpertName(expertData?.full_name?.trim() || 'Expert:in');
    } catch (error) {
      console.error('Failed to load offer:', error);
      setOffer(null);
    } finally {
      setLoading(false);
    }
  }, [expertId, offerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-blue mb-3" />
          <p className="text-sm text-gray-600 font-body">Lädt Angebot…</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-3 sm:p-4 lg:p-5 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/app/experten/${expertId}`)}
            className="font-body -ml-2 h-9 px-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Zurück
          </Button>
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 font-body text-sm">Angebot nicht gefunden.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isOnline = isOnlineOfferFormat(offer.format);
  const locationLabel = formatOfferLocation(offer);
  const clientPrice = formatEuro(getClientPriceBreakdown(Number(offer.price) || 0).clientTotal);

  return (
    <div className="p-3 sm:p-4 lg:p-5 space-y-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push(`/app/experten/${expertId}`)}
          className="font-body -ml-2 h-9 px-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Zurück
        </Button>

        <Card className="border-2">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
            <CardTitle className="font-heading text-lg sm:text-xl text-text-dark">
              {offer.title}
            </CardTitle>
            <CardDescription className="font-body text-sm">
              mit {expertName} · {clientPrice}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-info-bg text-info-text border-none font-body">
                {offer.category}
              </Badge>
              <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                {isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {isOnline ? 'Online' : 'Vor Ort'}
              </Badge>
              <Badge className="bg-info-bg text-info-text border-none font-body flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {offer.duration_minutes} Min.
              </Badge>
            </div>

            {locationLabel && !isOnline ? (
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-body text-gray-500 shrink-0">Ort</span>
                <span className="font-body font-semibold text-text-dark text-right">
                  {locationLabel}
                </span>
              </div>
            ) : null}

            <div className="space-y-2">
              <h2 className="font-heading text-sm font-semibold text-text-dark">Beschreibung</h2>
              <p className="text-sm text-gray-600 font-body leading-relaxed whitespace-pre-wrap">
                {offer.description || 'Keine Beschreibung hinterlegt.'}
              </p>
            </div>

            <Button
              asChild
              className="w-full bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90 hover:from-primary-blue hover:to-primary-green transition-opacity font-body"
            >
              <Link href={`/app/buchen/${expertId}?offerId=${offer.id}`}>Termin buchen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
