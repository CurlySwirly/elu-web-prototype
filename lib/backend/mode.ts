export type BackendMode = 'supabase' | 'mock' | 'custom';

function cleanEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  return trimmed || undefined;
}

/**
 * Resolves which backend the app should use.
 * Falls back to mock when Supabase credentials are missing so deploys
 * still show demo data instead of empty/broken UI.
 */
export function getBackendMode(): BackendMode {
  const configured = (process.env.NEXT_PUBLIC_BACKEND_MODE || 'supabase') as BackendMode;
  const hasSupabase =
    Boolean(cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)) &&
    Boolean(cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

  if (configured === 'supabase' && !hasSupabase) {
    return 'mock';
  }

  return configured;
}

export function isMockBackend(): boolean {
  return getBackendMode() === 'mock';
}

export function hasSupabaseCredentials(): boolean {
  return (
    Boolean(cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)) &&
    Boolean(cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
  );
}
