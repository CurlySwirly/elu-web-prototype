import {
  MOCK_ONBOARDING_EXPERT_USER_ID,
  MOCK_VERIFIED_EXPERT_USER_ID,
} from '@/lib/backend/mock/data';
import {
  hasActiveSubscriptionAccess,
  loadExpertSubscription,
  saveExpertSubscription,
  type ExpertSubscription,
} from '@/lib/utils/subscription';
import {
  completeMockStripeConnect,
  loadStripeConnectStatus,
  resetMockStripeConnect,
} from '@/lib/utils/stripe-connect';

const ONBOARDING_DONE_KEY = 'elu-mock-expert-onboarding-done';
const CHECKLIST_KEY = 'elu-mock-expert-checklist';

function canUseStorage() {
  return typeof window !== 'undefined';
}

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/** Verified demo: full profile path – active Abo + Stripe Connect ready. */
function seedVerifiedExpert(userId: string) {
  const sub = loadExpertSubscription(userId);
  if (!hasActiveSubscriptionAccess(sub)) {
    const now = new Date().toISOString();
    const next: ExpertSubscription = {
      status: 'active',
      planId: 'monthly',
      cohort: 'launch',
      currentPeriodEnd: addMonths(now, 1),
      graceEndsAt: null,
      activatedAt: now,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      cancelReason: null,
      cancelSource: null,
    };
    saveExpertSubscription(next, userId);
  } else if (sub.cohort === 'standard' || !sub.cohort) {
    // Keep verified demo on action pricing so list/action display is visible
    saveExpertSubscription({ ...sub, cohort: 'launch' }, userId);
  }

  if (!loadStripeConnectStatus(userId).completed) {
    completeMockStripeConnect(userId);
  }

  try {
    sessionStorage.setItem(ONBOARDING_DONE_KEY, '1');
    sessionStorage.removeItem(CHECKLIST_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Onboarding demo: registration wizard / Abo / Stripe still open.
 * Does not wipe in-progress checklist mid-session unless `forceReset`.
 */
function seedOnboardingExpert(userId: string, forceReset: boolean) {
  if (!forceReset) return;

  resetMockStripeConnect(userId);
  saveExpertSubscription(
    {
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
    },
    userId
  );

  try {
    sessionStorage.removeItem(ONBOARDING_DONE_KEY);
    sessionStorage.removeItem(CHECKLIST_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Keep the two mock expert logins distinct:
 * - expert@test.com → fully onboarded (Abo + Stripe + verified checklist)
 * - onboarding@test.com → wizard / Abo / Stripe still open
 *
 * Call on mock sign-in (`forceReset` for onboarding) and before reading demo state in UI.
 */
export function ensureMockExpertDemoState(
  userId?: string | null,
  options?: { forceResetOnboarding?: boolean }
) {
  if (!userId || !canUseStorage()) return;

  if (userId === MOCK_VERIFIED_EXPERT_USER_ID) {
    seedVerifiedExpert(userId);
    return;
  }

  if (userId === MOCK_ONBOARDING_EXPERT_USER_ID) {
    seedOnboardingExpert(userId, Boolean(options?.forceResetOnboarding));
  }
}

export function isMockOnboardingExpert(userId?: string | null): boolean {
  return userId === MOCK_ONBOARDING_EXPERT_USER_ID;
}

export function isMockVerifiedExpert(userId?: string | null): boolean {
  return userId === MOCK_VERIFIED_EXPERT_USER_ID;
}

export function hasCompletedMockExpertOnboardingWizard(): boolean {
  if (!canUseStorage()) return false;
  try {
    return sessionStorage.getItem(ONBOARDING_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

export function resolveMockExpertPostLoginPath(userId: string): string {
  if (userId === MOCK_ONBOARDING_EXPERT_USER_ID && !hasCompletedMockExpertOnboardingWizard()) {
    return '/onboarding/expert';
  }
  return '/app';
}
