/**
 * Hybrid monetization:
 * - Default: 10 % Platformabgabe (commission) per booking
 * - Launch: first 3 bookings without platform fee
 * - With active Abo: 0 % Platformabgabe
 * - Clients always pay a fixed Servicegebühr on top of the offer price
 *
 * Example: Service €100 → Client pays €100 + Servicegebühr; Expert gets €90
 * (or €100 during launch-free bookings / with Abo).
 */
export const PLATFORM_FEE_RATE = 0.1;

/** Launch Aktion: first N completed bookings without platform fee. */
export const LAUNCH_FEE_FREE_BOOKINGS = 3;

/** Austrian standard VAT rate (Normalsatz, UStG). */
export const VAT_RATE = 0.2;

/** Austrian VAT rates for elu sessions: exempt (0 %) or Normalsatz (20 %). */
export const AT_VAT_RATES = [0, 0.2] as const;
export type AtVatRate = (typeof AT_VAT_RATES)[number];

/** VAT on the client-facing elu service fee (Servicegebühr) – AT Normalsatz. */
export const SERVICE_FEE_VAT_RATE = 0.2;

/** Benefits shown on Abo plan cards (expert-facing, product-true). */
export const ABO_PLAN_BENEFITS = [
  '0 % Platformabgabe auf alle Buchungen',
  'Kalender, Nachrichten & Profil-Tools',
  'Jederzeit kündbar zum Periodenende',
] as const;

/** @deprecated use ABO_PLAN_BENEFITS */
export const ABO_PREMIUM_BENEFITS = ABO_PLAN_BENEFITS;

export type PlatformFeeWaiverReason = 'abo' | 'launch' | null;

export type SessionPriceBreakdown = {
  /** Session / offer price (what client pays for the service itself) */
  clientPays: number;
  /** Platform commission (0 when Abo / launch waives fee) */
  platformFeeNet: number;
  /** Reserved; platform fee shown without separate VAT line */
  vatAmount: number;
  /** Same as platformFeeNet for display */
  platformFeeGross: number;
  /** Expert receives session price minus platform fee */
  expertPayout: number;
  feeRate: number;
  vatRate: number;
  waiverReason: PlatformFeeWaiverReason;
};

export type ClientPriceBreakdown = {
  /** Offer / session price (brutto) shown as Servicepreis */
  servicePrice: number;
  /** Service fee excl. VAT */
  serviceFeeNet: number;
  /** VAT on the service fee */
  serviceFeeVat: number;
  /** Service fee incl. VAT – what elu charges the client on top */
  serviceFeeGross: number;
  /** What the client pays in total */
  clientTotal: number;
  serviceFeeVatRate: number;
};

export type BookingVatBreakdown = {
  /** Net session price (EUR) */
  net: number;
  /** VAT amount (EUR) */
  vat: number;
  /** Gross session price (EUR) */
  gross: number;
  /** Applied VAT rate (0–1) */
  vatRate: number;
};

export type SessionPriceOptions = {
  /** Explicit override (takes precedence) */
  waivePlatformFee?: boolean;
  waiverReason?: PlatformFeeWaiverReason;
  /** Active Abo → no platform commission */
  hasActiveAbo?: boolean;
  /** 0-based index among completed fee-eligible bookings (launch free uses 0..2) */
  bookingIndex?: number;
};

export function resolvePlatformFeeWaiver(options?: SessionPriceOptions): {
  waive: boolean;
  reason: PlatformFeeWaiverReason;
  feeRate: number;
} {
  if (options?.waivePlatformFee === true) {
    return {
      waive: true,
      reason: options.waiverReason ?? 'abo',
      feeRate: 0,
    };
  }
  if (options?.waivePlatformFee === false) {
    return { waive: false, reason: null, feeRate: PLATFORM_FEE_RATE };
  }
  if (options?.hasActiveAbo) {
    return { waive: true, reason: 'abo', feeRate: 0 };
  }
  const idx = options?.bookingIndex;
  if (typeof idx === 'number' && idx >= 0 && idx < LAUNCH_FEE_FREE_BOOKINGS) {
    return { waive: true, reason: 'launch', feeRate: 0 };
  }
  return { waive: false, reason: null, feeRate: PLATFORM_FEE_RATE };
}

export function getEffectivePlatformFeeRate(options?: SessionPriceOptions) {
  return resolvePlatformFeeWaiver(options).feeRate;
}

export function formatPlatformFeePercent(rate: number = PLATFORM_FEE_RATE) {
  return `${Math.round((Number(rate) || 0) * 100)} %`;
}

