/** Rich finance demo for expert Finanzen page */

import { splitGrossByVatRate, type AtVatRate } from '@/lib/utils/pricing';

export type MockFinanceBookingStatus =
  | 'COMPLETED'
  | 'CONFIRMED'
  | 'REFUNDED'
  | 'REFUNDED_CLAWBACK';

export type MockFinanceTransaction = {
  id: string;
  client_name: string;
  offer_title: string;
  /** Gross session price (backend: gros amount) */
  amount: number;
  /** Net session price (backend: netto) */
  net_amount: number;
  /** VAT rate 0–1 (backend: mwst satz) */
  vat_rate: AtVatRate;
  /** Actual VAT in cents (backend: service vat amount) */
  vat_amount_cents: number;
  status: 'completed' | 'confirmed';
  date: string;
  booking_status?: MockFinanceBookingStatus;
  payout_date?: string;
  clawback_date?: string;
};

type MockFinanceSeed = Omit<
  MockFinanceTransaction,
  'net_amount' | 'vat_rate' | 'vat_amount_cents'
> & { vat_rate?: AtVatRate };

function financeDate(year: number, monthIndex: number, day: number, hour = 11) {
  return new Date(year, monthIndex, day, hour, 0, 0).toISOString();
}

/** Demo: 0 % (z. B. Physio) oder 20 % (z. B. Coaching). */
function vatRateForOffer(offerTitle: string): AtVatRate {
  if (
    offerTitle.includes('Manuelle') ||
    offerTitle.includes('Behandlung') ||
    offerTitle.toLowerCase().includes('massage') ||
    offerTitle.toLowerCase().includes('physio')
  ) {
    return 0;
  }
  return 0.2;
}

function withBookingVat(seed: MockFinanceSeed): MockFinanceTransaction {
  const vatRate = seed.vat_rate ?? vatRateForOffer(seed.offer_title);
  const split = splitGrossByVatRate(seed.amount, vatRate);
  return {
    ...seed,
    amount: split.gross,
    net_amount: split.net,
    vat_rate: vatRate,
    vat_amount_cents: Math.round(split.vat * 100),
  };
}

const financeYear = 2026;

