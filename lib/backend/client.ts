import type { IBackendClient } from './types';
import { getBackendMode, type BackendMode } from './mode';

const BACKEND_MODE: BackendMode = getBackendMode();

function createBackendClient(): IBackendClient {
  if (BACKEND_MODE === 'mock') {
    // Lazy require keeps Supabase out of the mock login path
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

  const { SupabaseBackendClient } = require('./supabase/client') as typeof import('./supabase/client');
  return new SupabaseBackendClient();
}

export const backend = createBackendClient();
export { getBackendMode, isMockBackend, hasSupabaseCredentials } from './mode';
