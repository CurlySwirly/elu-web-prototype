'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CreditCard,
  Database,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpertAboWall } from '@/components/ExpertAboWall';
import { ExpertAboSavingsTip } from '@/components/ExpertAboSavingsTip';
import { mockExpertFinanceTransactions } from '@/lib/backend/mock/finance-data';
import {
  applyMockAboManageScenario,
  cancelExpertSubscription,
  getAboManageView,
  getPlanLabel,
  getPlanPriceDisplay,
  getSubscriptionStatusLabel,
  hasActiveSubscriptionAccess,
  loadExpertSubscription,
  resumeExpertSubscription,
  type ExpertSubscription,
  type SubscriptionPlanId,
} from '@/lib/utils/subscription';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { getBackendMode } from '@/lib/backend/mode';
import { ensureMockExpertDemoState } from '@/lib/backend/mock/expert-demo-state';
import { formatEuro, formatPlatformFeePercent, PLATFORM_FEE_RATE } from '@/lib/utils/pricing';
import { cn } from '@/lib/utils';

type ExpertAboManageProps = {
  userId?: string | null;
  className?: string;
};

function formatDateLabel(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return format(new Date(iso), 'd. MMMM yyyy', { locale: de });
  } catch {
    return null;
  }
}

function PriceRow({ planId, cohort }: { planId: SubscriptionPlanId; cohort: ExpertSubscription['cohort'] }) {
  const price = getPlanPriceDisplay(planId, cohort);
  return (
    <div className="flex items-start justify-between gap-3 text-sm font-body">
      <span className="text-gray-600">Preis</span>
      <span className="text-right tabular-nums leading-snug">
        {price.hasDiscount ? (
          <span className="inline-flex flex-wrap items-baseline justify-end gap-x-2">
            <span className="text-gray-400 line-through">{formatEuro(price.listAmount)}</span>
            <span className="font-heading font-semibold text-primary-blue">
              {formatEuro(price.actionAmount)}
            </span>
          </span>
        ) : (
          <span className="font-heading font-semibold text-text-dark">
            {formatEuro(price.listAmount)}
          </span>
        )}
      </span>
    </div>
  );
}

