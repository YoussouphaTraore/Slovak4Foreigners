import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  alias: string;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => void;
  setAlias: (alias: string) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  alias: '',

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
      set({ user: null, session: null, alias: '' });
      // Registration flag and weekly XP are user-specific — clear on sign-out
      const { setIsSessionRegistered, setWeeklyXp } = (await import('./useProgressStore')).useProgressStore.getState();
      setIsSessionRegistered(false);
      setWeeklyXp(0);
      try { localStorage.removeItem('stored_user_id'); } catch { /* */ }
    } finally {
      set({ isLoading: false });
    }
  },

  setAlias: (alias) => set({ alias }),

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

    // Keys that belong to a specific user and must be wiped when a different user signs in.
    // Consent keys are intentionally excluded — they are device-level, not user-level.
    const USER_STORAGE_KEYS = [
      'slovak-progress',
      'dialogues_completed',
      'save-modal-dismissed-soft',
      'streak_reminders_enabled',
    ];

    // Keep in sync on every auth change
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Mark that this session had a logged-in user so regression is skipped on sign-out
        try { sessionStorage.setItem('wasLoggedIn', 'true'); } catch { /* */ }
      }
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
      });

      // On actual sign-in: check whether localStorage belongs to the same user
      if (event === 'SIGNED_IN' && session?.user) {
        const userId = session.user.id;
        void (async () => {
          let storedId: string | null = null;
          try { storedId = localStorage.getItem('stored_user_id'); } catch { /* */ }

          if (storedId !== null && storedId !== userId) {
            // Different user on this device — wipe in-memory store and user-specific localStorage
            const { useProgressStore } = await import('./useProgressStore');
            useProgressStore.getState().resetToDefaults();
            for (const key of USER_STORAGE_KEYS) {
              try { localStorage.removeItem(key); } catch { /* */ }
            }
          }
          // Record which user's data is now in localStorage
          try { localStorage.setItem('stored_user_id', userId); } catch { /* */ }
        })();
      }
    });
  },
}));
