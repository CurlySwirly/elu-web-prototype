import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getAppOrigin(requestUrl?: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      /* ignore */
    }
  }
  return 'http://127.0.0.1:3000';
}