/**
 * Expert payout: session price minus platform fee
 * (0 % with Abo or during launch free bookings).
 */
export function getSessionPriceBreakdown(
  totalPrice: number,
  options?: SessionPriceOptions
): SessionPriceBreakdown {
  const clientPays = roundMoney(Number(totalPrice) || 0);
  const resolved = resolvePlatformFeeWaiver(options);
  const platformFeeNet = roundMoney(clientPays * resolved.feeRate);
  const expertPayout = roundMoney(clientPays - platformFeeNet);

  return {
    clientPays,
    platformFeeNet,
    vatAmount: 0,
    platformFeeGross: platformFeeNet,
    expertPayout,
    feeRate: resolved.feeRate,
    vatRate: VAT_RATE,
    waiverReason: resolved.reason,
  };
}

/**
 * Sum platform fees paid across completed sessions (respects launch free + Abo).
 */
export function calculatePlatformFeesOnSessions(
  sessionPrices: number[],
  options?: { hasActiveAbo?: boolean }
): {
  totalFees: number;
  billableCount: number;
  freeLaunchCount: number;
  bookingCount: number;
} {
  if (options?.hasActiveAbo) {
    return {
      totalFees: 0,
      billableCount: 0,
      freeLaunchCount: 0,
      bookingCount: sessionPrices.length,
    };
  }
  let totalFees = 0;
  let billableCount = 0;
  let freeLaunchCount = 0;
  sessionPrices.forEach((price, bookingIndex) => {
    const breakdown = getSessionPriceBreakdown(price, { bookingIndex });
    if (breakdown.waiverReason === 'launch') {
      freeLaunchCount += 1;
      return;
    }
    billableCount += 1;
    totalFees += breakdown.platformFeeNet;
  });
  return {
    totalFees: roundMoney(totalFees),
    billableCount,
    freeLaunchCount,
    bookingCount: sessionPrices.length,
  };
}

/** Remaining launch bookings without platform fee (0 when Abo or exhausted). */
export function getLaunchFeeFreeRemaining(
  completedBookingCount: number,
  hasActiveAbo?: boolean
) {
  if (hasActiveAbo) return 0;
  return Math.max(0, LAUNCH_FEE_FREE_BOOKINGS - Math.max(0, completedBookingCount));
}

/**
 * Split a gross amount by an Austrian VAT rate (backend-style fields).
 */
export function splitGrossByVatRate(
  grossAmount: number,
  vatRate: number
): BookingVatBreakdown {
  const gross = roundMoney(Number(grossAmount) || 0);
  const rate = Number(vatRate) || 0;
  if (rate <= 0 || gross === 0) {
    return { net: gross, vat: 0, gross, vatRate: 0 };
  }
  const net = roundMoney(gross / (1 + rate));
  const vat = roundMoney(gross - net);
  return { net, vat, gross, vatRate: rate };
}

/** Convert VAT amount stored in cents to EUR. */
export function vatCentsToEuros(cents: number) {
  return roundMoney((Number(cents) || 0) / 100);
}

export function formatVatRatePercent(rate: number) {
  const pct = Math.round((Number(rate) || 0) * 100);
  return `${pct} %`;
}

/**
 * Fixed client service fee by service price tier (net), VAT 20 % on top.
 * unter 100 € → 1,99 / 2,39 · ab 100 € → 2,99 / 3,59
 */
export function getClientServiceFeeNet(servicePriceGross: number): number {
  const price = Number(servicePriceGross) || 0;
  if (price < 100) return 1.99;
  return 2.99;
}

/**
 * Client-facing price: Servicepreis (offer) + Servicegebühr brutto = Endpreis.
 */
export function getClientPriceBreakdown(servicePriceGross: number): ClientPriceBreakdown {
  const servicePrice = roundMoney(Number(servicePriceGross) || 0);
  const serviceFeeNet = getClientServiceFeeNet(servicePrice);
  const serviceFeeGross = roundMoney(serviceFeeNet * (1 + SERVICE_FEE_VAT_RATE));
  const serviceFeeVat = roundMoney(serviceFeeGross - serviceFeeNet);
  const clientTotal = roundMoney(servicePrice + serviceFeeGross);

  return {
    servicePrice,
    serviceFeeNet,
    serviceFeeVat,
    serviceFeeGross,
    clientTotal,
    serviceFeeVatRate: SERVICE_FEE_VAT_RATE,
  };
}

export function formatEuro(amount: number) {
  return `€${amount.toFixed(2).replace('.', ',')}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
