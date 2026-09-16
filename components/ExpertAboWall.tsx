'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SUBSCRIPTION_LIST_PRICES,
  activateExpertSubscription,
  formatPlanPrice,
  getDefaultCohort,
  getDiscountedFirstPrice,
  getFirstInvoiceDiscountPercent,
  getListPriceLabel,
  getPromoForCohort,
  getYearlyListSavings,
  type PricingCohort,
  type SubscriptionPlanId,
} from '@/lib/utils/subscription';
import { formatEuro } from '@/lib/utils/pricing';

const BENEFITS = [
  'Unbegrenzte Angebote & Buchungen',
  'Kalender, Nachrichten & Profil-Tools inklusive',
  'Jederzeit kündbar zum Periodenende',
];

type ExpertAboWallProps = {
  userId?: string | null;
  /** Called after successful mock activation */
  onActivated?: () => void;
  /** Optional skip (onboarding soft exit) */
  onSkip?: () => void;
  skipLabel?: string;
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
};

export function ExpertAboWall({
  userId,
  onActivated,
  onSkip,
  skipLabel = 'Später entscheiden',
  title = 'elu Abo',
  description = 'Aktiviere dein Abo, um Angebote anzulegen und buchbar zu werden.',
  className,
  compact = false,
}: ExpertAboWallProps) {
  const cohort = useMemo<PricingCohort>(() => getDefaultCohort(), []);
  const promo = getPromoForCohort(cohort);
  const [planId, setPlanId] = useState<SubscriptionPlanId>('monthly');
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 450));
      activateExpertSubscription(planId, userId, cohort);
      onActivated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <h3 className="font-heading text-lg sm:text-xl font-bold text-text-dark">{title}</h3>
        <p className="text-sm text-gray-600 font-body leading-relaxed">{description}</p>
      </div>

      <p className="text-xs font-body text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
        Listenpreis: {formatEuro(SUBSCRIPTION_LIST_PRICES.monthly)}/Monat bzw.{' '}
        {formatEuro(SUBSCRIPTION_LIST_PRICES.yearly)}/Jahr.
        {promo ? (
          <>
            {' '}
            <span className="text-primary-blue font-semibold">Aktion: {promo.label}</span>
            {' — '}
            {promo.description}.
          </>
        ) : (
          <> Aktuell ohne Rabattaktion.</>
        )}
      </p>

      <div className={cn('grid gap-2.5', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        {(['monthly', 'yearly'] as SubscriptionPlanId[]).map((id) => {
          const selected = planId === id;
          const isYearly = id === 'yearly';
          const first = getDiscountedFirstPrice(id, cohort);
          const list = SUBSCRIPTION_LIST_PRICES[id];
          const discountPct = getFirstInvoiceDiscountPercent(id, cohort);
          const hasDiscount = first < list;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlanId(id)}
              className={cn(
                'text-left rounded-xl border p-3.5 transition-colors',
                selected
                  ? 'border-primary-blue bg-primary-blue/5 ring-1 ring-primary-blue/30'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-heading font-semibold text-sm text-text-dark">
                    {isYearly ? 'Jahresabo' : 'Monatsabo'}
                  </p>
                  <p className="font-heading font-bold text-base text-text-dark mt-1 tabular-nums">
                    {formatPlanPrice(id, cohort)}
                  </p>
                  {hasDiscount ? (
                    <p className="text-[11px] text-gray-500 font-body mt-0.5">
                      <span className="line-through">
                        {getListPriceLabel(id)}
                        {isYearly ? '/Jahr' : '/Monat'}
                      </span>
                      {discountPct > 0 ? (
                        <span className="text-primary-green ml-1.5">{discountPct} % Rabatt</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 font-body mt-0.5">
                      Listenpreis
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    'mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                    selected ? 'border-primary-blue bg-primary-blue' : 'border-gray-300'
                  )}
                >
                  {selected && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
              </div>
              {isYearly && (
                <p className="text-[11px] text-primary-green font-body mt-2">
                  {formatEuro(getYearlyListSavings())} gespart ggü. 12× Monat (Listenpreis)
                </p>
              )}
            </button>
          );
        })}
      </div>

      <ul className="space-y-1.5">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm font-body text-gray-700">
            <Check className="w-4 h-4 text-primary-green shrink-0 mt-0.5" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          type="button"
          onClick={handleActivate}
          disabled={loading}
          className="h-9 font-body text-sm bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Aktiviere…
            </>
          ) : (
            'Abo aktivieren'
          )}
        </Button>
        {onSkip && (
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={loading}
            className="h-9 font-body text-sm"
          >
            {skipLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
