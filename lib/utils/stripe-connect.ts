/**
 * Mock + client helpers for Stripe Connect Express onboarding.
 * Live calls go through /api/stripe/connect/*; mock persists in localStorage.
 *
 * Liability: Express Connect with Stripe-managed KYC is required so Stripe can
 * cover connected-account negative balances when Dashboard / account config
 * sets losses.payments = stripe (see Stripe Connect risk docs).
 */

export type StripeConnectStatus = {
  accountId: string | null;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /** Fully ready for payouts / live booking money path */
  completed: boolean;
  updatedAt: string | null;
};

const STORAGE_KEY = 'elu-mock-stripe-connect';

const EMPTY: StripeConnectStatus = {
  accountId: null,
  detailsSubmitted: false,
  chargesEnabled: false,
  payoutsEnabled: false,
  completed: false,
  updatedAt: null,
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function key(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function loadStripeConnectStatus(userId?: string | null): StripeConnectStatus {
  if (!canUseStorage()) return { ...EMPTY };
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as StripeConnectStatus) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveStripeConnectStatus(
  status: StripeConnectStatus,
  userId?: string | null
): StripeConnectStatus {
  if (canUseStorage()) {
    try {
      localStorage.setItem(key(userId), JSON.stringify(status));
    } catch {
      /* ignore */
    }
  }
  return status;
}

/** Simulate completing Stripe-hosted Express onboarding (prototype / mock). */
export function completeMockStripeConnect(userId?: string | null): StripeConnectStatus {
  const next: StripeConnectStatus = {
    accountId: `acct_mock_${(userId || 'expert').slice(0, 8)}`,
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    completed: true,
    updatedAt: new Date().toISOString(),
  };
  return saveStripeConnectStatus(next, userId);
}

export function resetMockStripeConnect(userId?: string | null): StripeConnectStatus {
  return saveStripeConnectStatus({ ...EMPTY }, userId);
}

export function getStripeConnectStatusLabel(status: StripeConnectStatus): string {
  if (status.completed && status.payoutsEnabled) return 'Verbunden';
  if (status.detailsSubmitted && !status.chargesEnabled) return 'In Prüfung';
  if (status.accountId) return 'Onboarding offen';
  return 'Nicht verbunden';
}
