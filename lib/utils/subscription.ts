import { formatEuro } from '@/lib/utils/pricing';

/**
 * Fixed list prices (EUR). Do not change later — phase-1 incentives run via discounts.
 */
export const SUBSCRIPTION_LIST_PRICES = {
  monthly: 99.99,
  yearly: 999.9,
} as const;

/**
 * Action / intro prices (EUR, netto) for founder + launch cohorts.
 * Standard cohort pays list price.
 */
export const SUBSCRIPTION_ACTION_PRICES = {
  monthly: 19.99,
  yearly: 199.9,
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
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type SubscriptionCancelSource = 'user' | 'platform' | null;

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
    description: '100 % Rabatt für die ersten 3 Monate, danach Aktionspreis',
    monthsFree: 3,
    slotLimit: 10,
  },
  launch: {
    id: 'launch',
    label: 'Aktionspreis',
    description: 'Rabattierter Einstiegspreis für die ersten 100 Expert:innen',
    monthsFree: 0,
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
  /** ISO date – current period end / trial end / access ends when canceled */
  currentPeriodEnd: string | null;
  /** ISO date – when past_due grace ends */
  graceEndsAt: string | null;
  activatedAt: string | null;
  cancelAtPeriodEnd: boolean;
  /** ISO date – when cancel was requested */
  canceledAt: string | null;
  /** Why the subscription was canceled (user or platform) */
  cancelReason: string | null;
  cancelSource: SubscriptionCancelSource;
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
  canceledAt: null,
  cancelReason: null,
  cancelSource: null,
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

/** Recurring action price (netto) for a cohort – what shows as Aktionspreis. */
export function getActionPrice(planId: SubscriptionPlanId, cohort: PricingCohort): number {
  const normalized = normalizeCohort(cohort);
  if (normalized === 'standard') return getListPrice(planId);
  return SUBSCRIPTION_ACTION_PRICES[planId];
}

/**
 * First invoice amount after discount.
 * Founder monthly: 0 while monthsFree ≥ 1.
 * Otherwise: action price (or list for standard).
 * Yearly founder: action − (action monthly × remaining free months) floored at 0.
 */
export function getDiscountedFirstPrice(
  planId: SubscriptionPlanId,
  cohort: PricingCohort
): number {
  const normalized = normalizeCohort(cohort);
  const action = getActionPrice(planId, normalized);
  const promo = getPromoForCohort(normalized);
  if (!promo || promo.monthsFree <= 0) return action;

  if (planId === 'monthly') {
    return promo.monthsFree >= 1 ? 0 : action;
  }

  const credit = SUBSCRIPTION_ACTION_PRICES.monthly * promo.monthsFree;
  return Math.max(0, Math.round((action - credit) * 100) / 100);
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
  const action = getActionPrice(planId, normalized);
  const suffix = planId === 'monthly' ? '/ Monat' : '/ Jahr';
  return `${formatEuro(action)} ${suffix}`;
}

export function getListPriceLabel(planId: SubscriptionPlanId): string {
  return formatEuro(SUBSCRIPTION_LIST_PRICES[planId]);
}

/**
 * PREIS UI: Listenpreis durchgestrichen + Aktionspreis netto.
 * Always prefers the recurring action price (e.g. €9,99), not "gratis"-copy.
 */
export function getPlanPriceDisplay(
  planId: SubscriptionPlanId,
  cohort: PricingCohort
): {
  listLabel: string;
  actionLabel: string;
  hasDiscount: boolean;
  periodSuffix: string;
  actionAmount: number;
  listAmount: number;
} {
  const normalized = normalizeCohort(cohort);
  const listAmount = getListPrice(planId);
  const actionAmount = getActionPrice(planId, normalized);
  const periodSuffix = planId === 'yearly' ? '/Jahr' : '/Monat';
  return {
    listAmount,
    actionAmount,
    listLabel: `${formatEuro(listAmount)} netto`,
    actionLabel: `${formatEuro(actionAmount)} netto`,
    hasDiscount: actionAmount < listAmount,
    periodSuffix,
  };
}

/** Yearly savings vs 12× monthly at list (no promo). */
export function getYearlyListSavings(): number {
  return SUBSCRIPTION_LIST_PRICES.monthly * 12 - SUBSCRIPTION_LIST_PRICES.yearly;
}

/** Which manage-screen to render (pending ≡ none). */
export type AboManageView = 'active' | 'none' | 'overdue' | 'canceled';

export function getAboManageView(sub: ExpertSubscription): AboManageView {
  if (sub.status === 'past_due') return 'overdue';
  if (
    sub.status === 'canceled' ||
    (sub.cancelAtPeriodEnd && (sub.status === 'active' || sub.status === 'trialing'))
  ) {
    return 'canceled';
  }
  if (sub.status === 'active' || sub.status === 'trialing') return 'active';
  // none | pending | expired → wall / empty
  return 'none';
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
  const isNew =
    existing.status === 'none' ||
    existing.status === 'pending' ||
    existing.status === 'expired' ||
    existing.status === 'canceled';
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
    canceledAt: null,
    cancelReason: null,
    cancelSource: null,
  };
  return saveExpertSubscription(next, userId);
}

