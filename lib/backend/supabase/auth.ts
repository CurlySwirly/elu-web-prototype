import { supabase } from '@/lib/supabase';
import type { IAuthService } from '../types';
import type { SignInData, SignUpData, AuthUser } from '@/lib/types';

type AuthRole = AuthUser['role'];

function roleFromMetadata(
  user: { user_metadata?: Record<string, unknown> }
): AuthRole | null {
  const role = user.user_metadata?.role;
  if (role === 'client' || role === 'expert' || role === 'admin') return role;
  return null;
}

async function toAuthUser(
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<AuthUser> {
  const metaRole = roleFromMetadata(user);
  const metaName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : '';

  let profile: { role?: string | null; full_name?: string | null } | null = null;
  try {
    const profileQuery = supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    // Never block the whole /app shell if the profiles request stalls
    const result = await Promise.race([
      profileQuery,
      new Promise<{ data: null }>((resolve) => {
        setTimeout(() => resolve({ data: null }), 2500);
      }),
    ]);
    profile = result.data;
  } catch {
    /* profile may be unavailable briefly during auth lock */
  }

  const profileRole =
    profile?.role === 'client' || profile?.role === 'expert' || profile?.role === 'admin'
      ? profile.role
      : null;

  return {
    id: user.id,
    email: user.email!,
    // Prefer DB role; fall back to auth metadata so experts are never misclassified as clients
    role: profileRole || metaRole || 'client',
    fullName: (profile?.full_name || metaName || '').trim() || undefined,
  };
}

export class SupabaseAuthService implements IAuthService {
  async signIn(data: SignInData): Promise<AuthUser> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('No user returned');

    return toAuthUser(authData.user);
  }

  async signUp(data: SignUpData): Promise<AuthUser> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.fullName, role: data.role },
      },
    });

    if (error) throw error;
    if (!authData.user) throw new Error('No user returned');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      role: data.role,
    });

    if (profileError) throw profileError;

    return {
      id: authData.user.id,
      email: authData.user.email!,
      role: data.role,
      fullName: data.fullName,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    return toAuthUser(session.user);
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer DB reads: querying inside the auth callback can deadlock / return null
      // and would incorrectly fall back to role "client".
      setTimeout(() => {
        void (async () => {
          if (session?.user) {
            callback(await toAuthUser(session.user));
          } else {
            callback(null);
          }
        })();
      }, 0);
    });

    return () => subscription.unsubscribe();
  }
}
