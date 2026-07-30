import type { IBackendClient } from './types';

type BackendMode = 'supabase' | 'mock' | 'custom';

function resolveBackendMode(): BackendMode {
  const configured = (process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase') as BackendMode;
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Avoid build/runtime crashes when Vercel has no Supabase env vars yet
  if (configured === 'supabase' && !hasSupabase) {
    return 'mock';
  }

  return configured;
}

const BACKEND_MODE = resolveBackendMode();

function createBackendClient(): IBackendClient {
  if (BACKEND_MODE === 'mock') {
    // Lazy require keeps Supabase out of the mock login path
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MockBackendClient } = require('./mock/client') as typeof import('./mock/client');
    if (typeof window !== 'undefined') {
      console.log('Using mock backend for development');
    }
    return new MockBackendClient();
  }

  if (BACKEND_MODE === 'custom') {
    throw new Error(
      'Custom backend not implemented yet. Implement your own backend client in lib/backend/custom/'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SupabaseBackendClient } = require('./supabase/client') as typeof import('./supabase/client');
  return new SupabaseBackendClient();
}

export const backend = createBackendClient();
