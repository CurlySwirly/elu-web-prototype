'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { backend } from '@/lib/backend/client';
import type { AuthUser } from '@/lib/types';

type UserRole = 'client' | 'expert' | 'admin';

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  userId: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    userId: null,
    loading: true,
  });

  useEffect(() => {
    (async () => {
      const user = await backend.auth.getCurrentUser();

      if (user) {
        setAuthState({
          user,
          role: user.role,
          userId: user.id,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          role: null,
          userId: null,
          loading: false,
        });
      }
    })();

    const unsubscribe = backend.auth.onAuthStateChange((user) => {
      if (user) {
        setAuthState({
          user,
          role: user.role,
          userId: user.id,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          role: null,
          userId: null,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await backend.auth.signIn({ email, password });
    setAuthState({
      user,
      role: user.role,
      userId: user.id,
      loading: false,
    });
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    const user = await backend.auth.signUp({ email, password, fullName, role });
    setAuthState({
      user,
      role: user.role,
      userId: user.id,
      loading: false,
    });
  };

  const signOut = async () => {
    await backend.auth.signOut();
    setAuthState({
      user: null,
      role: null,
      userId: null,
      loading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...authState, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