export function cancelExpertSubscription(
  userId?: string | null,
  options?: { reason?: string; source?: SubscriptionCancelSource }
): ExpertSubscription {
  const existing = loadExpertSubscription(userId);
  if (existing.status === 'none' || existing.status === 'pending' || existing.status === 'expired') {
    return existing;
  }
  const now = new Date().toISOString();
  const next: ExpertSubscription = {
    ...existing,
    cancelAtPeriodEnd: true,
    canceledAt: now,
    cancelReason:
      options?.reason ||
      (options?.source === 'platform'
        ? 'Vom elu-Team beendet'
        : 'Auf eigenen Wunsch gekündigt'),
    cancelSource: options?.source || 'user',
  };
  return saveExpertSubscription(next, userId);
}

export function resumeExpertSubscription(userId?: string | null): ExpertSubscription {
  const existing = loadExpertSubscription(userId);
  const next: ExpertSubscription = {
    ...existing,
    status:
      existing.status === 'canceled'
        ? existing.planId
          ? 'active'
          : 'none'
        : existing.status,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    cancelReason: null,
    cancelSource: null,
  };
  return saveExpertSubscription(next, userId);
}

/** After period ended / fully canceled: start fresh via plan selection. */
export function reactivateExpertSubscription(
  planId: SubscriptionPlanId,
  userId?: string | null
): ExpertSubscription {
  return activateExpertSubscription(planId, userId);
}

/** True if expert may create offers / go live. */
export function hasActiveSubscriptionAccess(sub: ExpertSubscription, now = new Date()): boolean {
  if (sub.status === 'pending' || sub.status === 'none' || sub.status === 'expired') return false;
  if (sub.status === 'canceled') {
    if (sub.currentPeriodEnd) {
      return now.getTime() <= new Date(sub.currentPeriodEnd).getTime();
    }
    return false;
  }
  if (sub.status === 'active' || sub.status === 'trialing') return true;
  if (sub.status === 'past_due' && sub.graceEndsAt) {
    return now.getTime() <= new Date(sub.graceEndsAt).getTime();
  }
  return false;
}

export function getSubscriptionStatusLabel(sub: ExpertSubscription): string {
  if (sub.cancelAtPeriodEnd && (sub.status === 'active' || sub.status === 'trialing')) {
    return 'Gekündigt';
  }
  switch (sub.status) {
    case 'active':
      return 'Aktiv';
    case 'trialing':
      return 'Aktion / gratis';
    case 'pending':
      return 'Ausstehend';
    case 'past_due':
      return 'Überfällig';
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
    planId: existing.planId || 'monthly',
    graceEndsAt: addDays(now, SUBSCRIPTION_GRACE_DAYS),
    cancelAtPeriodEnd: false,
  };
  return saveExpertSubscription(next, userId);
}

/**
 * Mock-only: jump between manage screens for QA.
 * Views: active | none | pending | overdue | canceled
 */
export function applyMockAboManageScenario(
  scenario: 'active' | 'none' | 'pending' | 'overdue' | 'canceled',
  userId?: string | null
): ExpertSubscription {
  const now = new Date();
  const periodEnd = addMonths(now, 11);
  const base = loadExpertSubscription(userId);

  if (scenario === 'none') {
    return saveExpertSubscription(
      { ...EMPTY, cohort: getDefaultCohort(), status: 'none' },
      userId
    );
  }
  if (scenario === 'pending') {
    return saveExpertSubscription(
      {
        ...EMPTY,
        cohort: getDefaultCohort(),
        status: 'pending',
        planId: 'monthly',
      },
      userId
    );
  }
  if (scenario === 'overdue') {
    return saveExpertSubscription(
      {
        ...base,
        ...EMPTY,
        cohort: base.cohort || 'launch',
        status: 'past_due',
        planId: 'monthly',
        activatedAt: addMonths(now, -2),
        currentPeriodEnd: addDays(now, -1),
        graceEndsAt: addDays(now, SUBSCRIPTION_GRACE_DAYS),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        cancelReason: null,
        cancelSource: null,
      },
      userId
    );
  }
  if (scenario === 'canceled') {
    return saveExpertSubscription(
      {
        ...EMPTY,
        cohort: base.cohort || 'launch',
        status: 'canceled',
        planId: 'yearly',
        activatedAt: addMonths(now, -3),
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: true,
        canceledAt: now.toISOString(),
        cancelReason: 'Auf eigenen Wunsch gekündigt',
        cancelSource: 'user',
        graceEndsAt: null,
      },
      userId
    );
  }
  // active
  return saveExpertSubscription(
    {
      ...EMPTY,
      cohort: 'launch',
      status: 'active',
      planId: 'monthly',
      activatedAt: addMonths(now, -1),
      currentPeriodEnd: addMonths(now, 1),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancelReason: null,
      cancelSource: null,
      graceEndsAt: null,
    },
    userId
  );
}

/**
 * @deprecated Prefer SUBSCRIPTION_ACTION_PRICES.
 */
export const SUBSCRIPTION_INTRO_PRICES = {
  monthly: SUBSCRIPTION_ACTION_PRICES.monthly,
  yearly: SUBSCRIPTION_ACTION_PRICES.yearly,
} as const;
