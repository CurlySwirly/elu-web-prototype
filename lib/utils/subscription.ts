import { formatEuro } from '@/lib/utils/pricing';

/**
 * Fixed list prices (EUR). Do not change later — phase-1 incentives run via discounts.
 */
export const SUBSCRIPTION_LIST_PRICES = {
  monthly: 99,
  yearly: 899,
} as const;

/** Days after failed renewal before access is locked. */
export const SUBSCRIPTION_GRACE_DAYS = 7;

export type SubscriptionPlanId = 'monthly' | 'yearly';
/**
 * Promo cohort (maps to a discount campaign). List price stays fixed;
 * only the active discount changes over time.
 */
export type PricingCohort = 'founder' | 'launch' | 'standard';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type SubscriptionPromo = {
  id: string;
  /** Short badge, e.g. "1. Monat gratis" */
  label: string;
  /** Explains the discount mechanic */
  description: string;
  /** 100 % Rabatt für N Monats-Äquivalente der Listenpreis-Monatspauschale */
  monthsFree: number;
  slotLimit?: number;
};

/**
 * Phase-1 discount campaigns. Swap / edit these without touching list prices.
 */
export const SUBSCRIPTION_PROMOS: Record<Exclude<PricingCohort, 'standard'>, SubscriptionPromo> = {
  founder: {
    id: 'founder',
    label: '3 Monate gratis',
    description: '100 % Rabatt für die ersten 3 Monate',
    monthsFree: 3,
    slotLimit: 10,
  },
  launch: {
    id: 'launch',
    label: '1. Monat gratis',
    description: '100 % Rabatt auf den ersten Monat (Listenpreis bleibt 99 € / 899 €)',
    monthsFree: 1,
    slotLimit: 100,
  },
};

/** Promo code: 1 Monat gratis bei Abschluss eines Jahresabos */
export const YEARLY_FREE_MONTH_PROMO_CODE = 'ELUJAHR1';

export const FOUNDER_SLOT_LIMIT = SUBSCRIPTION_PROMOS.founder.slotLimit ?? 10;
export const LAUNCH_SLOT_LIMIT = SUBSCRIPTION_PROMOS.launch.slotLimit ?? 100;
/** @deprecated use LAUNCH_SLOT_LIMIT */
export const INTRO_SLOT_LIMIT = LAUNCH_SLOT_LIMIT;
/** @deprecated use SUBSCRIPTION_PROMOS.founder.monthsFree */
export const FOUNDER_TRIAL_MONTHS = SUBSCRIPTION_PROMOS.founder.monthsFree;

export type ExpertSubscription = {
  status: SubscriptionStatus;
  planId: SubscriptionPlanId | null;
  cohort: PricingCohort;
  /** ISO date – current period end / trial end */
  currentPeriodEnd: string | null;
  /** ISO date – when past_due grace ends */
  graceEndsAt: string | null;
  activatedAt: string | null;
  cancelAtPeriodEnd: boolean;
};

const STORAGE_KEY = 'elu-mock-expert-subscription';
const COHORT_KEY = 'elu-mock-expert-cohort-counter';

