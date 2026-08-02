/** Platform commission as share of the client-facing session price (gross). */
export const PLATFORM_FEE_RATE = 0.15;

/** German VAT rate applied to the platform fee. */
export const VAT_RATE = 0.19;

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

export function formatEuro(amount: number) {
  return `€${amount.toFixed(2).replace('.', ',')}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
