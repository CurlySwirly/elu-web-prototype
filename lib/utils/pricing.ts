/**
 * Expert monetization is subscription-based (Abo) – no per-session provision.
 * Clients pay a fixed Servicegebühr on top of the offer price.
 */
export const PLATFORM_FEE_RATE = 0;

/** Austrian standard VAT rate (Normalsatz, UStG). */
export const VAT_RATE = 0.2;

/** Austrian VAT rates for elu sessions: exempt (0 %) or Normalsatz (20 %). */
export const AT_VAT_RATES = [0, 0.2] as const;
export type AtVatRate = (typeof AT_VAT_RATES)[number];

/** VAT on the client-facing elu service fee (Servicegebühr) – AT Normalsatz. */
export const SERVICE_FEE_VAT_RATE = 0.2;

export type SessionPriceBreakdown = {
  /** Session / offer price (what client pays for the service itself) */
  clientPays: number;
  /** Always 0 under Abo model */
  platformFeeNet: number;
  /** Always 0 under Abo model */
  vatAmount: number;
  /** Always 0 under Abo model */
  platformFeeGross: number;
  /** Expert receives the full session price */
  expertPayout: number;
  feeRate: number;
  vatRate: number;
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

/**
 * Expert payout: full session price (0 % provision; elu revenue = Expert Abo).
 */
export function getSessionPriceBreakdown(totalPrice: number): SessionPriceBreakdown {
  const clientPays = roundMoney(Number(totalPrice) || 0);

  return {
    clientPays,
    platformFeeNet: 0,
    vatAmount: 0,
    platformFeeGross: 0,
    expertPayout: clientPays,
    feeRate: PLATFORM_FEE_RATE,
    vatRate: VAT_RATE,
  };
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
