'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';

type SettingsState = {
  emailNotifications: boolean;
  analytics: boolean;
  marketingEmail: boolean;
  profileVisible: boolean;
  shareBookingData: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  emailNotifications: true,
  analytics: false,
  marketingEmail: false,
  profileVisible: true,
  shareBookingData: true,
};

function storageKey(userId: string) {
  return `elu-account-settings:${userId}`;
}

function SettingToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <p className="font-body text-sm text-text-dark pr-2">{label}</p>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'data-[state=checked]:bg-primary-blue data-[state=unchecked]:bg-gray-200'
        )}
      />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { userId, signOut } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      }
    } catch {
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  }, [settings, hydrated, userId]);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await signOut();
      router.push('/');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <AppPageShell>
      <AppPageHeader
        title="Einstellungen"
        description="Verwalte deine Account-Einstellungen"
      />

      <Card className="border border-gray-200 shadow-sm max-w-3xl">
        <CardContent className="pt-1 pb-1 px-0 sm:px-0">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="email" className="border-gray-100 px-4 sm:px-5">
              <AccordionTrigger className="hover:no-underline py-4 text-left items-start sm:items-center gap-3">
                <div className="min-w-0 pr-2">
                  <p className="font-heading font-semibold text-sm sm:text-base text-text-dark">
                    E-Mail-Benachrichtigungen
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 font-body font-normal mt-0.5">
                    Erhalte Updates zu deinen Buchungen
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="font-body text-xs sm:text-sm text-gray-600 leading-relaxed mb-3">
                  Wir informieren dich per E-Mail über neue Buchungen, Erinnerungen und Änderungen
                  an deinen Terminen. Du kannst Benachrichtigungen jederzeit aktivieren oder
                  deaktivieren – wichtige Hinweise zum Vertrag können davon unabhängig gesendet
                  werden.
                </p>
                <SettingToggleRow
                  label="E-Mail-Benachrichtigungen"
                  checked={settings.emailNotifications}
                  onCheckedChange={(v) => update('emailNotifications', v)}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy" className="border-gray-100 px-4 sm:px-5">
              <AccordionTrigger className="hover:no-underline py-4 text-left items-start sm:items-center gap-3">
                <div className="min-w-0 pr-2">
                  <p className="font-heading font-semibold text-sm sm:text-base text-text-dark">
                    Datenschutz
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 font-body font-normal mt-0.5">
                    Verwalte deine Datenschutzeinstellungen
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <p className="font-body text-xs sm:text-sm text-gray-600 leading-relaxed mb-3">
                  Lege fest, welche Daten zu Analyse- und Marketingzwecken genutzt werden dürfen
                  und wie sichtbar dein Profil für Expert:innen ist. Du kannst diese Auswahl
                  jederzeit anpassen.
                </p>
                <div className="divide-y divide-gray-50">
                  <SettingToggleRow
                    label="Nutzungsanalyse (anonymisierte Statistik)"
                    checked={settings.analytics}
                    onCheckedChange={(v) => update('analytics', v)}
                  />
                  <SettingToggleRow
                    label="Personalisierte Angebote per E-Mail"
                    checked={settings.marketingEmail}
                    onCheckedChange={(v) => update('marketingEmail', v)}
                  />
                  <SettingToggleRow
                    label="Profil für Expert:innen sichtbar"
                    checked={settings.profileVisible}
                    onCheckedChange={(v) => update('profileVisible', v)}
                  />
                  <SettingToggleRow
                    label="Buchungsdaten mit Expert:in teilen"
                    checked={settings.shareBookingData}
                    onCheckedChange={(v) => update('shareBookingData', v)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4 border-t border-gray-100">
            <div className="min-w-0">
              <p className="font-heading font-semibold text-sm text-text-dark">Account löschen</p>
              <p className="text-xs text-gray-500 font-body mt-0.5">
                Permanente Löschung deines Accounts
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-body h-8 text-xs shrink-0 self-start sm:self-auto text-error-text hover:bg-error-bg border-error-text/40"
              onClick={() => setDeleteOpen(true)}
            >
              Löschen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="font-body w-[calc(100vw-1.5rem)] sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg text-text-dark">
              Account wirklich löschen?
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-gray-500">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden dauerhaft
              entfernt.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-error-text bg-error-bg py-2">
            <AlertCircle className="h-3.5 w-3.5 text-error-text" />
            <AlertDescription className="text-error-text font-body text-xs">
              Offene Termine sollten vorher storniert werden.
            </AlertDescription>
          </Alert>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-body h-9"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              size="sm"
              className="font-body h-9 bg-error-text hover:bg-error-text/90 text-white"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Wird gelöscht…' : 'Account löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPageShell>
  );
}
