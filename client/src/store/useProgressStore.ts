import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lessons } from '../data/lessons';
import { useAuthStore } from './useAuthStore';
import {
  syncProgressToSupabase,
  syncLessonRecord,
  syncSnailRaceRecord,
  loadProgressFromSupabase,
  mergeProgress,
} from '../lib/supabase/progressSync';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LessonRecord {
  lessonId: string;
  completedAt: string;      // ISO date string
  lastDecayedAt: string;    // YYYY-MM-DD
  strikes: number;
  strength: number;         // 0–100, decays over time
  xpEarned: number;
  timesCompleted: number;
}

export interface SnailRaceRecord {
  stageId: string;
  attemptsToday: number;    // max 5, resets at midnight
  lastAttemptDate: string;  // YYYY-MM-DD
  bestScore: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_UNLOCK_COSTS: Record<string, number> = {
  settling: 100,
  advanced: 250,
};

function getDecayRate(strikes: number): number {
  if (strikes === 0) return 5;
  if (strikes <= 2) return 8;
  if (strikes <= 4) return 12;
  return 20;
}

function getStartStrength(strikes: number): number {
  if (strikes === 0) return 100;
  if (strikes <= 2) return 85;
  if (strikes <= 4) return 65;
  return 40;
}

function calcLevel(xp: number): number {
  return Math.floor(xp / 200) + 1;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Fire-and-forget helper — sets isSyncing, runs promises, clears when done
function fireSync(promises: Promise<unknown>[], setState: (patch: Partial<ProgressStore>) => void) {
  setState({ isSyncing: true });
  Promise.all(promises).finally(() =>
    setState({ isSyncing: false, lastSyncedAt: new Date().toISOString() }),
  );
}

// ── Store interface ──────────────────────────────────────────────────────────

interface ProgressStore {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: string | null;
  streakMultiplier: number;

  completedLessons: string[];
  lessonRecords: LessonRecord[];
  unlockedStages: string[];
  snailRaceRecords: SnailRaceRecord[];
  triedEmergencyScenarios: string[];

  // Sync status (not persisted — reset via onRehydrateStorage)
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Save-progress modal
  showSaveProgressModal: 'soft' | 'hard_stage' | 'hard_unlock' | 'regression' | null;
  regressionLessonTitle: string | null;

  // Daily review
  lastReviewDate: string | null;

  // XP actions
  addXP: (amount: number) => void;
  spendXP: (amount: number) => boolean;

  // Lesson lifecycle
  completeLesson: (
    lessonId: string,
    totalStrikes: number,
    exerciseCount: number,
  ) => { xpEarned: number; perfectBonus: boolean; newStrength: number };

  // Stage unlocking
  unlockStage: (stageId: string) => {
    success: boolean;
    xpCost: number;
    xpRemaining: number;
  };

  // Snail Race
  recordSnailRaceAttempt: (
    stageId: string,
    correctAnswers: number,
  ) => { xpEarned: number; attemptsLeft: number; blocked: boolean };

  // Review helpers
  getWeakLessons: () => LessonRecord[];
  getSuggestedReviews: () => LessonRecord[];

  // Emergency scenarios
  markEmergencyScenarioTried: (scenarioId: string) => void;

  // Save-progress modal
  dismissSaveProgressModal: () => void;

  // Guest regression
  applyGuestRegression: () => string | null;

  // Daily review
  completeReview: (xpEarned: number, lessonIds: string[]) => void;

  // Cloud sync
  initializeFromCloud: (userId: string) => Promise<void>;

  // Called on app load
  decayLessonStrengths: () => void;
  checkAndUpdateStreak: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      streak: 0,
      lastPlayedDate: null,
      streakMultiplier: 1.0,
      completedLessons: [],
      lessonRecords: [],
      unlockedStages: ['survival'],
      snailRaceRecords: [],
      triedEmergencyScenarios: [],
      isSyncing: false,
      lastSyncedAt: null,
      showSaveProgressModal: null,
      regressionLessonTitle: null,
      lastReviewDate: null,

      // ── XP ────────────────────────────────────────────────────────────────

      addXP: (amount) =>
        set((s) => {
          const newXp = Math.max(0, s.xp + amount);
          return { xp: newXp, level: calcLevel(newXp) };
        }),

      spendXP: (amount) => {
        if (get().xp < amount) return false;
        set((s) => {
          const newXp = Math.max(0, s.xp - amount);
          return { xp: newXp, level: calcLevel(newXp) };
        });
        return true;
      },

      // ── Lesson completion ─────────────────────────────────────────────────

      completeLesson: (lessonId, totalStrikes, exerciseCount) => {
        const s = get();
        const isRepeat = s.completedLessons.includes(lessonId);

        const baseXp = isRepeat ? Math.min(8, exerciseCount) : exerciseCount;
        const strikeXpLoss = Math.floor(totalStrikes * 0.5);
        const rawXp = Math.max(0, baseXp - strikeXpLoss);
        const perfectBonus = totalStrikes === 0 && !isRepeat;
        const xpEarned = Math.round(
          (rawXp + (perfectBonus ? 5 : 0)) * s.streakMultiplier,
        );

        const newStrength = getStartStrength(totalStrikes);
        const now = new Date().toISOString();
        const today = todayStr();

        const existing = s.lessonRecords.find((r) => r.lessonId === lessonId);
        const updatedRecord: LessonRecord = {
          lessonId,
          completedAt: now,
          lastDecayedAt: today,
          strikes: totalStrikes,
          strength: newStrength,
          xpEarned,
          timesCompleted: (existing?.timesCompleted ?? 0) + 1,
        };

        const updatedRecords = existing
          ? s.lessonRecords.map((r) => (r.lessonId === lessonId ? updatedRecord : r))
          : [...s.lessonRecords, updatedRecord];

        const newCompleted = isRepeat
          ? s.completedLessons
          : [...s.completedLessons, lessonId];

        const newXp = Math.max(0, s.xp + xpEarned);

        set({
          lessonRecords: updatedRecords,
          completedLessons: newCompleted,
          xp: newXp,
          level: calcLevel(newXp),
        });

        // hard_stage gate — fires when guest completes the last Stage 1 lesson
        if (!isRepeat) {
          const { user, isInitialized } = useAuthStore.getState();
          if (isInitialized && !user) {
            const survivalLessons = lessons.filter((l) => l.stageId === 'survival');
            const survivalIds = survivalLessons.map((l) => l.id);
            if (survivalIds.includes(lessonId)) {
              const completedCount = newCompleted.filter((id) => survivalIds.includes(id)).length;
              if (completedCount === survivalLessons.length) {
                set({ showSaveProgressModal: 'hard_stage' });
              }
            }
          }
        }

        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [
              syncProgressToSupabase(user.id, get()),
              syncLessonRecord(user.id, updatedRecord),
            ],
            set,
          );
        }

        return { xpEarned, perfectBonus, newStrength };
      },

