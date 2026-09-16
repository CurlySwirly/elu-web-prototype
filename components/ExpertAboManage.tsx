'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, CreditCard, Database, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExpertAboWall } from '@/components/ExpertAboWall';
import {
  cancelExpertSubscription,
  formatPlanPrice,
  getListPriceLabel,
  getPlanLabel,
  getPromoForCohort,
  getSubscriptionStatusLabel,
  hasActiveSubscriptionAccess,
  loadExpertSubscription,
  resumeExpertSubscription,
  type ExpertSubscription,
} from '@/lib/utils/subscription';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { getBackendMode } from '@/lib/backend/mode';
import { ensureMockExpertDemoState } from '@/lib/backend/mock/expert-demo-state';

type ExpertAboManageProps = {
  userId?: string | null;
  className?: string;
};

export function ExpertAboManage({ userId, className }: ExpertAboManageProps) {
  const [sub, setSub] = useState<ExpertSubscription | null>(null);
  const [showWall, setShowWall] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = useCallback(() => {
    if (getBackendMode() === 'mock') {
      ensureMockExpertDemoState(userId);
    }
    const next = loadExpertSubscription(userId);
    setSub(next);
    setShowWall(!hasActiveSubscriptionAccess(next));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!sub) return null;

  const active = hasActiveSubscriptionAccess(sub);
  const periodEndLabel = sub.currentPeriodEnd
    ? format(new Date(sub.currentPeriodEnd), 'd. MMMM yyyy', { locale: de })
    : null;

  const confirmCancel = () => {
    cancelExpertSubscription(userId);
    setCancelOpen(false);
    refresh();
  };

  return (
    <>
      <Card className={`border border-gray-200 shadow-sm ${className || ''}`}>
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 space-y-0">
          <CardTitle className="font-heading text-base sm:text-lg text-text-dark flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-blue shrink-0" />
            dein Abo
          </CardTitle>
          <Badge
            variant="outline"
            className={
              active
                ? 'border-primary-green/40 bg-primary-green/10 text-text-dark font-body'
                : 'border-gray-300 bg-gray-50 text-gray-600 font-body'
            }
          >
            {getSubscriptionStatusLabel(sub)}
          </Badge>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-5 space-y-4">
          {showWall || !active ? (
            <ExpertAboWall
              userId={userId}
              compact
              hideHeading
              onActivated={refresh}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-heading font-semibold text-text-dark">
                    {getPlanLabel(sub.planId)}
                  </span>
                </div>
                {sub.planId && (
                  <div className="flex items-center justify-between gap-3 text-sm font-body">
                    <span className="text-gray-600">Preis</span>
                    <span className="tabular-nums text-text-dark text-right">
                      {formatPlanPrice(sub.planId, sub.cohort)}
                      {getPromoForCohort(sub.cohort) ? (
                        <span className="block text-[11px] text-gray-500">
                          Listenpreis {getListPriceLabel(sub.planId)}
                          {sub.planId === 'yearly' ? '/Jahr' : '/Monat'} · Aktion{' '}
                          {getPromoForCohort(sub.cohort)?.label}
                        </span>
                      ) : (
                        <span className="block text-[11px] text-gray-500">Listenpreis</span>
                      )}
                    </span>
                  </div>
                )}
                {periodEndLabel && (
                  <div className="flex items-center justify-between gap-3 text-sm font-body">
                    <span className="text-gray-600">
                      {sub.cancelAtPeriodEnd ? 'Endet am' : 'Nächste Verlängerung'}
                    </span>
                    <span className="tabular-nums text-text-dark">{periodEndLabel}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {sub.cancelAtPeriodEnd ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-body"
                    onClick={() => {
                      resumeExpertSubscription(userId);
                      refresh();
                    }}
                  >
                    Kündigung zurücknehmen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-body border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelOpen(true)}
                  >
                    Abo beenden
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-body"
                  onClick={() => setShowWall(true)}
                >
                  Plan wechseln
                </Button>
              </div>
            </div>
          )}
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
