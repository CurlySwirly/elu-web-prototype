'use client';

import Link from 'next/link';
import { Lightbulb, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ABO_PREMIUM_BENEFITS,
  calculatePlatformFeesOnSessions,
  formatEuro,
  formatPlatformFeePercent,
  getLaunchFeeFreeRemaining,
  LAUNCH_FEE_FREE_BOOKINGS,
  PLATFORM_FEE_RATE,
} from '@/lib/utils/pricing';
import { SUBSCRIPTION_ACTION_PRICES } from '@/lib/utils/subscription';
import { cn } from '@/lib/utils';

type ExpertAboSavingsTipProps = {
  /** Completed session prices (chronological) for fee / savings math */
  sessionPrices: number[];
  hasActiveAbo?: boolean;
  className?: string;
  /** Compact single-row alert (dashboard) */
  compact?: boolean;
};

/**
 * Expert tip: launch free bookings + Abo savings upsell with premium benefits.
 */
export function ExpertAboSavingsTip({
  sessionPrices,
  hasActiveAbo = false,
  className,
  compact = false,
}: ExpertAboSavingsTipProps) {
  const fees = calculatePlatformFeesOnSessions(sessionPrices, { hasActiveAbo });
  const launchRemaining = getLaunchFeeFreeRemaining(fees.bookingCount, hasActiveAbo);

  if (hasActiveAbo) {
    return null;
  }

  // Launch phase: emphasize zero risk
  if (launchRemaining > 0) {
    return (
      <Alert className={cn('border-primary-blue/30 bg-primary-blue/5', className)}>
        <Lightbulb className="h-4 w-4 text-primary-blue" />
        <AlertDescription className="font-body text-sm text-text-dark leading-relaxed space-y-2">
          <p>
            <span className="font-heading font-semibold">Launch-Aktion:</span> Die ersten{' '}
            {LAUNCH_FEE_FREE_BOOKINGS} Buchungen ohne Platformabgabe — null Risiko.
            Noch{' '}
            <span className="font-heading font-semibold">
              {launchRemaining} Buchung{launchRemaining === 1 ? '' : 'en'}
            </span>{' '}
            gratis.
          </p>
          {!compact && (
            <p className="text-xs text-gray-600">
              Danach: {formatPlatformFeePercent(PLATFORM_FEE_RATE)} Abgabe (Beispiel: €100 Service →
              du erhältst €90). Mit Abo: 0 %.
            </p>
          )}
          <Button asChild size="sm" variant="outline" className="h-8 text-xs font-body">
            <Link href="/app/expert-profil?tab=konto">Abo ansehen</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // After launch free bookings: savings tip when fees were paid
  if (fees.totalFees < 5 && fees.billableCount < 1) {
    return null;
  }

  const monthlyAbo = SUBSCRIPTION_ACTION_PRICES.monthly;
  const worthIt = fees.totalFees >= monthlyAbo;

  return (
    <Alert className={cn('border-primary-green/35 bg-primary-green/10', className)}>
      <Lightbulb className="h-4 w-4 text-text-dark" />
      <AlertDescription className="font-body text-sm text-text-dark leading-relaxed space-y-3">
        <div className="space-y-1">
          <p>
            <span className="font-heading font-semibold">Tipp:</span> Du wirst gut gebucht — mit
            einem Abo hättest du dir bisher{' '}
            <span className="font-heading font-semibold tabular-nums text-primary-blue">
              {formatEuro(fees.totalFees)}
            </span>{' '}
            Platformabgabe gespart.
            {worthIt ? ' Das Abo hätte sich bereits gelohnt.' : null}
          </p>
          <p className="text-xs text-gray-600">
            Rechnung ohne Abo: €100 Service → {formatPlatformFeePercent(PLATFORM_FEE_RATE)} Abgabe →{' '}
            €90 Auszahlung. Klient:in zahlt weiterhin Service + Servicegebühr.
          </p>
        </div>

        {!compact && (
          <div className="rounded-lg border border-white/60 bg-white/70 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-heading font-semibold text-text-dark">
              Beim Premium-Abo hast du außerdem:
            </p>
            <ul className="space-y-1">
              {ABO_PREMIUM_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-gray-700">
                  <Check className="w-3.5 h-3.5 text-primary-green shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          asChild
          size="sm"
          className="h-8 text-xs font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
        >
          <Link href="/app/expert-profil?tab=konto">Abo aktivieren</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
