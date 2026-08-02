'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatEuro } from '@/lib/utils/pricing';
import {
  downloadInvoice,
  getInvoiceNumber,
  type InvoiceData,
} from '@/lib/utils/invoice';

type InvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
};

export function InvoiceDialog({ open, onOpenChange, invoice }: InvoiceDialogProps) {
  if (!invoice) return null;

  const invoiceNumber = getInvoiceNumber(invoice.appointmentId);
  const issuedOn = format(parseISO(invoice.sessionEnd), 'd. MMMM yyyy', { locale: de });
  const sessionDate = format(parseISO(invoice.sessionStart), 'd. MMMM yyyy', {
    locale: de,
  });
  const sessionTime = `${format(parseISO(invoice.sessionStart), 'HH:mm')} – ${format(
    parseISO(invoice.sessionEnd),
    'HH:mm'
  )} Uhr`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 space-y-1">
          <DialogTitle className="font-heading text-xl text-text-dark">Rechnung</DialogTitle>
          <DialogDescription className="font-body text-xs text-gray-500">
            {invoiceNumber} · ausgestellt am {issuedOn}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-body mb-1">
                Von
              </p>
              <p className="font-heading font-semibold text-sm text-text-dark leading-snug">
                {invoice.expertName}
              </p>
              {invoice.expertAddress ? (
                <p className="text-xs text-gray-500 font-body mt-0.5 leading-snug">
                  {invoice.expertAddress}
                </p>
              ) : null}
              <p className="text-xs text-gray-400 font-body mt-0.5">über elu</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-400 font-body mb-1">
                An
              </p>
              <p className="font-heading font-semibold text-sm text-text-dark leading-snug">
                {invoice.clientName}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-3.5 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <p className="font-heading font-semibold text-sm text-text-dark leading-snug">
                  {invoice.offerTitle}
                </p>
                <p className="text-xs text-gray-500 font-body mt-1 leading-relaxed">
                  {sessionDate}
                  <br />
                  {sessionTime}
                  <br />
                  {invoice.formatLabel}
                </p>
              </div>
              <p className="text-sm font-heading font-semibold text-text-dark tabular-nums shrink-0">
                {formatEuro(invoice.totalPrice)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-bg-light/80">
              <span className="text-sm font-heading font-semibold text-text-dark">
                Gesamtbetrag
              </span>
              <span className="text-sm font-heading font-semibold text-text-dark tabular-nums">
                {formatEuro(invoice.totalPrice)}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 font-body leading-relaxed">
            Diese Rechnung wurde von der Expert:in über elu an die Klient:in gesendet. Die
            Zahlung erfolgte über die Plattform.
          </p>

          <Button
            type="button"
            className="w-full h-10 font-body rounded-lg bg-gradient-to-r from-primary-blue to-primary-green text-white hover:opacity-90"
            onClick={() => downloadInvoice(invoice)}
          >
            <Download className="w-4 h-4 mr-2" />
            Rechnung herunterladen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
