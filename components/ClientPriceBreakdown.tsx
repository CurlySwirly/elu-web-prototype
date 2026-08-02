'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatEuro,
  getClientPriceBreakdown,
  getSessionPriceBreakdown,
  type ClientPriceBreakdown,
} from '@/lib/utils/pricing';

type ClientPriceBreakdownViewProps = {
  /** Offer / appointment session price (Servicepreis brutto) */
  servicePrice: number;
  className?: string;
  /** Compact list row: only Endpreis */
  compact?: boolean;
  /** Collapsed: Preis + Endpreis, expand for Servicepreis / Servicegebühr */
  collapsible?: boolean;
};

export function ClientPriceBreakdownView({
  servicePrice,
  className,
  compact = false,
  collapsible = false,
}: ClientPriceBreakdownViewProps) {
  const breakdown = getClientPriceBreakdown(servicePrice);
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <span className={cn('font-heading font-bold text-text-dark tabular-nums', className)}>
        {formatEuro(breakdown.clientTotal)}
      </span>
    );
  }

  if (collapsible) {
    return (
      <div className={cn('border-t border-gray-200 pt-3', className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 py-1 text-left hover:opacity-80 transition-opacity"
          aria-expanded={open}
        >
          <span className="text-sm font-heading font-semibold text-text-dark">Preis</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
              {formatEuro(breakdown.clientTotal)}
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </span>
        </button>
        {open && (
          <div className="mt-2 space-y-1">
            <PriceRow
              label="Servicepreis"
              value={breakdown.servicePrice}
              className="px-0 py-1"
            />
            <PriceRow
              label={`Servicegebühr (inkl. ${Math.round(breakdown.serviceFeeVatRate * 100)}% USt)`}
              value={breakdown.serviceFeeGross}
              className="px-0 py-1"
            />
            <div className="flex items-center justify-between gap-3 py-1">
              <span className="text-sm font-heading font-semibold text-text-dark">Endpreis</span>
              <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
                {formatEuro(breakdown.clientTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-gray-200 divide-y divide-gray-100', className)}>
      <PriceRow label="Servicepreis" value={breakdown.servicePrice} />
      <PriceRow
        label={`Servicegebühr (inkl. ${Math.round(breakdown.serviceFeeVatRate * 100)}% USt)`}
        value={breakdown.serviceFeeGross}
      />
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-bg-light/80">
        <span className="text-sm font-heading font-semibold text-text-dark">Endpreis</span>
        <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
          {formatEuro(breakdown.clientTotal)}
        </span>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  className,
  valuePrefix = '',
}: {
  label: string;
  value: number;
  className?: string;
  valuePrefix?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-3.5 py-2.5', className)}>
      <span className="text-sm text-gray-600 font-body">{label}</span>
      <span className="text-sm font-body font-medium text-text-dark tabular-nums">
        {valuePrefix}
        {formatEuro(value)}
      </span>
    </div>
  );
}

type ExpertPriceBreakdownViewProps = {
  sessionPrice: number;
  className?: string;
  /** Demo / default: Kleinunternehmer → keine USt auf den Servicepreis */
  vatApplies?: boolean;
};

/** Expert session payout: collapsible, top line, no bordered container (matches client style). */
export function ExpertPriceBreakdownView({
  sessionPrice,
  className,
  vatApplies = false,
}: ExpertPriceBreakdownViewProps) {
  const breakdown = getSessionPriceBreakdown(sessionPrice);
  const [open, setOpen] = useState(false);
  const sessionGross = breakdown.clientPays;
  const sessionVat = vatApplies
    ? Math.round((sessionGross - sessionGross / (1 + breakdown.vatRate)) * 100) / 100
    : 0;
  const sessionNet = Math.round((sessionGross - sessionVat) * 100) / 100;

  return (
    <div className={cn('border-t border-gray-200 pt-3', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 py-1 text-left hover:opacity-80 transition-opacity"
        aria-expanded={open}
      >
        <span className="text-sm font-heading font-semibold text-text-dark">Preis</span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
            {formatEuro(breakdown.expertPayout)}
          </span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-500 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          <PriceRow label="Sessionpreis brutto" value={sessionGross} className="px-0 py-1" />
          <div className="flex items-start justify-between gap-3 py-1">
            <div className="min-w-0">
              <span className="text-sm text-gray-600 font-body">MwSt.</span>
              {!vatApplies && (
                <p className="text-[11px] text-gray-400 font-body mt-0.5 leading-snug">
                  Kleinunternehmerregelung, §&nbsp;6 Abs.&nbsp;1 Z&nbsp;27 UStG
                </p>
              )}
            </div>
            <span className="text-sm font-body font-medium text-text-dark tabular-nums shrink-0">
              {formatEuro(sessionVat)}
            </span>
          </div>
          <PriceRow label="Servicepreis netto" value={sessionNet} className="px-0 py-1" />
          <PriceRow
            label={`Plattformprovision (${Math.round(breakdown.feeRate * 100)}\u00a0%)`}
            value={breakdown.platformFeeGross}
            valuePrefix="−"
            className="px-0 py-1"
          />
          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm font-heading font-semibold text-text-dark">Auszahlung</span>
            <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
              {formatEuro(breakdown.expertPayout)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function getClientBreakdown(servicePrice: number): ClientPriceBreakdown {
  return getClientPriceBreakdown(servicePrice);
}
