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

function getStartStrength(strikes: number): number {
  if (strikes === 0) return 100;
  if (strikes <= 2) return 85;
  if (strikes <= 4) return 65;
  return 40;
}

function calcLevel(xp: number): number {
  return Math.floor(xp / 200) + 1;
}

// Returns stage IDs in the order they appear in the lesson data
function orderedStageIds(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const l of lessons) {
    if (!seen.has(l.stageId)) { seen.add(l.stageId); result.push(l.stageId); }
  }
  return result;
}

// True when every lesson in the stage *before* stageId is in completedLessons
function isPrevStageComplete(stageId: string, completedLessons: string[]): boolean {
  const ordered = orderedStageIds();
  const idx = ordered.indexOf(stageId);
  if (idx <= 0) return true; // first stage has no predecessor
  const prevId = ordered[idx - 1];
  return lessons.filter((l) => l.stageId === prevId).every((l) => completedLessons.includes(l.id));
}

// Removes stages from unlockedStages that weren't legitimately earned:
// walks stages in order and stops as soon as the previous stage isn't fully completed.
function sanitizeUnlockedStages(unlockedStages: string[], completedLessons: string[]): string[] {
  const ordered = orderedStageIds();
  const result: string[] = [];
  for (const stageId of ordered) {
    if (!unlockedStages.includes(stageId)) break;
    if (result.length > 0) {
      // Has a predecessor — check it's fully completed
      const prevId = ordered[ordered.indexOf(stageId) - 1];
      const prevComplete = lessons
        .filter((l) => l.stageId === prevId)
        .every((l) => completedLessons.includes(l.id));
      if (!prevComplete) break;
    }
    result.push(stageId);
  }
  // First stage is always unlocked
  if (!result.includes(ordered[0])) result.unshift(ordered[0]);
  return result;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Global time-based strength — all lessons share the same decay clock.
// The clock starts from max(lastReviewedAt, completedAt) so newly completed
// lessons are always fresh regardless of the last review time.
export function computeStrength(
  lastReviewedAt: string | null,
  completedAt: string,
  nowMs: number = Date.now(),
): number {
  const startMs = lastReviewedAt
    ? Math.max(new Date(lastReviewedAt).getTime(), new Date(completedAt).getTime())
    : new Date(completedAt).getTime();
  const hours = (nowMs - startMs) / 3_600_000;
  if (hours < 7) return 100;
  if (hours < 10) return 60;   // yellow zone
  if (hours < 12) return 20;   // red zone
  return 0;                    // review overdue
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

  // Review cycle — ISO timestamp of last completed review session
  lastReviewedAt: string | null;

  // Foreigner Exclusive — reference cards
  unlockedReferenceCards: string[];

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

  // Review cycle
  completeReview: (xpEarned: number, lessonIds: string[]) => void;

  // Foreigner Exclusive
  unlockReferenceCard: (cardId: string) => void;

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
      lastReviewedAt: null,
      unlockedReferenceCards: [],

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

        // Previous stage must be fully completed
        if (!isPrevStageComplete(stageId, s.completedLessons)) {
          return { success: false, xpCost, xpRemaining: 0 };
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

      // ── Review cycle ──────────────────────────────────────────────────────

      completeReview: (xpEarned, _lessonIds) => {
        const now = new Date().toISOString();
        const today = todayStr();
        set((s) => {
          const newXp = Math.max(0, s.xp + xpEarned);
          return {
            xp: newXp,
            level: calcLevel(newXp),
            lastReviewedAt: now,
            // All lessons reset to 100 — the review clock restarts for everyone
            lessonRecords: s.lessonRecords.map((r) => ({
              ...r,
              strength: 100,
              lastDecayedAt: today,
            })),
          };
        });
        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [syncProgressToSupabase(user.id, get())],
            set,
          );
        }
      },

      // ── Foreigner Exclusive ───────────────────────────────────────────────

      unlockReferenceCard: (cardId) =>
        set((s) => ({
          unlockedReferenceCards: s.unlockedReferenceCards.includes(cardId)
            ? s.unlockedReferenceCards
            : [...s.unlockedReferenceCards, cardId],
        })),

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
            // Sanitize after merge — cloud may still carry stages unlocked without
            // completing the previous stage (retroactive correction for existing users)
            const sanitizedStages = sanitizeUnlockedStages(
              merged.unlockedStages,
              merged.completedLessons,
            );
            set({
              xp: merged.xp,
              level: merged.level,
              streak: merged.streak,
              lastPlayedDate: merged.lastPlayedDate,
              streakMultiplier: merged.streakMultiplier,
              unlockedStages: sanitizedStages,
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
        get().lessonRecords.filter((r) => r.strength < 80),

      getSuggestedReviews: () =>
        get()
          .lessonRecords
          .filter((r) => r.strength < 80)
          .sort((a, b) => a.strength - b.strength)
          .slice(0, 3),

      // ── Decay (time-based, runs on app load) ──────────────────────────────
      // Strength is now a pure function of hours elapsed since the later of
      // lastReviewedAt or the lesson's own completedAt. No per-lesson decay
      // rates — all lessons share the same 12-hour review clock.

      decayLessonStrengths: () => {
        const s = get();
        const nowMs = Date.now();
        const updatedRecords = s.lessonRecords.map((record) => {
          const strength = computeStrength(s.lastReviewedAt, record.completedAt, nowMs);
          return strength !== record.strength
            ? { ...record, strength, lastDecayedAt: todayStr() }
            : record;
        });
        set({ lessonRecords: updatedRecords });
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
      version: 7,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isSyncing = false;
          state.regressionLessonTitle = null;
          // Correct any stages that were unlocked without the previous stage being complete
          state.unlockedStages = sanitizeUnlockedStages(
            state.unlockedStages,
            state.completedLessons,
          );
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

        if (version < 6) {
          old = { ...old, unlockedReferenceCards: [] };
        }

        if (version < 7) {
          // Switch from daily date string to ISO timestamp; reset so the
          // new 12-hour clock starts fresh for existing users.
          old = { ...old, lastReviewedAt: null };
        }

        return old as unknown as ProgressStore;
      },
    },
  ),
);
