import type { IBackendClient } from './types';
import { SupabaseBackendClient } from './supabase/client';
import { MockBackendClient } from './mock/client';

const BACKEND_MODE = (process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase') as 'supabase' | 'mock' | 'custom';

function createBackendClient(): IBackendClient {
  switch (BACKEND_MODE) {
    case 'mock':
      console.log('Using mock backend for development');
      return new MockBackendClient();

    case 'supabase':
      return new SupabaseBackendClient();

    case 'custom':
      throw new Error('Custom backend not implemented yet. Implement your own backend client in lib/backend/custom/');

    default:
      return new SupabaseBackendClient();
  }
}

export const backend = createBackendClient();