export function ExpertAboManage({ userId, className }: ExpertAboManageProps) {
  const isMock = getBackendMode() === 'mock';
  const [sub, setSub] = useState<ExpertSubscription | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);

  const refresh = useCallback(
    (options?: { skipSeed?: boolean }) => {
      if (isMock && !options?.skipSeed) {
        ensureMockExpertDemoState(userId);
      }
      setSub(loadExpertSubscription(userId));
      setShowPlanPicker(false);
    },
    [userId, isMock]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const view = useMemo(() => (sub ? getAboManageView(sub) : 'none'), [sub]);
  const periodEndLabel = formatDateLabel(sub?.currentPeriodEnd);
  const canceledAtLabel = formatDateLabel(sub?.canceledAt);
  const graceEndsLabel = formatDateLabel(sub?.graceEndsAt);

  const badgeClass = useMemo(() => {
    if (view === 'active') {
      return 'border-primary-green/40 bg-primary-green/10 text-text-dark font-body';
    }
    if (view === 'overdue') {
      return 'border-red-300 bg-red-50 text-red-700 font-body';
    }
    if (view === 'canceled') {
      return 'border-amber-300 bg-amber-50 text-amber-900 font-body';
    }
    return 'border-gray-300 bg-gray-50 text-gray-600 font-body';
  }, [view]);

  if (!sub) return null;

  const confirmCancel = () => {
    cancelExpertSubscription(userId, {
      source: 'user',
      reason: 'Auf eigenen Wunsch gekündigt',
    });
    setCancelOpen(false);
    refresh({ skipSeed: true });
  };

  const applyScenario = (scenario: 'active' | 'none' | 'pending' | 'overdue' | 'canceled') => {
    applyMockAboManageScenario(scenario, userId);
    // Don't re-seed verified demo — that would overwrite none/pending back to active
    refresh({ skipSeed: true });
  };

  const completedSessionPrices = mockExpertFinanceTransactions
    .filter(
      (t) =>
        t.status === 'completed' &&
        t.booking_status !== 'REFUNDED_CLAWBACK' &&
        t.booking_status !== 'REFUNDED'
    )
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .map((t) => t.amount);
  const tipHasAbo = hasActiveSubscriptionAccess(sub);

  return (
    <>
      <Card className={cn('border border-gray-200 shadow-sm', className)}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 space-y-0">
          <CardTitle className="font-heading text-base sm:text-lg text-text-dark flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-blue shrink-0" />
            dein Abo
          </CardTitle>
          <Badge variant="outline" className={badgeClass}>
            {getSubscriptionStatusLabel(sub)}
          </Badge>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-5 space-y-4">
          {view === 'none' && (
            <div className="space-y-4">
              <ExpertAboSavingsTip
                sessionPrices={completedSessionPrices}
                hasActiveAbo={tipHasAbo}
              />
              <Alert
                className={
                  sub.status === 'pending'
                    ? 'border-primary-blue/30 bg-primary-blue/5'
                    : 'border-gray-200 bg-gray-50'
                }
              >
                {sub.status === 'pending' ? (
                  <Info className="h-4 w-4 text-primary-blue" />
                ) : (
                  <Info className="h-4 w-4 text-gray-500" />
                )}
                <AlertDescription className="font-body text-sm text-text-dark leading-relaxed">
                  {sub.status === 'pending'
                    ? 'Dein Abo ist noch nicht aktiv. Schließe die Aktivierung ab, um auf 0 % Platformabgabe zu wechseln.'
                    : `Aktuell ${formatPlatformFeePercent(PLATFORM_FEE_RATE)} Platformabgabe. Mit Abo: 0 %.`}
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-heading font-semibold text-text-dark">
                    {sub.planId ? getPlanLabel(sub.planId) : 'Noch nicht gewählt'}
                  </span>
                </div>
                <PriceRow
                  planId={sub.planId || 'monthly'}
                  cohort={sub.cohort === 'standard' ? 'launch' : sub.cohort}
                />
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Platformabgabe</span>
                  <span className="text-text-dark">
                    {formatPlatformFeePercent(PLATFORM_FEE_RATE)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Status</span>
                  <span className="text-text-dark">
                    {sub.status === 'pending' ? 'Aktivierung ausstehend' : 'Kein Abo'}
                  </span>
                </div>
              </div>

              {showPlanPicker ? (
                <ExpertAboWall
                  userId={userId}
                  compact
                  hideHeading
                  title={sub.status === 'pending' ? 'Aktivierung abschließen' : 'Abo wählen'}
                  description={
                    sub.status === 'pending'
                      ? 'Wähle deinen Plan und schließe die Aktivierung ab.'
                      : 'Mit Abo entfällt die Platformabgabe.'
                  }
                  onActivated={() => refresh({ skipSeed: true })}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
                    onClick={() => setShowPlanPicker(true)}
                  >
                    {sub.status === 'pending' ? 'Aktivierung fortsetzen' : 'Abo aktivieren'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {view === 'overdue' && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="font-body text-sm text-red-800 leading-relaxed">
                  Die fällige Zahlung konnte nicht abgebucht werden.
                  {graceEndsLabel ? (
                    <>
                      {' '}
                      Bitte aktualisiere deine Zahlungsmethode bis einschließlich{' '}
                      <span className="font-semibold">{graceEndsLabel}</span>, sonst gilt wieder{' '}
                      {formatPlatformFeePercent(PLATFORM_FEE_RATE)} Platformabgabe.
                    </>
                  ) : (
                    <>
                      {' '}
                      Bitte aktualisiere deine Zahlungsmethode, sonst gilt wieder{' '}
                      {formatPlatformFeePercent(PLATFORM_FEE_RATE)} Platformabgabe.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-heading font-semibold text-text-dark">
                    {getPlanLabel(sub.planId)}
                  </span>
                </div>
                {sub.planId ? <PriceRow planId={sub.planId} cohort={sub.cohort} /> : null}
                {periodEndLabel ? (
                  <div className="flex items-center justify-between gap-3 text-sm font-body">
                    <span className="text-gray-600">Ursprünglich fällig am</span>
                    <span className="tabular-nums text-text-dark">{periodEndLabel}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
                  onClick={() => {
                    // Mock: treat as payment fixed → active
                    applyMockAboManageScenario('active', userId);
                    refresh({ skipSeed: true });
                  }}
                >
                  Zahlung aktualisieren
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-body border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setCancelOpen(true)}
                >
                  Abo beenden
                </Button>
              </div>
            </div>
          )}

          {view === 'canceled' && (
            <div className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50">
                <Info className="h-4 w-4 text-amber-700" />
                <AlertDescription className="font-body text-sm text-amber-950 leading-relaxed">
                  Dein Abo ist gekündigt
                  {sub.cancelSource === 'platform' ? ' (durch elu)' : ''}.
                  {periodEndLabel ? (
                    <>
                      {' '}
                      Bis einschließlich <span className="font-semibold">{periodEndLabel}</span>{' '}
                      gilt noch 0 % Platformabgabe — danach wieder{' '}
                      {formatPlatformFeePercent(PLATFORM_FEE_RATE)}.
                    </>
                  ) : (
                    <> Danach gilt wieder {formatPlatformFeePercent(PLATFORM_FEE_RATE)} Platformabgabe.</>
                  )}
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-heading font-semibold text-text-dark">
                    {getPlanLabel(sub.planId)}
                  </span>
                </div>
                {sub.planId ? <PriceRow planId={sub.planId} cohort={sub.cohort} /> : null}
                {periodEndLabel ? (
                  <div className="flex items-center justify-between gap-3 text-sm font-body">
                    <span className="text-gray-600">Endet am</span>
                    <span className="tabular-nums text-text-dark">{periodEndLabel}</span>
                  </div>
                ) : null}
                {canceledAtLabel ? (
                  <div className="flex items-center justify-between gap-3 text-sm font-body">
                    <span className="text-gray-600">Kündigung eingereicht</span>
                    <span className="tabular-nums text-text-dark">{canceledAtLabel}</span>
                  </div>
                ) : null}
                {sub.cancelReason ? (
                  <div className="flex items-start justify-between gap-3 text-sm font-body pt-1 border-t border-gray-100">
                    <span className="text-gray-600 shrink-0">Grund</span>
                    <span className="text-text-dark text-right">{sub.cancelReason}</span>
                  </div>
                ) : null}
              </div>

              {showPlanPicker ? (
                <ExpertAboWall
                  userId={userId}
                  compact
                  hideHeading
                  title="Account reaktivieren"
                  onActivated={() => refresh({ skipSeed: true })}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs font-body bg-gradient-to-r from-primary-blue to-primary-green text-white"
                    onClick={() => {
                      resumeExpertSubscription(userId);
                      refresh({ skipSeed: true });
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Kündigung zurücknehmen
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-body"
                    onClick={() => setShowPlanPicker(true)}
                  >
                    Account reaktivieren
                  </Button>
                </div>
              )}
            </div>
          )}

          {view === 'active' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-heading font-semibold text-text-dark">
                    {getPlanLabel(sub.planId)}
                  </span>
                </div>
                {sub.planId ? <PriceRow planId={sub.planId} cohort={sub.cohort} /> : null}
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Platformabgabe</span>
                  <span className="font-heading font-semibold text-primary-green">0 %</span>
                </div>
                {periodEndLabel ? (
                  <div className="flex items-center justify-between gap-3 text-sm font-body">
                    <span className="text-gray-600">Nächste Verlängerung</span>
                    <span className="tabular-nums text-text-dark">{periodEndLabel}</span>
                  </div>
                ) : null}
              </div>

              {showPlanPicker ? (
                <ExpertAboWall userId={userId} compact hideHeading onActivated={() => refresh({ skipSeed: true })} />
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-body border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelOpen(true)}
                  >
                    Abo beenden
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-body"
                    onClick={() => setShowPlanPicker(true)}
                  >
                    Plan wechseln
                  </Button>
                </div>
              )}
            </div>
          )}

          {isMock ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-body font-semibold">
                Mock · Abo-Zustände (4 Screens)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['active', 'Aktiv'],
                    ['none', 'Kein Abo'],
                    ['pending', 'Pending'],
                    ['overdue', 'Überfällig'],
                    ['canceled', 'Gekündigt'],
                  ] as const
                ).map(([key, label]) => {
                  const selected =
                    key === 'pending'
                      ? sub.status === 'pending'
                      : key === 'none'
                        ? sub.status === 'none'
                        : key === 'overdue'
                          ? view === 'overdue'
                          : key === 'canceled'
                            ? view === 'canceled'
                            : view === 'active';
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        'h-7 text-[11px] font-body px-2',
                        selected && 'border-primary-blue text-primary-blue'
                      )}
                      onClick={() => applyScenario(key)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 font-body leading-relaxed">
                Kein Abo und Pending teilen dieselbe Layout-Struktur; Pending zeigt den
                Hinweis „Aktivierung ausstehend“.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 gap-5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="font-heading text-xl font-bold text-text-dark">
              Abo beenden?
            </DialogTitle>
            <DialogDescription className="font-body text-gray-500 text-sm leading-relaxed">
              Dein Abo wird zum Periodenende gekündigt – nicht sofort.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-gray-200 bg-bg-light/80 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-primary-blue shrink-0 mt-0.5" />
              <p className="text-sm text-text-dark font-body leading-relaxed">
                {periodEndLabel ? (
                  <>
                    Du behältst vollen Zugang bis einschließlich{' '}
                    <span className="font-semibold">{periodEndLabel}</span>. Danach verlängert
                    sich das Abo nicht mehr.
                  </>
                ) : (
                  <>
                    Du behältst vollen Zugang bis zum Ende der laufenden Periode. Danach
                    verlängert sich das Abo nicht mehr.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Database className="w-4 h-4 text-primary-blue shrink-0 mt-0.5" />
              <p className="text-sm text-text-dark font-body leading-relaxed">
                Deine Profil-, Angebots- und Kundendaten bleiben erhalten – es gehen keine Daten
                verloren.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CalendarCheck className="w-4 h-4 text-primary-blue shrink-0 mt-0.5" />
              <p className="text-sm text-text-dark font-body leading-relaxed">
                Bereits gebuchte, kommende Termine bleiben bestehen und finden wie geplant statt.
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-body leading-relaxed">
            Nach dem Periodenende kannst du keine neuen Buchungen mehr annehmen, bis du das Abo
            wieder aktivierst. Die Kündigung kannst du bis dahin jederzeit zurücknehmen.
          </p>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 font-body w-full sm:w-auto"
              onClick={() => setCancelOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              className="h-10 font-body w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmCancel}
            >
              Abo beenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
