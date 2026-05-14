import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressStore {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: string | null;
  completedLessons: string[];
  hearts: number;

  addXP: (amount: number) => void;
  completeLesson: (lessonId: string) => void;
  loseHeart: () => void;
  resetHearts: () => void;
  checkAndUpdateStreak: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      xp: 0,
      level: 1,
      streak: 0,
      lastPlayedDate: null,
      completedLessons: [],
      hearts: 3,

      addXP: (amount) =>
        set((state) => {
          const newXp = state.xp + amount;
          return { xp: newXp, level: Math.floor(newXp / 100) + 1 };
        }),

      completeLesson: (lessonId) =>
        set((state) => {
          if (state.completedLessons.includes(lessonId)) return state;
          return { completedLessons: [...state.completedLessons, lessonId] };
        }),

      loseHeart: () =>
        set((state) => ({ hearts: Math.max(0, state.hearts - 1) })),

      resetHearts: () => set({ hearts: 3 }),

      checkAndUpdateStreak: () =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          if (state.lastPlayedDate === today) return state;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const newStreak =
            state.lastPlayedDate === yesterdayStr ? state.streak + 1 : 1;

          return { streak: newStreak, lastPlayedDate: today };
        }),
    }),
    { name: 'slovak-progress' }
  )
);