const financeSeeds: MockFinanceSeed[] = [
  {
    id: 'fin-mar-1',
    client_name: 'Anna Schmidt',
    offer_title: 'Erstberatung & Analyse',
    amount: 85,
    status: 'completed',
    booking_status: 'COMPLETED',
    payout_date: financeDate(financeYear, 2, 12),
    date: financeDate(financeYear, 2, 5),
  },
  {
    id: 'fin-mar-2',
    client_name: 'Jonas Berger',
    offer_title: 'Manuelle Therapie',
    amount: 70,
    status: 'completed',
    booking_status: 'COMPLETED',
    payout_date: financeDate(financeYear, 2, 19),
    date: financeDate(financeYear, 2, 12),
  },
  {
    id: 'fin-mar-3',
    client_name: 'Lisa König',
    offer_title: 'Behandlungssession',
    amount: 75,
    status: 'completed',
    booking_status: 'COMPLETED',
    payout_date: financeDate(financeYear, 2, 25),
    date: financeDate(financeYear, 2, 18),
  },
  {
    id: 'fin-mar-4',
    client_name: 'Tom Weber',
    offer_title: 'Online Beratung',
    amount: 50,
    status: 'completed',
    booking_status: 'COMPLETED',
    payout_date: financeDate(financeYear, 3, 2),
    date: financeDate(financeYear, 2, 25),
  },
  {
    id: 'fin-mar-5',
    client_name: 'Max Mustermann',
    offer_title: 'Manuelle Therapie',
    amount: 70,
    status: 'completed',
    booking_status: 'COMPLETED',
    payout_date: financeDate(financeYear, 3, 5),
    date: financeDate(financeYear, 2, 28),
  },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `fin-apr-${i + 1}`,
    client_name: ['Max Mustermann', 'Anna Schmidt', 'Tom Weber', 'Lisa König', 'Jonas Berger'][
      i % 5
    ],
    offer_title: [
      'Erstberatung & Analyse',
      'Manuelle Therapie',
      'Behandlungssession',
      'Online Beratung',
      'Erstberatung & Analyse',
    ][i % 5],
    amount: [85, 70, 75, 50, 85][i % 5],
    status: 'completed' as const,
    booking_status: 'COMPLETED' as const,
    payout_date: financeDate(financeYear, 3, 9 + i * 2, 10 + (i % 4)),
    date: financeDate(financeYear, 3, 2 + i * 2, 10 + (i % 4)),
  })),
  {
    id: 'fin-apr-max',
    client_name: 'Max Mustermann',
    offer_title: 'Erstberatung & Analyse',
    amount: 85,
    status: 'completed',
    booking_status: 'COMPLETED',
    payout_date: financeDate(financeYear, 4, 2),
    date: financeDate(financeYear, 3, 28, 11),
  },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `fin-may-${i + 1}`,
    client_name: ['Anna Schmidt', 'Tom Weber', 'Lisa König', 'Max Mustermann'][i % 4],
    offer_title: [
      'Erstberatung & Analyse',
      'Manuelle Therapie',
      'Behandlungssession',
      'Online Beratung',
    ][i % 4],
    amount: [85, 70, 75, 50][i % 4],
    status: (i < 4 ? 'completed' : 'confirmed') as 'completed' | 'confirmed',
    booking_status: (i < 4 ? 'COMPLETED' : 'CONFIRMED') as MockFinanceBookingStatus,
    payout_date: i < 4 ? financeDate(financeYear, 4, 11 + i * 3) : undefined,
    date: financeDate(financeYear, 4, 4 + i * 3),
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `fin-jun-${i + 1}`,
    client_name: ['Jonas Berger', 'Anna Schmidt', 'Max Mustermann'][i % 3],
    offer_title: ['Manuelle Therapie', 'Erstberatung & Analyse', 'Behandlungssession'][i % 3],
    amount: [70, 85, 75][i % 3],
    status: 'confirmed' as const,
    booking_status: 'CONFIRMED' as const,
    date: financeDate(financeYear, 5, 3 + i * 4),
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `fin-jul-${i + 1}`,
    client_name: ['Lisa König', 'Tom Weber'][i % 2],
    offer_title: ['Online Beratung', 'Erstberatung & Analyse'][i % 2],
    amount: [50, 85][i % 2],
    status: 'confirmed' as const,
    booking_status: 'CONFIRMED' as const,
    date: financeDate(financeYear, 6, 5 + i * 5),
  })),
  {
    id: 'fin-clawback-1',
    client_name: 'Sophie Meier',
    offer_title: 'Manuelle Therapie',
    amount: 70,
    status: 'completed',
    booking_status: 'REFUNDED_CLAWBACK',
    payout_date: financeDate(financeYear, 3, 8),
    clawback_date: financeDate(financeYear, 3, 14, 15),
    date: financeDate(financeYear, 3, 4, 10),
  },
  {
    id: 'fin-clawback-2',
    client_name: 'Erik Hoffmann',
    offer_title: 'Erstberatung & Analyse',
    amount: 85,
    status: 'completed',
    booking_status: 'REFUNDED_CLAWBACK',
    payout_date: financeDate(financeYear, 4, 10),
    clawback_date: financeDate(financeYear, 4, 18, 9),
    date: financeDate(financeYear, 4, 6, 14),
  },
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `fin-2025-${i + 1}`,
    client_name: ['Anna Schmidt', 'Max Mustermann', 'Tom Weber', 'Lisa König', 'Jonas Berger'][
      i % 5
    ],
    offer_title: [
      'Erstberatung & Analyse',
      'Manuelle Therapie',
      'Behandlungssession',
      'Online Beratung',
      'Manuelle Therapie',
    ][i % 5],
    amount: [85, 70, 75, 50, 70][i % 5],
    status: 'completed' as const,
    booking_status: 'COMPLETED' as const,
    payout_date: financeDate(2025, 8 + Math.floor(i / 3), 11 + (i % 3) * 8),
    date: financeDate(2025, 8 + Math.floor(i / 3), 4 + (i % 3) * 8),
  })),
];

export const mockExpertFinanceTransactions: MockFinanceTransaction[] =
  financeSeeds.map(withBookingVat);
