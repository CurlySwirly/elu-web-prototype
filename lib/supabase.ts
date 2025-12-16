import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const backendMode = process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase';

// Create Supabase client only if we have the required environment variables
// In mock mode or when env vars are missing, create a dummy client to prevent errors
let supabase: SupabaseClient;

if (backendMode === 'mock' || !supabaseUrl || !supabaseAnonKey) {
  // Create a dummy client with placeholder values for mock mode
  // This prevents errors when code imports supabase but won't actually work
  // Code should use backend abstraction layer instead of direct supabase imports
  supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  );
  
  if (backendMode === 'mock') {
    console.log('Running in mock mode - Supabase client is a placeholder');
  } else {
    console.warn('Supabase environment variables missing - using placeholder client');
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

export type UserRole = 'client' | 'expert' | 'admin';
