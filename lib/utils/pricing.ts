/** Platform commission as share of the client-facing session price (gross). */
export const PLATFORM_FEE_RATE = 0.15;

/** German VAT rate applied to the platform fee (expert side). */
export const VAT_RATE = 0.19;

/** VAT on the client-facing elu service fee (Servicegebühr). */
export const SERVICE_FEE_VAT_RATE = 0.2;

export type SessionPriceBreakdown = {
  /** What the client pays for the session */
  clientPays: number;
  /** Net platform fee (excl. VAT) */
  platformFeeNet: number;
  /** VAT portion of the platform fee */
  vatAmount: number;
  /** Gross platform fee (net + VAT) = what expert pays to elu */
  platformFeeGross: number;
  /** What the expert receives */
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

/**
 * Split a session total into client price, platform fee (incl. VAT share) and expert payout.
 * Platform takes PLATFORM_FEE_RATE of the total; that take is treated as gross (incl. VAT).
 */
export function getSessionPriceBreakdown(totalPrice: number): SessionPriceBreakdown {
  const clientPays = Number(totalPrice) || 0;
  const platformFeeGross = roundMoney(clientPays * PLATFORM_FEE_RATE);
  const platformFeeNet = roundMoney(platformFeeGross / (1 + VAT_RATE));
  const vatAmount = roundMoney(platformFeeGross - platformFeeNet);
  const expertPayout = roundMoney(clientPays - platformFeeGross);

  return {
    clientPays,
    platformFeeNet,
    vatAmount,
    platformFeeGross,
    expertPayout,
    feeRate: PLATFORM_FEE_RATE,
    vatRate: VAT_RATE,
  };
}

/**
 * Fixed client service fee by service price tier (net), VAT 20% on top.
 * bis 50 € → 0,99 / 1,19 · bis 100 € → 1,99 / 2,39 · bis/über 200 € → 2,99 / 3,59
 */
export function getClientServiceFeeNet(servicePriceGross: number): number {
  const price = Number(servicePriceGross) || 0;
  if (price <= 50) return 0.99;
  if (price <= 100) return 1.99;
  return 2.99;
}

/**
 * Client-facing price: Servicepreis (offer) + Servicegebühr brutto = Endpreis.
 * `servicePrice` is the offer / appointment total_price (session price).
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
