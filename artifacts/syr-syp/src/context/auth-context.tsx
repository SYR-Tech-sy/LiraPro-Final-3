import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, meta?: Record<string, unknown>, captchaToken?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncProfileToSupabase(userId: string, email: string, token: string) {
  try {
    await fetch('/api/v2/profile', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    try {
      await supabase.from('profiles').upsert(
        { id: userId, email, role: 'user', account_type: 'personal', profile_completed: false, updated_at: new Date().toISOString() },
        { onConflict: 'id', ignoreDuplicates: true }
      );
    } catch { /* silent */ }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED') {
        // Only update if token actually changed (prevents unnecessary re-renders on tab focus)
        setSession(prev => {
          if (prev?.access_token === newSession?.access_token) return prev;
          return newSession;
        });
        return;
      }

      if (event === 'USER_UPDATED') {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        setSession(prev => {
          if (prev?.user?.id === newSession?.user?.id && prev?.access_token === newSession?.access_token) return prev;
          return newSession;
        });
        setUser(prev => {
          if (prev?.id === (newSession?.user?.id ?? null)) return prev;
          return newSession?.user ?? null;
        });
        setIsLoaded(true);
        return;
      }

      if (event === 'SIGNED_IN') {
        // Skip state update if same user is already signed in (prevents tab-focus re-renders)
        setSession(prev => {
          if (prev?.user?.id === newSession?.user?.id && prev?.access_token === newSession?.access_token) return prev;
          return newSession;
        });
        setUser(prev => {
          if (prev?.id === (newSession?.user?.id ?? null)) return prev;
          return newSession?.user ?? null;
        });
        setIsLoaded(true);
        if (newSession?.user) {
          void syncProfileToSupabase(
            newSession.user.id,
            newSession.user.email ?? '',
            newSession.access_token
          );
        }
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, meta?: Record<string, unknown>, captchaToken?: string) => {
    const base = import.meta.env.BASE_URL ?? '/';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: `${window.location.origin}${base}app/home`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.replace(window.location.origin + (import.meta.env.BASE_URL ?? '/'));
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoaded,
      isSignedIn: !!user,
      signIn,
      signUp,
      signOut,
      resetPassword,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useUser() {
  return useAuth();
}
