'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  YEARLY_FREE_MONTH_PROMO_CODE,
  activateExpertSubscription,
  getDefaultCohort,
  getPlanPriceDisplay,
  getPromoForCohort,
  getYearlyListSavings,
  type PricingCohort,
  type SubscriptionPlanId,
} from '@/lib/utils/subscription';
import { formatEuro, formatPlatformFeePercent, LAUNCH_FEE_FREE_BOOKINGS, PLATFORM_FEE_RATE } from '@/lib/utils/pricing';

const PLAN_BENEFITS: Record<SubscriptionPlanId, string[]> = {
  monthly: [
    '0 % Platformabgabe statt 10 %',
    'Jederzeit kündbar zum Periodenende',
  ],
  yearly: [
    '0 % Platformabgabe statt 10 %',
    'Jederzeit kündbar zum Periodenende',
    '1 Monat gratis mit Code bei Abschluss',
  ],
};

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
  /** Hide heading block (when parent card already titles the section) */
  hideHeading?: boolean;
};

export function ExpertAboWall({
  userId,
  onActivated,
  onSkip,
  skipLabel = 'Später entscheiden',
  title = 'elu Abo',
  description,
  className,
  compact = false,
  hideHeading = false,
}: ExpertAboWallProps) {
  const cohort = useMemo<PricingCohort>(() => getDefaultCohort(), []);
  const [planId, setPlanId] = useState<SubscriptionPlanId>('monthly');
  const [loading, setLoading] = useState(false);
  const resolvedDescription =
    description ??
    (hideHeading
      ? undefined
      : `Ohne Abo: ${formatPlatformFeePercent(PLATFORM_FEE_RATE)} Platformabgabe. Mit Abo: 0 %.`);

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
      {(!hideHeading || resolvedDescription) && (
        <div className="space-y-1.5">
          {!hideHeading && (
            <h3 className="font-heading text-lg sm:text-xl font-bold text-text-dark">{title}</h3>
          )}
          {resolvedDescription ? (
            <p className="text-sm text-gray-600 font-body leading-relaxed">{resolvedDescription}</p>
          ) : null}
        </div>
      )}

      {!compact && (
        <div className="rounded-xl border border-primary-blue/25 bg-primary-blue/5 px-3.5 py-3 space-y-1.5">
          <p className="text-sm font-body text-text-dark leading-relaxed">
            Erste {LAUNCH_FEE_FREE_BOOKINGS} Buchungen ohne Platformabgabe.
          </p>
          <p className="text-sm font-body text-text-dark leading-relaxed">
            Jahresabo: 1 Monat gratis mit Code{' '}
            <span className="font-heading font-bold tracking-wide text-text-dark">
              {YEARLY_FREE_MONTH_PROMO_CODE}
            </span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['monthly', 'yearly'] as SubscriptionPlanId[]).map((id) => {
          const selected = planId === id;
          const isYearly = id === 'yearly';
          const price = getPlanPriceDisplay(id, cohort);
          const promo = getPromoForCohort(cohort);

          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlanId(id)}
              className={cn(
                'text-left rounded-xl border p-4 transition-colors flex flex-col h-full',
                selected
                  ? 'border-primary-blue bg-primary-blue/5 ring-1 ring-primary-blue/30'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-sm text-text-dark">
                    {isYearly ? 'Jahresabo' : 'Monatsabo'}
                  </p>
                  <p className="font-heading font-bold text-xl text-text-dark mt-1.5 tabular-nums leading-tight">
                    {price.hasDiscount ? (
                      <span className="inline-flex flex-wrap items-baseline gap-x-2">
                        <span className="text-base font-normal text-gray-400 line-through">
                          {formatEuro(price.listAmount)}
                        </span>
                        <span className="text-primary-blue">
                          {formatEuro(price.actionAmount)}
                        </span>
                      </span>
                    ) : (
                      formatEuro(price.listAmount)
                    )}
                  </p>
                  {promo ? (
                    <p className="text-[11px] text-primary-green font-body mt-0.5">
                      {promo.label}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 font-body mt-0.5">Listenpreis</p>
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

              <ul className={cn('mt-3 space-y-1.5 border-t border-gray-100 pt-3', compact && 'mt-2.5 pt-2.5')}>
                {PLAN_BENEFITS[id].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-xs sm:text-sm font-body text-gray-700">
                    <Check className="w-3.5 h-3.5 text-primary-green shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

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
