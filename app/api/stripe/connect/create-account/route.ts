import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from '@/lib/stripe/server';

/**
 * Create (or reuse) an Express connected account.
 * Configures Stripe as losses collector when the API supports controller params
 * — required so Stripe (not elu) covers connected-account negative balances.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({
        mock: true,
        message: 'Stripe Keys fehlen – Mock-Onboarding im Frontend nutzen.',
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      userId?: string;
      accountId?: string;
      country?: string;
    };

    if (body.accountId) {
      const existing = await stripe.accounts.retrieve(body.accountId);
      return NextResponse.json({
        accountId: existing.id,
        detailsSubmitted: Boolean(existing.details_submitted),
        chargesEnabled: Boolean(existing.charges_enabled),
        payoutsEnabled: Boolean(existing.payouts_enabled),
      });
    }

    const baseParams: Stripe.AccountCreateParams = {
      type: 'express',
      country: body.country || 'AT',
      email: body.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        elu_user_id: body.userId || '',
        elu_role: 'expert',
      },
    };

    let account: Stripe.Account;
    try {
      account = await stripe.accounts.create({
        ...baseParams,
        controller: {
          losses: { payments: 'stripe' },
          fees: { payer: 'account' },
          stripe_dashboard: { type: 'express' },
          requirement_collection: 'stripe',
        },
      } as Stripe.AccountCreateParams);
    } catch (controllerErr) {
      console.warn(
        '[stripe/connect] controller params rejected, falling back to classic Express:',
        controllerErr
      );
      account = await stripe.accounts.create(baseParams);
    }

    return NextResponse.json({
      accountId: account.id,
      detailsSubmitted: Boolean(account.details_submitted),
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Account-Erstellung fehlgeschlagen';
    console.error('[stripe/connect/create-account]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