const EMPTY: ExpertSubscription = {
  status: 'none',
  planId: null,
  cohort: 'launch',
  currentPeriodEnd: null,
  graceEndsAt: null,
  activatedAt: null,
  cancelAtPeriodEnd: false,
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function storageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function normalizeCohort(cohort: string | null | undefined): PricingCohort {
  if (cohort === 'founder') return 'founder';
  if (cohort === 'standard') return 'standard';
  // legacy "intro" → launch promo
  return 'launch';
}

export function getPromoForCohort(cohort: PricingCohort): SubscriptionPromo | null {
  if (cohort === 'standard') return null;
  return SUBSCRIPTION_PROMOS[cohort];
}

/** Active phase-1 promo for new signups (slot-based). */
export function getDefaultCohort(): PricingCohort {
  if (!canUseStorage()) return 'launch';
  try {
    const raw = localStorage.getItem(COHORT_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    if (Number.isNaN(n) || n < FOUNDER_SLOT_LIMIT) return 'founder';
    if (n < FOUNDER_SLOT_LIMIT + LAUNCH_SLOT_LIMIT) return 'launch';
    return 'standard';
  } catch {
    return 'launch';
  }
}

export function consumeCohortSlot(cohort: PricingCohort) {
  if (!canUseStorage()) return;
  if (cohort === 'standard') return;
  try {
    const raw = localStorage.getItem(COHORT_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    localStorage.setItem(COHORT_KEY, String((Number.isNaN(n) ? 0 : n) + 1));
  } catch {
    /* ignore */
  }
}

/** Always the fixed list price. */
export function getListPrice(planId: SubscriptionPlanId): number {
  return SUBSCRIPTION_LIST_PRICES[planId];
}

/**
 * First invoice after discount (promo = N months free at 100 %).
 * Monthly: 0 while monthsFree ≥ 1.
 * Yearly: list − (monthly list × monthsFree).
 */
export function getDiscountedFirstPrice(
  planId: SubscriptionPlanId,
  cohort: PricingCohort
): number {
  const list = getListPrice(planId);
  const promo = getPromoForCohort(cohort);
  if (!promo || promo.monthsFree <= 0) return list;

  if (planId === 'monthly') {
    return promo.monthsFree >= 1 ? 0 : list;
  }

  const credit = SUBSCRIPTION_LIST_PRICES.monthly * promo.monthsFree;
  return Math.max(0, Math.round((list - credit) * 100) / 100);
}

/** Discount percent shown for the first invoice (relative to list). */
export function getFirstInvoiceDiscountPercent(
  planId: SubscriptionPlanId,
  cohort: PricingCohort
): number {
  const list = getListPrice(planId);
  if (list <= 0) return 0;
  const first = getDiscountedFirstPrice(planId, cohort);
  return Math.round(((list - first) / list) * 100);
}

/** @deprecated prefer getDiscountedFirstPrice — kept for older call sites */
export function getPlanPrice(planId: SubscriptionPlanId, cohort: PricingCohort): number {
  return getDiscountedFirstPrice(planId, cohort);
}

export function formatPlanPrice(planId: SubscriptionPlanId, cohort: PricingCohort): string {
  const normalized = normalizeCohort(cohort);
  const promo = getPromoForCohort(normalized);
  const first = getDiscountedFirstPrice(planId, normalized);
  const suffix = planId === 'monthly' ? '/ Monat' : '/ Jahr';

  if (promo && first === 0 && planId === 'monthly') {
    return promo.label;
  }
  if (promo && first < getListPrice(planId)) {
    return `${formatEuro(first)} ${suffix}`;
  }
  return `${formatEuro(getListPrice(planId))} ${suffix}`;
}

export function getListPriceLabel(planId: SubscriptionPlanId): string {
  return formatEuro(SUBSCRIPTION_LIST_PRICES[planId]);
}

/** Yearly savings vs 12× monthly at list (no promo). */
export function getYearlyListSavings(): number {
  return SUBSCRIPTION_LIST_PRICES.monthly * 12 - SUBSCRIPTION_LIST_PRICES.yearly;
}

export function loadExpertSubscription(userId?: string | null): ExpertSubscription {
  if (!canUseStorage()) return { ...EMPTY, cohort: getDefaultCohort() };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY, cohort: getDefaultCohort() };
    const parsed = JSON.parse(raw) as ExpertSubscription & { cohort?: string };
    return {
      ...EMPTY,
      ...parsed,
      cohort: normalizeCohort(parsed.cohort),
    };
  } catch {
    return { ...EMPTY, cohort: getDefaultCohort() };
  }
}

export function saveExpertSubscription(
  sub: ExpertSubscription,
  userId?: string | null
): ExpertSubscription {
  if (canUseStorage()) {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(sub));
    } catch {
      /* ignore */
    }
  }
  return sub;
}

