import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  alias: string;
  isAdmin: boolean;
  leaderboardPulse: boolean;
  country: string;
  country_sk: string;
  country_sk_genitive: string;
  country_sk_locative: string;
  country_sk_adj_masculine: string;
  country_sk_adj_feminine: string;
  country_sk_adj_neuter: string;
  country_sk_adverb: string;
  gender: string;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => void;
  setAlias: (alias: string) => void;
  setIsAdmin: (v: boolean) => void;
  setLeaderboardPulse: (v: boolean) => void;
  setProfileData: (country: string, country_sk: string, country_sk_genitive: string, country_sk_locative: string, country_sk_adj_masculine: string, country_sk_adj_feminine: string, country_sk_adj_neuter: string, country_sk_adverb: string, gender: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  alias: '',
  isAdmin: false,
  leaderboardPulse: false,
  country: '',
  country_sk: '',
  country_sk_genitive: '',
  country_sk_locative: '',
  country_sk_adj_masculine: '',
  country_sk_adj_feminine: '',
  country_sk_adj_neuter: '',
  country_sk_adverb: '',
  gender: '',

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          // Data minimisation: request only the email address. Dropping the
          // default 'profile' scope means Google no longer sends name or
          // profile picture. Identity is the snail alias; support uses email.
          scopes: 'email',
          queryParams: { prompt: 'select_account' },
        },
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
      set({ user: null, session: null, alias: '', isAdmin: false, country: '', country_sk: '', country_sk_genitive: '', country_sk_locative: '', country_sk_adj_masculine: '', country_sk_adj_feminine: '', country_sk_adj_neuter: '', country_sk_adverb: '', gender: '' });
      // Full reset: wipes in-memory store and causes Zustand persist to overwrite
      // slovak-progress in localStorage with clean defaults. This ensures that if a
      // different user signs in next (even after a page reload), they never inherit
      // this user's data through the Case 3 "no stored_user_id" path.
      const { resetToDefaults } = (await import('./useProgressStore')).useProgressStore.getState();
      resetToDefaults();
      // Clear remaining user-specific localStorage keys not managed by Zustand
      for (const key of ['dialogues_completed', 'save-modal-dismissed-soft', 'streak_reminders_enabled']) {
        try { localStorage.removeItem(key); } catch { /* */ }
      }
      try { localStorage.removeItem('stored_user_id'); } catch { /* */ }
    } finally {
      set({ isLoading: false });
    }
  },

  setAlias: (alias) => set({ alias }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setLeaderboardPulse: (leaderboardPulse) => set({ leaderboardPulse }),
  setProfileData: (country, country_sk, country_sk_genitive, country_sk_locative, country_sk_adj_masculine, country_sk_adj_feminine, country_sk_adj_neuter, country_sk_adverb, gender) => set({ country, country_sk, country_sk_genitive, country_sk_locative, country_sk_adj_masculine, country_sk_adj_feminine, country_sk_adj_neuter, country_sk_adverb, gender }),

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
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[auth] onAuthStateChange — event:', event, '| userId:', session?.user?.id ?? null);
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
