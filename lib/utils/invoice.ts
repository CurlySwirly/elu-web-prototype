import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { formatEuro } from '@/lib/utils/pricing';

export type InvoiceData = {
  appointmentId: string;
  offerTitle: string;
  sessionStart: string;
  sessionEnd: string;
  totalPrice: number;
  expertName: string;
  expertAddress?: string;
  clientName: string;
  formatLabel: string;
};

export function getInvoiceNumber(appointmentId: string) {
  const short = appointmentId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `ELU-${short || '00000000'}`;
}

export function buildInvoiceHtml(data: InvoiceData) {
  const invoiceNumber = getInvoiceNumber(data.appointmentId);
  const issuedOn = format(parseISO(data.sessionEnd), 'd. MMMM yyyy', { locale: de });
  const sessionDate = format(parseISO(data.sessionStart), 'd. MMMM yyyy', { locale: de });
  const sessionTime = `${format(parseISO(data.sessionStart), 'HH:mm')} – ${format(parseISO(data.sessionEnd), 'HH:mm')} Uhr`;
  const amount = formatEuro(data.totalPrice);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Rechnung ${invoiceNumber}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 40px; background: #fff; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    .muted { color: #666; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 32px; margin: 28px 0; }
    .box h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; margin: 0 0 8px; font-family: system-ui, sans-serif; }
    .box p { margin: 0; line-height: 1.45; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; font-family: system-ui, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #888; border-bottom: 1px solid #ddd; padding: 8px 0; }
    td { padding: 14px 0; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
    td.amount, th.amount { text-align: right; }
    .total { margin-top: 20px; display: flex; justify-content: flex-end; gap: 24px; font-size: 16px; }
    .total strong { font-size: 18px; }
    .footer { margin-top: 40px; font-size: 12px; color: #888; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <h1>Rechnung</h1>
  <p class="muted">${invoiceNumber} · ausgestellt am ${issuedOn}</p>

  <div class="row">
    <div class="box">
      <h2>Von</h2>
      <p><strong>${escapeHtml(data.expertName)}</strong></p>
      ${data.expertAddress ? `<p>${escapeHtml(data.expertAddress)}</p>` : ''}
      <p>über elu</p>
    </div>
    <div class="box">
      <h2>An</h2>
      <p><strong>${escapeHtml(data.clientName)}</strong></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Leistung</th>
        <th class="amount">Betrag</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${escapeHtml(data.offerTitle)}</strong><br />
          <span class="muted">${sessionDate} · ${sessionTime} · ${escapeHtml(data.formatLabel)}</span>
        </td>
        <td class="amount">${amount}</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    <span>Gesamtbetrag</span>
    <strong>${amount}</strong>
  </div>

  <p class="footer">
    Diese Rechnung wurde über elu für die durchgeführte Session ausgestellt.
    Zahlung erfolgte über die elu-Plattform.
  </p>
</body>
</html>`;
}

export function downloadInvoice(data: InvoiceData) {
  const html = buildInvoiceHtml(data);
  const invoiceNumber = getInvoiceNumber(data.appointmentId);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rechnung-${invoiceNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
