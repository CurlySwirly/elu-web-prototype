'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  completeMockStripeConnect,
  getStripeConnectStatusLabel,
  loadStripeConnectStatus,
  saveStripeConnectStatus,
  type StripeConnectStatus,
} from '@/lib/utils/stripe-connect';
import { getBackendMode } from '@/lib/backend/mode';
import { ensureMockExpertDemoState } from '@/lib/backend/mock/expert-demo-state';

type StripeConnectOnboardingProps = {
  userId?: string | null;
  email?: string | null;
  /** Compact for wizard; full card for profile */
  variant?: 'card' | 'embedded';
  className?: string;
  returnPath?: string;
  refreshPath?: string;
  onCompleted?: (status: StripeConnectStatus) => void;
  onSkip?: () => void;
  skipLabel?: string;
};

const INDUSTRIES = [
  { value: 'personal_care', label: 'Persönliche Dienstleistungen / Coaching' },
  { value: 'health_services', label: 'Gesundheitsdienstleistungen' },
  { value: 'professional_services', label: 'Freiberufliche Dienstleistungen' },
  { value: 'education', label: 'Bildung & Beratung' },
  { value: 'other', label: 'Sonstiges' },
] as const;

type MaskStep = 'business' | 'identity' | 'bank' | 'done';

/**
 * Mirrors real elu Payment setup: status check + embedded Stripe Account Onboarding
 * (Business details → identity → payout bank). Live keys → Account Link redirect.
 */
