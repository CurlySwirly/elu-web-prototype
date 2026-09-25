'use client';

import Link from 'next/link';
import { Lightbulb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  calculatePlatformFeesOnSessions,
  formatEuro,
  getLaunchFeeFreeRemaining,
  LAUNCH_FEE_FREE_BOOKINGS,
} from '@/lib/utils/pricing';
import { cn } from '@/lib/utils';

type ExpertAboSavingsTipProps = {
  /** Completed session prices (chronological) for fee / savings math */
  sessionPrices: number[];
  hasActiveAbo?: boolean;
  className?: string;
};

/**
 * Short expert tip: launch remaining free bookings, or Abo savings so far.
 */
export function ExpertAboSavingsTip({
  sessionPrices,
  hasActiveAbo = false,
  className,
}: ExpertAboSavingsTipProps) {
  const fees = calculatePlatformFeesOnSessions(sessionPrices, { hasActiveAbo });
  const launchRemaining = getLaunchFeeFreeRemaining(fees.bookingCount, hasActiveAbo);

  if (hasActiveAbo) {
    return null;
  }

  if (launchRemaining > 0) {
    return (
      <Alert className={cn('border-primary-blue/30 bg-primary-blue/5', className)}>
        <Lightbulb className="h-4 w-4 text-primary-blue" />
        <AlertDescription className="font-body text-sm text-text-dark leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p>
            Noch{' '}
            <span className="font-heading font-semibold">
              {launchRemaining} von {LAUNCH_FEE_FREE_BOOKINGS} Buchungen
            </span>{' '}
            ohne Platformabgabe.
          </p>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs font-body shrink-0">
            <Link href="/app/expert-profil?tab=konto">Abo ansehen</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (fees.totalFees < 5 && fees.billableCount < 1) {
    return null;
  }

  return (
    <Alert className={cn('border-primary-green/35 bg-primary-green/10', className)}>
      <Lightbulb className="h-4 w-4 text-text-dark" />
      <AlertDescription className="font-body text-sm text-text-dark leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p>
          Bisher{' '}
          <span className="font-heading font-semibold tabular-nums text-primary-blue">
            {formatEuro(fees.totalFees)}
          </span>{' '}
          Platformabgabe. Mit Abo wäre das 0 %.
        </p>
        <Button
          asChild
          size="sm"
          className="h-8 text-xs font-body shrink-0 bg-gradient-to-r from-primary-blue to-primary-green text-white"
        >
          <Link href="/app/expert-profil?tab=konto">Abo ansehen</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
