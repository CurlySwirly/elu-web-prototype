import { NextRequest, NextResponse } from 'next/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId fehlt' }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({
        mock: true,
        accountId,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        completed: false,
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 });
    }

    const account = await stripe.accounts.retrieve(accountId);
    const completed = Boolean(
      account.details_submitted && account.charges_enabled && account.payouts_enabled
    );

    return NextResponse.json({
      accountId: account.id,
      detailsSubmitted: Boolean(account.details_submitted),
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      completed,
      mock: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Status-Abfrage fehlgeschlagen';
    console.error('[stripe/connect/status]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