function addMonths(iso: string | Date, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function addDays(iso: string | Date, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/** Mock activate / change plan (no real Stripe). */
export function activateExpertSubscription(
  planId: SubscriptionPlanId,
  userId?: string | null,
  cohortOverride?: PricingCohort
): ExpertSubscription {
  const existing = loadExpertSubscription(userId);
  const cohort = normalizeCohort(cohortOverride || existing.cohort || getDefaultCohort());
  const now = new Date().toISOString();
  const isNew = existing.status === 'none' || existing.status === 'expired';
  const promo = getPromoForCohort(cohort);

  if (isNew) consumeCohortSlot(cohort);

  const periodEnd =
    promo && planId === 'monthly' && promo.monthsFree > 0 && isNew
      ? addMonths(now, Math.max(1, promo.monthsFree))
      : planId === 'yearly'
        ? addMonths(now, 12)
        : addMonths(now, 1);

  const next: ExpertSubscription = {
    status: promo && promo.monthsFree > 0 && isNew ? 'trialing' : 'active',
    planId,
    cohort,
    currentPeriodEnd: periodEnd,
    graceEndsAt: null,
    activatedAt: existing.activatedAt || now,
    cancelAtPeriodEnd: false,
  };
  return saveExpertSubscription(next, userId);
}

export function cancelExpertSubscription(userId?: string | null): ExpertSubscription {
  const existing = loadExpertSubscription(userId);
  if (existing.status === 'none') return existing;
  const next: ExpertSubscription = {
    ...existing,
    cancelAtPeriodEnd: true,
  };
  return saveExpertSubscription(next, userId);
}

export function resumeExpertSubscription(userId?: string | null): ExpertSubscription {
  const existing = loadExpertSubscription(userId);
  const next: ExpertSubscription = {
    ...existing,
    cancelAtPeriodEnd: false,
  };
  return saveExpertSubscription(next, userId);
}

/** True if expert may create offers / go live. */
export function hasActiveSubscriptionAccess(sub: ExpertSubscription, now = new Date()): boolean {
  if (sub.status === 'active' || sub.status === 'trialing') return true;
  if (sub.status === 'past_due' && sub.graceEndsAt) {
    return now.getTime() <= new Date(sub.graceEndsAt).getTime();
  }
  return false;
}

export function getSubscriptionStatusLabel(sub: ExpertSubscription): string {
  if (sub.cancelAtPeriodEnd && (sub.status === 'active' || sub.status === 'trialing')) {
    return 'Kündigt zum Periodenende';
  }
  switch (sub.status) {
    case 'active':
      return 'Aktiv';
    case 'trialing':
      return 'Aktion / gratis';
    case 'past_due':
      return 'Zahlung ausstehend';
    case 'canceled':
      return 'Gekündigt';
    case 'expired':
      return 'Abgelaufen';
    default:
      return 'Kein Abo';
  }
}

export function getPlanLabel(planId: SubscriptionPlanId | null): string {
  if (planId === 'yearly') return 'Jahresabo';
  if (planId === 'monthly') return 'Monatsabo';
  return '—';
}

/** Demo: mark renewal failed → past_due with grace. */
export function markSubscriptionPastDue(userId?: string | null): ExpertSubscription {
  const existing = loadExpertSubscription(userId);
  const now = new Date().toISOString();
  const next: ExpertSubscription = {
    ...existing,
    status: 'past_due',
    graceEndsAt: addDays(now, SUBSCRIPTION_GRACE_DAYS),
  };
  return saveExpertSubscription(next, userId);
}

/**
 * @deprecated Derived from list − monthsFree credit for yearly.
 * Prefer getDiscountedFirstPrice + SUBSCRIPTION_LIST_PRICES.
 */
export const SUBSCRIPTION_INTRO_PRICES = {
  monthly: 0,
  yearly: SUBSCRIPTION_LIST_PRICES.yearly - SUBSCRIPTION_LIST_PRICES.monthly,
} as const;
