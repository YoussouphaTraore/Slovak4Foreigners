import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) return { error: error.message };
      return { error: null };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: () => {
    // Safety net: always mark initialized within 3 s even if Supabase hangs
    const fallback = setTimeout(() => set({ isInitialized: true }), 3000);

    supabase.auth.getSession().then(({ data }) => {
      clearTimeout(fallback);
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isInitialized: true,
      });
    }).catch(() => {
      clearTimeout(fallback);
      set({ isInitialized: true });
    });

    // Keep in sync on every auth change
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Mark that this session had a logged-in user so regression is skipped on sign-out
        try { sessionStorage.setItem('wasLoggedIn', 'true'); } catch { /* */ }
      }
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
      });
    });
  },
}));