export function StripeConnectOnboarding({
  userId,
  email,
  variant = 'card',
  className,
  returnPath = '/app/expert-profil?tab=konto&stripe=return',
  refreshPath = '/app/expert-profil?tab=konto&stripe=refresh',
  onCompleted,
  onSkip,
  skipLabel = 'Später im Profil',
}: StripeConnectOnboardingProps) {
  const [status, setStatus] = useState<StripeConnectStatus>(() =>
    loadStripeConnectStatus(userId)
  );
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [setupOpen, setSetupOpen] = useState(false);
  const [maskStep, setMaskStep] = useState<MaskStep>('business');
  const [vatNumber, setVatNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [iban, setIban] = useState('');

  const refresh = useCallback(async () => {
    if (getBackendMode() === 'mock') {
      ensureMockExpertDemoState(userId);
    }
    const local = loadStripeConnectStatus(userId);
    setStatus(local);
    if (!local.accountId || local.accountId.startsWith('acct_mock_')) {
      setStatusUnavailable(false);
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(
        `/api/stripe/connect/status?accountId=${encodeURIComponent(local.accountId)}`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatusUnavailable(true);
        return;
      }
      setStatusUnavailable(false);
      const next: StripeConnectStatus = {
        accountId: data.accountId,
        detailsSubmitted: Boolean(data.detailsSubmitted),
        chargesEnabled: Boolean(data.chargesEnabled),
        payoutsEnabled: Boolean(data.payoutsEnabled),
        completed: Boolean(data.completed),
        updatedAt: new Date().toISOString(),
      };
      setStatus(saveStripeConnectStatus(next, userId));
      if (next.completed) onCompleted?.(next);
    } catch {
      setStatusUnavailable(true);
    } finally {
      setChecking(false);
    }
  }, [userId, onCompleted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const stripeFlag = params.get('stripe');
    if (stripeFlag === 'return' || stripeFlag === 'refresh') {
      void refresh();
    }
  }, [refresh]);

  const openStripeSetup = async () => {
    setLoading(true);
    setError('');
    try {
      let accountId = status.accountId;
      const createRes = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          userId: userId || undefined,
          accountId: accountId && !accountId.startsWith('acct_mock_') ? accountId : undefined,
          country: 'AT',
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Account konnte nicht erstellt werden');

      if (createData.mock) {
        setSetupOpen(true);
        setMaskStep('business');
        return;
      }

      accountId = createData.accountId as string;
      saveStripeConnectStatus(
        {
          accountId,
          detailsSubmitted: Boolean(createData.detailsSubmitted),
          chargesEnabled: Boolean(createData.chargesEnabled),
          payoutsEnabled: Boolean(createData.payoutsEnabled),
          completed: Boolean(
            createData.detailsSubmitted &&
              createData.chargesEnabled &&
              createData.payoutsEnabled
          ),
          updatedAt: new Date().toISOString(),
        },
        userId
      );

      const linkRes = await fetch('/api/stripe/connect/account-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, returnPath, refreshPath }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error || 'Onboarding-Link fehlgeschlagen');

      if (linkData.mock || !linkData.url) {
        setSetupOpen(true);
        setMaskStep('business');
        return;
      }

      window.location.href = linkData.url as string;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Stripe-Setup fehlgeschlagen');
      setSetupOpen(true);
      setMaskStep('business');
    } finally {
      setLoading(false);
    }
  };

  const finishMockMask = () => {
    if (!iban.trim()) {
      setError('Bitte IBAN hinterlegen.');
      return;
    }
    const next = completeMockStripeConnect(userId);
    setStatus(next);
    setSetupOpen(false);
    setMaskStep('done');
    setError('');
    setStatusUnavailable(false);
    onCompleted?.(next);
  };

  const body = (
    <div className={cn('space-y-4', className)}>
      {variant === 'embedded' && (
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-bold text-text-dark">Auszahlungen einrichten</h3>
          <p className="text-sm text-gray-600 font-body leading-relaxed">
            Vervollständige deine Auszahlungsdaten sicher über Stripe. elu prüft den Status nach
            dem Setup.
          </p>
        </div>
      )}

      {!status.completed && (
        <Alert className="border-amber-200/80 bg-amber-50/80 py-3">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 w-full">
            <div className="min-w-0 space-y-0.5">
              <AlertTitle className="font-body text-sm font-semibold text-text-dark">
                {statusUnavailable ? 'Zahlungsstatus nicht verfügbar' : 'Auszahlung noch nicht aktiv'}
              </AlertTitle>
              <AlertDescription className="font-body text-xs sm:text-sm text-gray-600 leading-relaxed">
                {statusUnavailable
                  ? 'Status konnte nicht geprüft werden. Du kannst das Stripe-Setup trotzdem öffnen oder erneut prüfen.'
                  : 'Nach dem Setup prüft elu deinen Stripe-Status. Bank- und Identitätsdaten erfasst nur Stripe.'}
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={checking}
              onClick={() => void refresh()}
              className="h-8 shrink-0 font-body text-xs"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', checking && 'animate-spin')} />
              Status prüfen
            </Button>
          </div>
        </Alert>
      )}

      {status.completed ? (
        <div className="rounded-xl border border-primary-green/30 bg-primary-green/10 px-4 py-3 flex items-start gap-3">
          <Check className="w-5 h-5 text-primary-green shrink-0 mt-0.5" />
          <div className="min-w-0 text-sm font-body">
            <p className="font-heading font-semibold text-text-dark">Auszahlungen aktiv</p>
            <p className="text-gray-600 mt-0.5 text-xs">
              {getStripeConnectStatusLabel(status)}
              {status.accountId ? ` · ${status.accountId}` : ''}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 font-body leading-relaxed">
          Stripe erfasst Bank- und Identitätsdaten für dein Konto. Du musst keine
          Zahlungsnachweise bei elu hochladen.
        </p>
      )}

      {error && !setupOpen && (
        <p className="text-sm text-red-600 font-body">{error}</p>
      )}

      {!setupOpen && (
        <div className="flex flex-col sm:flex-row gap-2">
          {!status.completed ? (
            <Button
              type="button"
              onClick={() => void openStripeSetup()}
              disabled={loading}
              className="h-9 font-body text-sm bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Öffne Stripe…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-1.5" />
                  Stripe-Setup öffnen
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => void openStripeSetup()}
              disabled={loading}
              className="h-9 font-body text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Öffne Stripe…
                </>
              ) : (
                'Stripe-Daten aktualisieren'
              )}
            </Button>
          )}
          {onSkip && !status.completed && (
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={loading}
              className="h-9 font-body text-sm"
            >
              {skipLabel}
            </Button>
          )}
        </div>
      )}

      {setupOpen && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold text-text-dark">
                Sicheres Stripe-Setup
              </p>
              <p className="text-xs text-gray-500 font-body mt-0.5 leading-relaxed">
                Stripe kann ein separates Anmeldefenster öffnen. Die abgefragten Felder hängen von
                Konto und Land ab.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 font-body text-xs"
              onClick={() => {
                setSetupOpen(false);
                setError('');
              }}
            >
              Setup schließen
            </Button>
          </div>

          <div className="px-4 py-2 border-b border-amber-100 bg-amber-50/60">
            <p className="text-[11px] font-body text-amber-900/80">
              Demo: Testkonto mit Testdaten (ohne echte Stripe Keys).
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {maskStep === 'business' && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-heading font-semibold text-text-dark">
                    Geschäftsdaten
                  </p>
                  <p className="text-xs text-gray-500 font-body leading-relaxed">
                    Angaben dazu, wie du mit elu Geld verdienst oder einziehst.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">
                    UID / USt-IdNr.{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="h-9 text-sm font-body"
                    placeholder="ATU12345678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Branche</Label>
                  <p className="text-[11px] text-gray-500 font-body leading-snug">
                    Hilft Stripe bei Risiko- und Compliance-Prüfung. Wähle die Option, die am
                    besten zu deinen Leistungen passt.
                  </p>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="h-9 font-body text-sm">
                      <SelectValue placeholder="Branche auswählen…" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                          className="font-body text-sm"
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && <p className="text-sm text-red-600 font-body">{error}</p>}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    className="h-9 font-body text-sm bg-primary-blue hover:bg-primary-blue/90 text-white"
                    onClick={() => {
                      if (!industry) {
                        setError('Bitte eine Branche auswählen.');
                        return;
                      }
                      setError('');
                      setMaskStep('identity');
                    }}
                  >
                    Weiter
                  </Button>
                </div>
              </>
            )}

            {maskStep === 'identity' && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-heading font-semibold text-text-dark">
                    Persönliche Angaben
                  </p>
                  <p className="text-xs text-gray-500 font-body leading-relaxed">
                    Stripe prüft Identität und Berechtigung für Auszahlungen.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Rechtlicher Name</Label>
                  <Input
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="h-9 text-sm font-body"
                    placeholder="Max Mustermann"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">Geburtsdatum</Label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="h-9 text-sm font-body"
                  />
                </div>
                {error && <p className="text-sm text-red-600 font-body">{error}</p>}
                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 font-body text-sm"
                    onClick={() => {
                      setError('');
                      setMaskStep('business');
                    }}
                  >
                    Zurück
                  </Button>
                  <Button
                    type="button"
                    className="h-9 font-body text-sm bg-primary-blue hover:bg-primary-blue/90 text-white"
                    onClick={() => {
                      if (!legalName.trim() || !dob.trim()) {
                        setError('Bitte Name und Geburtsdatum ausfüllen.');
                        return;
                      }
                      setError('');
                      setMaskStep('bank');
                    }}
                  >
                    Weiter
                  </Button>
                </div>
              </>
            )}

            {maskStep === 'bank' && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-heading font-semibold text-text-dark">
                    Auszahlungskonto
                  </p>
                  <p className="text-xs text-gray-500 font-body leading-relaxed">
                    Bankkonto, auf das Stripe deine Einnahmen auszahlt.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-sm">IBAN</Label>
                  <Input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="h-9 text-sm font-body"
                    placeholder="AT61 1904 3002 3457 3201"
                  />
                </div>
                {error && <p className="text-sm text-red-600 font-body">{error}</p>}
                <div className="flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 font-body text-sm"
                    onClick={() => {
                      setError('');
                      setMaskStep('identity');
                    }}
                  >
                    Zurück
                  </Button>
                  <Button
                    type="button"
                    className="h-9 font-body text-sm bg-primary-blue hover:bg-primary-blue/90 text-white"
                    onClick={finishMockMask}
                  >
                    Setup abschließen
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-gray-400 font-body">
              Powered by <span className="font-semibold text-gray-500">stripe</span>
            </p>
            <p className="text-[11px] text-gray-400 font-body">Privacy · Terms · Contact</p>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'embedded') {
    return body;
  }

  return (
    <Card className={cn('border border-gray-200 shadow-sm', className)}>
      <CardHeader className="px-4 sm:px-5 pt-4 pb-2">
        <CardTitle className="font-heading text-base sm:text-lg text-text-dark flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary-blue" />
          Auszahlungen einrichten
        </CardTitle>
        <CardDescription className="font-body text-xs sm:text-sm">
          Vervollständige deine Auszahlungsdaten sicher über Stripe. elu prüft den Status nach dem
          Setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-5 pb-5">{body}</CardContent>
    </Card>
  );
}