      // ── Stage unlock ──────────────────────────────────────────────────────

      unlockStage: (stageId) => {
        const s = get();
        const xpCost = STAGE_UNLOCK_COSTS[stageId] ?? 0;

        if (s.unlockedStages.includes(stageId)) {
          return { success: true, xpCost, xpRemaining: s.xp };
        }

        // Gate guests — show sign-in modal instead of unlocking
        const { user, isInitialized } = useAuthStore.getState();
        if (isInitialized && !user) {
          set({ showSaveProgressModal: 'hard_unlock' });
          return { success: false, xpCost, xpRemaining: xpCost - s.xp };
        }

        if (s.xp < xpCost) {
          return { success: false, xpCost, xpRemaining: xpCost - s.xp };
        }

        const newXp = Math.max(0, s.xp - xpCost);
        set({
          xp: newXp,
          level: calcLevel(newXp),
          unlockedStages: [...s.unlockedStages, stageId],
        });

        if (user) {
          fireSync([syncProgressToSupabase(user.id, get())], set);
        }

        return { success: true, xpCost, xpRemaining: newXp };
      },

      // ── Snail Race ────────────────────────────────────────────────────────

      recordSnailRaceAttempt: (stageId, correctAnswers) => {
        const s = get();
        const today = todayStr();
        const existing = s.snailRaceRecords.find((r) => r.stageId === stageId);

        const isSameDay = existing?.lastAttemptDate === today;
        const attemptsToday = isSameDay ? existing!.attemptsToday : 0;

        if (attemptsToday >= 5) {
          return { xpEarned: 0, attemptsLeft: 0, blocked: true };
        }

        const xpEarned = Math.max(1, Math.round(correctAnswers * s.streakMultiplier));
        const newXp = Math.max(0, s.xp + xpEarned);

        const newRecord: SnailRaceRecord = {
          stageId,
          attemptsToday: attemptsToday + 1,
          lastAttemptDate: today,
          bestScore: Math.max(correctAnswers, existing?.bestScore ?? 0),
        };

        const updatedRecords = existing
          ? s.snailRaceRecords.map((r) => (r.stageId === stageId ? newRecord : r))
          : [...s.snailRaceRecords, newRecord];

        set({ xp: newXp, level: calcLevel(newXp), snailRaceRecords: updatedRecords });

        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [
              syncProgressToSupabase(user.id, get()),
              syncSnailRaceRecord(user.id, newRecord),
            ],
            set,
          );
        }

        return { xpEarned, attemptsLeft: 5 - (attemptsToday + 1), blocked: false };
      },

      // ── Emergency scenarios ───────────────────────────────────────────────

      markEmergencyScenarioTried: (scenarioId) =>
        set((s) => ({
          triedEmergencyScenarios: s.triedEmergencyScenarios.includes(scenarioId)
            ? s.triedEmergencyScenarios
            : [...s.triedEmergencyScenarios, scenarioId],
        })),

      // ── Save-progress modal ───────────────────────────────────────────────

      dismissSaveProgressModal: () => set({ showSaveProgressModal: null }),

      // ── Guest regression ──────────────────────────────────────────────────

      applyGuestRegression: () => {
        const s = get();
        if (s.lessonRecords.length === 0) return null;

        // Find the lesson with lowest strength > 0 to regress
        const candidate = s.lessonRecords
          .filter((r) => r.strength > 0)
          .sort((a, b) => a.strength - b.strength)[0];

        if (!candidate) return null;

        const lesson = lessons.find((l) => l.id === candidate.lessonId);
        const title = lesson?.title ?? candidate.lessonId;

        set({
          lessonRecords: s.lessonRecords.map((r) =>
            r.lessonId === candidate.lessonId ? { ...r, strength: 0 } : r,
          ),
          regressionLessonTitle: title,
          showSaveProgressModal: 'regression',
        });

        return candidate.lessonId;
      },

      // ── Daily review ─────────────────────────────────────────────────────

      completeReview: (xpEarned, lessonIds) => {
        set((s) => {
          const newXp = Math.max(0, s.xp + xpEarned);
          return {
            xp: newXp,
            level: calcLevel(newXp),
            lastReviewDate: todayStr(),
            lessonRecords: s.lessonRecords.map((r) =>
              lessonIds.includes(r.lessonId)
                ? { ...r, strength: Math.min(100, r.strength + 20) }
                : r,
            ),
          };
        });
        const { user } = useAuthStore.getState();
        if (user) {
          const s = get();
          const boosted = s.lessonRecords.filter((r) => lessonIds.includes(r.lessonId));
          fireSync(
            [syncProgressToSupabase(user.id, s), ...boosted.map((r) => syncLessonRecord(user.id, r))],
            set,
          );
        }
      },

      // ── Cloud sync ────────────────────────────────────────────────────────

      initializeFromCloud: async (userId) => {
        set({ isSyncing: true });
        try {
          const cloud = await loadProgressFromSupabase(userId);

          if (cloud === null) {
            // New user — push local state to Supabase
            const s = get();
            await syncProgressToSupabase(userId, s);
            await Promise.all(s.lessonRecords.map((r) => syncLessonRecord(userId, r)));
            await Promise.all(s.snailRaceRecords.map((r) => syncSnailRaceRecord(userId, r)));
          } else {
            // Existing user — merge cloud + local, never lose progress
            const s = get();
            const merged = mergeProgress(
              {
                xp: s.xp,
                level: s.level,
                streak: s.streak,
                lastPlayedDate: s.lastPlayedDate,
                streakMultiplier: s.streakMultiplier,
                unlockedStages: s.unlockedStages,
                triedEmergencyScenarios: s.triedEmergencyScenarios,
                completedLessons: s.completedLessons,
                lessonRecords: s.lessonRecords,
                snailRaceRecords: s.snailRaceRecords,
              },
              cloud,
            );
            set({
              xp: merged.xp,
              level: merged.level,
              streak: merged.streak,
              lastPlayedDate: merged.lastPlayedDate,
              streakMultiplier: merged.streakMultiplier,
              unlockedStages: merged.unlockedStages,
              triedEmergencyScenarios: merged.triedEmergencyScenarios,
              completedLessons: merged.completedLessons,
              lessonRecords: merged.lessonRecords,
              snailRaceRecords: merged.snailRaceRecords,
            });
            // Write merged state back so cloud is up to date
            await syncProgressToSupabase(userId, get());
          }
        } catch (e) {
          console.error('[initializeFromCloud] error:', e);
        } finally {
          set({ isSyncing: false, lastSyncedAt: new Date().toISOString() });
        }
      },

      // ── Review helpers ────────────────────────────────────────────────────

      getWeakLessons: () =>
        get().lessonRecords.filter((r) => r.strength < 60),

      getSuggestedReviews: () =>
        get()
          .lessonRecords
          .filter((r) => r.strength < 70)
          .sort((a, b) => a.strength - b.strength)
          .slice(0, 3),

      // ── Decay ─────────────────────────────────────────────────────────────

      decayLessonStrengths: () => {
        const today = todayStr();
        const s = get();

        const decayed: LessonRecord[] = [];
        const updatedRecords = s.lessonRecords.map((record) => {
          if (record.lastDecayedAt === today) return record;
          const daysSince = Math.max(
            0,
            Math.floor(
              (new Date(today).getTime() - new Date(record.lastDecayedAt).getTime()) /
                86_400_000,
            ),
          );
          if (daysSince === 0) return record;
          const decayRate = getDecayRate(record.strikes);
          const newStrength = Math.max(0, record.strength - daysSince * decayRate);
          const updated = { ...record, strength: newStrength, lastDecayedAt: today };
          decayed.push(updated);
          return updated;
        });

        set({ lessonRecords: updatedRecords });

        const { user } = useAuthStore.getState();
        if (user && decayed.length > 0) {
          fireSync(
            decayed.map((r) => syncLessonRecord(user.id, r)),
            set,
          );
        }
      },

      // ── Streak ────────────────────────────────────────────────────────────

      checkAndUpdateStreak: () =>
        set((s) => {
          const today = todayStr();
          if (s.lastPlayedDate === today) return s;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          const continued = s.lastPlayedDate === yesterdayStr;
          const newStreak = continued ? s.streak + 1 : 1;

          const streakMultiplier = !continued
            ? 1.0
            : newStreak >= 7
            ? 2.0
            : newStreak >= 3
            ? 1.5
            : 1.0;

          return {
            streak: newStreak,
            lastPlayedDate: today,
            streakMultiplier,
          };
        }),
    }),
    {
      name: 'slovak-progress',
      version: 5,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isSyncing = false;
          state.regressionLessonTitle = null;
        }
      },
      migrate: (persisted: unknown, version: number) => {
        let old = persisted as Record<string, unknown>;

        if (version < 2) {
          const completedLessons = (old.completedLessons as string[]) ?? [];
          const unlocked = new Set<string>(['survival']);
          for (const lessonId of completedLessons) {
            const lesson = lessons.find((l) => l.id === lessonId);
            if (lesson) unlocked.add(lesson.stageId);
          }
          old = {
            ...old,
            streakMultiplier: 1.0,
            lessonRecords: [],
            unlockedStages: [...unlocked],
            snailRaceRecords: [],
          };
        }

        if (version < 3) {
          old = {
            ...old,
            isSyncing: false,
            lastSyncedAt: null,
            showSaveProgressModal: null,
            triedEmergencyScenarios:
              (old.triedEmergencyScenarios as string[]) ?? [],
          };
        }

        if (version < 4) {
          old = {
            ...old,
            showSaveProgressModal: null,
            regressionLessonTitle: null,
          };
        }

        if (version < 5) {
          old = { ...old, lastReviewDate: null };
        }

        return old as unknown as ProgressStore;
      },
    },
  ),
);
