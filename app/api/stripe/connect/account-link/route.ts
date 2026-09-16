import { NextRequest, NextResponse } from 'next/server';
import { getAppOrigin, getStripe, isStripeConfigured } from '@/lib/stripe/server';

/** Single-use Account Link → Stripe-hosted Express onboarding mask. */
export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({
        mock: true,
        url: null,
        message: 'Stripe Keys fehlen – Mock-Maske im Frontend.',
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe nicht konfiguriert' }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      accountId?: string;
      returnPath?: string;
      refreshPath?: string;
    };

    if (!body.accountId) {
      return NextResponse.json({ error: 'accountId fehlt' }, { status: 400 });
    }

    const origin = getAppOrigin(req.url);
    const returnPath = body.returnPath || '/app/expert-profil?tab=konto&stripe=return';
    const refreshPath = body.refreshPath || '/app/expert-profil?tab=konto&stripe=refresh';

    const link = await stripe.accountLinks.create({
      account: body.accountId,
      type: 'account_onboarding',
      return_url: `${origin}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`,
      refresh_url: `${origin}${refreshPath.startsWith('/') ? refreshPath : `/${refreshPath}`}`,
    });

    return NextResponse.json({ url: link.url, mock: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Account Link fehlgeschlagen';
    console.error('[stripe/connect/account-link]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
