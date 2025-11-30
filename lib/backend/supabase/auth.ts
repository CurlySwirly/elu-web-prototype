import { supabase } from '@/lib/supabase';
import type { IAuthService } from '../types';
import type { SignInData, SignUpData, AuthUser } from '@/lib/types';

export class SupabaseAuthService implements IAuthService {
  async signIn(data: SignInData): Promise<AuthUser> {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;
    if (!authData.user) throw new Error('No user returned');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    return {
      id: authData.user.id,
      email: authData.user.email!,
      role: profile?.role || 'client',
    };
  }

  async signUp(data: SignUpData): Promise<AuthUser> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
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
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    return {
      id: session.user.id,
      email: session.user.email!,
      role: profile?.role || 'client',
    };
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          callback({
            id: session.user.id,
            email: session.user.email!,
            role: profile?.role || 'client',
          });
        } else {
          callback(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }
}
