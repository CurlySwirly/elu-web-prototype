'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, ChevronDown, Download, FileText, ListFilter } from 'lucide-react';
import { addMinutes, format, parseISO, getYear, getMonth } from 'date-fns';
import { de } from 'date-fns/locale';
import { AppPageHeader, AppPageShell } from '@/components/AppPageHeader';
import { FinanceOverviewChart } from '@/components/FinanceOverviewChart';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import type { InvoiceData } from '@/lib/utils/invoice';
import {
  PLATFORM_FEE_RATE,
  VAT_RATE,
  getSessionPriceBreakdown,
} from '@/lib/utils/pricing';
import { cn } from '@/lib/utils';
import { mockExpertFinanceTransactions } from '@/lib/backend/mock/finance-data';

type HistoryStatusFilter = 'all' | 'pending' | 'paid';

interface Transaction {
  id: string;
  client_name: string;
  offer_title: string;
  amount: number;
  status: string;
  date: string;
}

const MONTH_LABELS = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sep.',
  'Okt.',
  'Nov.',
  'Dez.',
];

const MONTH_TITLE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

function netAmount(gross: number) {
  return getSessionPriceBreakdown(gross).expertPayout;
}

function feeAmount(gross: number) {
  return getSessionPriceBreakdown(gross).platformFeeGross;
}

