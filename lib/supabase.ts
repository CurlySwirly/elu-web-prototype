import { getBackendMode } from '@/lib/backend/mode';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  return trimmed || undefined;
}

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const backendMode = getBackendMode();

let supabase: SupabaseClient;

const usingPlaceholder = backendMode === 'mock' || !supabaseUrl || !supabaseAnonKey;

if (usingPlaceholder) {
  supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
  );

  if (typeof window === 'undefined') {
    console.log('Running without Supabase credentials - using placeholder client / mock data');
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export { supabase };

export type UserRole = 'client' | 'expert' | 'admin';
