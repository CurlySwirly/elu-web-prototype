'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  return (
    <Card className={`border border-gray-200 shadow-sm ${className || ''}`}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
        <div className="min-w-0">
          <CardTitle className="font-heading text-base sm:text-lg text-text-dark flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-blue shrink-0" />
            elu Abo
          </CardTitle>
          <CardDescription className="font-body text-xs sm:text-sm mt-1 max-w-xl">
            Verwalte deinen Plan und die Verlängerung.
          </CardDescription>
        </div>
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
            title="Abo aktivieren"
            description="Aktiviere dein Abo, um Angebote anzulegen und buchbar zu sein."
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
              {sub.currentPeriodEnd && (
                <div className="flex items-center justify-between gap-3 text-sm font-body">
                  <span className="text-gray-600">
                    {sub.cancelAtPeriodEnd ? 'Endet am' : 'Nächste Verlängerung'}
                  </span>
                  <span className="tabular-nums text-text-dark">
                    {format(new Date(sub.currentPeriodEnd), 'd. MMMM yyyy', { locale: de })}
                  </span>
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
                  className="h-8 text-xs font-body"
                  onClick={() => {
                    cancelExpertSubscription(userId);
                    refresh();
                  }}
                >
                  Zum Periodenende kündigen
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs font-body text-gray-600"
                onClick={() => setShowWall(true)}
              >
                Plan wechseln
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