function formatEuroDe(amount: number) {
  return amount.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

const INITIAL_TRANSACTIONS: Transaction[] = mockExpertFinanceTransactions.map((t) => ({
  id: t.id,
  client_name: t.client_name,
  offer_title: t.offer_title,
  amount: t.amount,
  status: t.status,
  date: t.date,
}));

export default function FinancesPage() {
  const { user } = useAuth();
  const [transactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [historyYear, setHistoryYear] = useState('2026');
  const [historyStatus, setHistoryStatus] = useState<HistoryStatusFilter>('all');
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(4); // Mai – mixed demo
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach((t) => {
      try {
        years.add(getYear(parseISO(t.date)));
      } catch {
        /* ignore */
      }
    });
    years.add(2026);
    years.add(2025);
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  useEffect(() => {
    if (availableYears.length && !availableYears.includes(Number(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (availableYears.length && !availableYears.includes(Number(historyYear))) {
      setHistoryYear(String(availableYears[0]));
    }
  }, [availableYears, historyYear]);

  const year = Number(selectedYear);
  const historyYearNum = Number(historyYear);

  const yearTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        try {
          return getYear(parseISO(t.date)) === year;
        } catch {
          return false;
        }
      }),
    [transactions, year]
  );

  const chartData = useMemo(() => {
    return MONTH_LABELS.map((label, monthIndex) => {
      const monthTx = yearTransactions.filter((t) => getMonth(parseISO(t.date)) === monthIndex);
      const paid = monthTx
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + netAmount(t.amount), 0);
      const expected = monthTx
        .filter((t) => t.status === 'confirmed')
        .reduce((sum, t) => sum + netAmount(t.amount), 0);
      return {
        month: label,
        paid: Math.round(paid * 100) / 100,
        expected: Math.round(expected * 100) / 100,
      };
    });
  }, [yearTransactions]);

  // When year changes, pick the latest month that has activity
  useEffect(() => {
    const withData = chartData
      .map((row, i) => ({ i, total: row.paid + row.expected }))
      .filter((r) => r.total > 0);
    if (withData.length === 0) return;
    const last = withData[withData.length - 1].i;
    setSelectedMonthIndex((prev) =>
      chartData[prev] && chartData[prev].paid + chartData[prev].expected > 0 ? prev : last
    );
  }, [year, chartData]);

  const monthTransactions = useMemo(
    () => yearTransactions.filter((t) => getMonth(parseISO(t.date)) === selectedMonthIndex),
    [yearTransactions, selectedMonthIndex]
  );

  const monthSummary = useMemo(() => {
    const paidGross = monthTransactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingGross = monthTransactions
      .filter((t) => t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0);
    const paidNet = monthTransactions
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + netAmount(t.amount), 0);
    const pendingNet = monthTransactions
      .filter((t) => t.status === 'confirmed')
      .reduce((sum, t) => sum + netAmount(t.amount), 0);
    const serviceGross = paidGross + pendingGross;
    // Demo: Expert:innen nutzen die Kleinunternehmerregelung → keine USt auf den Servicepreis
    const vatApplies = false;
    const serviceVat = vatApplies
      ? Math.round((serviceGross - serviceGross / (1 + VAT_RATE)) * 100) / 100
      : 0;
    const serviceNet = vatApplies
      ? Math.round((serviceGross - serviceVat) * 100) / 100
      : Math.round(serviceGross * 100) / 100;
    const platformFee = monthTransactions.reduce((sum, t) => sum + feeAmount(t.amount), 0);
    const payout = paidNet + pendingNet;
    return {
      paidNet: Math.round(paidNet * 100) / 100,
      pendingNet: Math.round(pendingNet * 100) / 100,
      totalNet: Math.round(payout * 100) / 100,
      serviceNet,
      serviceVat: Math.round(serviceVat * 100) / 100,
      serviceGross: Math.round(serviceGross * 100) / 100,
      vatApplies,
      platformFee: Math.round(platformFee * 100) / 100,
      payout: Math.round(payout * 100) / 100,
    };
  }, [monthTransactions]);

  const offerBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    yearTransactions
      .filter((t) => t.status === 'completed')
      .forEach((t) => {
        map.set(t.offer_title, (map.get(t.offer_title) || 0) + netAmount(t.amount));
      });
    const rows = Array.from(map.entries())
      .map(([title, net]) => ({ title, net: Math.round(net * 100) / 100 }))
      .sort((a, b) => b.net - a.net);
    const total = Math.round(rows.reduce((sum, r) => sum + r.net, 0) * 100) / 100;
    if (total <= 0) {
      return {
        total: null as null | { net: number; dividers: number[] },
        offers: [] as { title: string; net: number; pct: number }[],
      };
    }
    const dividers: number[] = [];
    let acc = 0;
    rows.slice(0, -1).forEach((r) => {
      acc += (r.net / total) * 100;
      dividers.push(acc);
    });
    return {
      total: { net: total, dividers },
      offers: rows.map((r) => ({
        title: r.title,
        net: r.net,
        pct: Math.max(4, (r.net / total) * 100),
      })),
    };
  }, [yearTransactions]);

  const history = useMemo(
    () =>
      transactions
        .filter((t) => {
          try {
            if (getYear(parseISO(t.date)) !== historyYearNum) return false;
          } catch {
            return false;
          }
          if (historyStatus === 'paid') return t.status === 'completed';
          if (historyStatus === 'pending') return t.status === 'confirmed';
          return true;
        })
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
    [transactions, historyYearNum, historyStatus]
  );

  const historyFilterActive = historyStatus !== 'all';

  const handlePdfDownload = () => {
    const rows = history
      .map((t) => {
        const status = t.status === 'completed' ? 'Ausbezahlt' : 'Erwartet';
        return `<tr>
          <td>${format(parseISO(t.date), 'd. MMMM yyyy, HH:mm', { locale: de })} Uhr</td>
          <td>${t.offer_title}</td>
          <td>${t.client_name}</td>
          <td>${status}</td>
          <td style="text-align:right">${formatEuroDe(netAmount(t.amount))}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"/><title>Zahlungshistorie ${historyYearNum}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:32px;color:#292B27}
  h1{font-size:22px;margin:0 0 4px}
  p{color:#666;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
  th,td{padding:10px 8px;border-bottom:1px solid #eee;text-align:left}
  th{font-size:11px;text-transform:uppercase;color:#888}
</style></head><body>
  <h1>Zahlungshistorie ${historyYearNum}</h1>
  <p>Netto-Auszahlungen nach Abzug der Vermittlungsprovision (${Math.round(PLATFORM_FEE_RATE * 100)}&nbsp;%)</p>
  <table>
    <thead><tr><th>Datum</th><th>Angebot</th><th>Klient:in</th><th>Status</th><th>Betrag</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elu-zahlungshistorie-${historyYearNum}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const monthTitle = `${MONTH_TITLE[selectedMonthIndex]} ${year}`;

  const openInvoice = (t: Transaction) => {
    const start = parseISO(t.date);
    const end = addMinutes(start, 60);
    setInvoiceData({
      appointmentId: t.id,
      offerTitle: t.offer_title,
      sessionStart: start.toISOString(),
      sessionEnd: end.toISOString(),
      totalPrice: t.amount,
      expertName: user?.fullName || 'Expert:in',
      clientName: t.client_name,
      formatLabel: t.offer_title.toLowerCase().includes('online') ? 'Online' : 'Vor Ort',
    });
    setInvoiceOpen(true);
  };

  return (
    <AppPageShell>
      <AppPageHeader
        title="Finanzen"
        description="Auszahlung (Netto) nach Abzug der Vermittlungsprovision"
      />

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
              Übersicht
            </CardTitle>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9 font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)} className="font-body">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-2 sm:px-4 pb-4">
          <FinanceOverviewChart
            data={chartData}
            selectedMonthIndex={selectedMonthIndex}
            onSelectMonth={setSelectedMonthIndex}
          />
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="px-4 sm:px-5 py-5 space-y-5">
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-text-dark">
              {monthTitle}
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
              <div>
                <p className="text-xl sm:text-2xl font-heading font-bold text-text-dark tabular-nums">
                  {formatEuroDe(monthSummary.paidNet)}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-body text-text-dark">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary-green shrink-0" />
                  Ausgezahlt
                </p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-heading font-bold text-text-dark tabular-nums">
                  {formatEuroDe(monthSummary.pendingNet)}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-body text-text-dark">
                  <span className="inline-block w-2 h-2 rounded-full border-2 border-gray-400 shrink-0" />
                  Anstehend
                </p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-heading font-bold text-text-dark tabular-nums">
                  {formatEuroDe(monthSummary.totalNet)}
                </p>
                <p className="mt-1.5 text-sm font-body text-gray-500">Gesamtbetrag (EUR)</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={() => setBreakdownOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
              aria-expanded={breakdownOpen}
            >
              <span className="font-heading font-semibold text-sm sm:text-base text-text-dark">
                Aufschlüsselung der Zahlung
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-500 shrink-0 transition-transform',
                  breakdownOpen && 'rotate-180'
                )}
              />
            </button>
            {breakdownOpen && (
              <div className="pb-1 space-y-0">
                <div className="flex items-center justify-between gap-4 py-2.5 text-sm font-body">
                  <span className="text-text-dark">Servicepreis netto</span>
                  <span className="tabular-nums text-text-dark shrink-0">
                    {formatEuroDe(monthSummary.serviceNet)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 py-2.5 text-sm font-body">
                  <div className="min-w-0">
                    <p className="text-text-dark">Umsatzsteuer</p>
                    {!monthSummary.vatApplies && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                        Kleinunternehmerregelung, §&nbsp;6 Abs.&nbsp;1 Z&nbsp;27 UStG
                      </p>
                    )}
                  </div>
                  <span className="tabular-nums text-text-dark shrink-0 pt-0.5">
                    {monthSummary.vatApplies
                      ? formatEuroDe(monthSummary.serviceVat)
                      : formatEuroDe(0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5 text-sm font-body">
                  <span className="text-text-dark">Servicepreis brutto</span>
                  <span className="tabular-nums text-text-dark shrink-0">
                    {formatEuroDe(monthSummary.serviceGross)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2.5 text-sm font-body">
                  <span className="text-text-dark">
                    Plattformabgabe ({Math.round(PLATFORM_FEE_RATE * 100)}&nbsp;%)
                  </span>
                  <span className="tabular-nums text-text-dark shrink-0">
                    −{formatEuroDe(monthSummary.platformFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 py-3 mt-1 border-t border-gray-200 text-sm font-body">
                  <span className="font-heading font-semibold text-text-dark">
                    Deine Auszahlung
                  </span>
                  <span className="font-heading font-semibold tabular-nums text-text-dark shrink-0">
                    {formatEuroDe(monthSummary.payout)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-2 space-y-1">
          <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
            Einnahmen nach Angebot
          </CardTitle>
          <CardDescription className="font-body text-xs sm:text-sm">
            {selectedYear} · ausgezahlte Netto-Einnahmen, Anteile relativ zur Gesamtsumme
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 space-y-3.5">
          {!offerBreakdown.total ? (
            <p className="text-sm text-gray-500 font-body py-4 text-center">
              Noch keine ausgezahlten Einnahmen in diesem Jahr
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-heading font-semibold text-text-dark truncate min-w-0">
                    Einnahmen gesamt
                  </p>
                  <p className="text-sm font-heading font-bold text-text-dark tabular-nums shrink-0">
                    {formatEuroDe(offerBreakdown.total.net)}
                  </p>
                </div>
                <div className="relative h-3 rounded-full bg-primary-blue overflow-hidden">
                  {offerBreakdown.total.dividers.map((left) => (
                    <div
                      key={left}
                      className="absolute top-0 bottom-0 w-0.5 bg-white/90"
                      style={{ left: `${left}%` }}
                      aria-hidden
                    />
                  ))}
                </div>
              </div>
              {offerBreakdown.offers.map((row) => (
                <div key={row.title} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-body text-text-dark truncate min-w-0">{row.title}</p>
                    <p className="text-sm font-heading font-semibold text-text-dark tabular-nums shrink-0">
                      {formatEuroDe(row.net)}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-blue"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="font-heading text-base sm:text-lg text-text-dark">
              Zahlungshistorie
            </CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Popover open={historyFilterOpen} onOpenChange={setHistoryFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-8 w-8 relative',
                    historyFilterActive && 'border-primary-blue text-primary-blue'
                  )}
                  aria-label="Zahlungshistorie filtern"
                >
                  <ListFilter className="w-4 h-4" />
                  {historyFilterActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-blue" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 space-y-3">
                <p className="font-heading font-semibold text-sm text-text-dark">Filter</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-body text-gray-500">Jahr</label>
                  <Select value={historyYear} onValueChange={setHistoryYear}>
                    <SelectTrigger className="h-9 font-body text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={String(y)} className="font-body">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-body text-gray-500">Status</p>
                  <div className="flex flex-col gap-1">
                    {(
                      [
                        { id: 'all', label: 'Alle' },
                        { id: 'pending', label: 'Ausstehend' },
                        { id: 'paid', label: 'Ausgezahlt' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setHistoryStatus(opt.id)}
                        className={cn(
                          'w-full text-left px-2.5 py-2 rounded-md text-sm font-body transition-colors',
                          historyStatus === opt.id
                            ? 'bg-primary-blue/10 text-text-dark font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 font-body text-xs"
              onClick={handlePdfDownload}
              disabled={history.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              PDF Download
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4">
          {history.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-body">
                Keine Zahlungen für die aktuellen Filter
              </p>
            </div>
          ) : (
            <div className="max-h-[360px] sm:max-h-[420px] overflow-y-auto overscroll-contain pr-1 -mr-1 space-y-2">
              {history.map((t) => {
                const isPaid = t.status === 'completed';
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        isPaid ? 'bg-primary-green/30' : 'bg-gray-100'
                      )}
                    >
                      <CheckCircle2
                        className={cn('w-4 h-4', isPaid ? 'text-text-dark' : 'text-gray-400')}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <p className="font-heading font-semibold text-sm text-text-dark truncate">
                          {t.offer_title}
                        </p>
                        <Badge className="bg-info-bg text-info-text border-none font-body text-[10px] px-2 py-0 shrink-0">
                          {isPaid ? 'Ausbezahlt' : 'Erwartet'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-body truncate mt-0.5">
                        mit {t.client_name}
                      </p>
                      <p className="text-xs text-gray-400 font-body mt-0.5">
                        {format(parseISO(t.date), 'd. MMMM yyyy, HH:mm', { locale: de })} Uhr
                      </p>
                      {isPaid && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-0 mt-1 font-body text-xs text-primary-blue hover:text-primary-blue hover:bg-transparent"
                          onClick={() => openInvoice(t)}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Rechnung einsehen
                        </Button>
                      )}
                    </div>
                    <div className="text-right shrink-0 self-start pt-0.5">
                      <p className="font-heading font-bold text-sm sm:text-base text-text-dark tabular-nums">
                        {formatEuroDe(netAmount(t.amount))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        invoice={invoiceData}
      />
    </AppPageShell>
  );
}

