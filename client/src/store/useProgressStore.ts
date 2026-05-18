import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lessons } from '../data/lessons';
import { useAuthStore } from './useAuthStore';
import {
  syncProgressToSupabase,
  syncLessonRecord,
  syncSnailRaceRecord,
  syncWeeklyXp,
  loadProgressFromSupabase,
  mergeProgress,
} from '../lib/supabase/progressSync';

// localStorage keys that belong to a specific user. Wiped when a different user signs in.
// Consent keys are intentionally excluded — they are device-level, not user-level.
const USER_STORAGE_KEYS = [
  'slovak-progress',
  'dialogues_completed',
  'save-modal-dismissed-soft',
  'streak_reminders_enabled',
];

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

// Pick the `count` lessons that most need review next cycle.
// Score factors: more strikes → worse; fewer timesCompleted → worse; older completedAt → worse.
function pickReviewTargets(lessonRecords: LessonRecord[], count = 3): string[] {
  if (lessonRecords.length === 0) return [];
  const now = Date.now();
  return [...lessonRecords]
    .map((r) => {
      const daysSince = (now - new Date(r.completedAt).getTime()) / 86_400_000;
      const score = r.strikes * 3 + daysSince + 10 / Math.max(r.timesCompleted, 1);
      return { lessonId: r.lessonId, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.lessonId);
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

  // The 3 lesson IDs scheduled for decay in the current review cycle.
  // Only these lessons can turn yellow/red; all others stay green.
  reviewTargetIds: string[];

  // Foreigner Exclusive — reference cards
  unlockedReferenceCards: string[];

  // Physical session registration
  isSessionRegistered: boolean;
  setIsSessionRegistered: (val: boolean) => void;

  // Weekly XP (leaderboard)
  weeklyXp: number;
  setWeeklyXp: (n: number) => void;

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
  selectNextReviewTargets: () => void;

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

  // Reset all progress to initial defaults (used when a different user signs in)
  resetToDefaults: () => void;

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
      reviewTargetIds: [],
      unlockedReferenceCards: [],
      isSessionRegistered: false,
      weeklyXp: 0,

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
        const newWeeklyXp = s.weeklyXp + xpEarned;

        set({
          lessonRecords: updatedRecords,
          completedLessons: newCompleted,
          xp: newXp,
          level: calcLevel(newXp),
          weeklyXp: newWeeklyXp,
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
              syncWeeklyXp(user.id, get().weeklyXp),
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

        const newWeeklyXpRace = s.weeklyXp + xpEarned;
        set({ xp: newXp, level: calcLevel(newXp), snailRaceRecords: updatedRecords, weeklyXp: newWeeklyXpRace });

        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [
              syncProgressToSupabase(user.id, get()),
              syncSnailRaceRecord(user.id, newRecord),
              syncWeeklyXp(user.id, get().weeklyXp),
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
          const updatedRecords = s.lessonRecords.map((r) => ({
            ...r,
            strength: 100,
            lastDecayedAt: today,
          }));
          const nextTargets = pickReviewTargets(updatedRecords);
          return {
            xp: newXp,
            level: calcLevel(newXp),
            lastReviewedAt: now,
            lessonRecords: updatedRecords,
            reviewTargetIds: nextTargets,
            weeklyXp: s.weeklyXp + xpEarned,
          };
        });
        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [
              syncProgressToSupabase(user.id, get()),
              syncWeeklyXp(user.id, get().weeklyXp),
            ],
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

      setIsSessionRegistered: (val) => set({ isSessionRegistered: val }),

      setWeeklyXp: (n) => set({ weeklyXp: n }),

      // ── Reset ─────────────────────────────────────────────────────────────

      resetToDefaults: () => set({
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
        reviewTargetIds: [],
        unlockedReferenceCards: [],
        isSessionRegistered: false,
        weeklyXp: 0,
      }),

      // ── Cloud sync ────────────────────────────────────────────────────────

      initializeFromCloud: async (userId) => {
        // ── User-switch guard ───────────────────────────────────────────────
        // This MUST run before any cloud fetch or merge. Zustand rehydrates
        // from localStorage synchronously at import time, so by the time this
        // function is called the in-memory store may already contain a different
        // user's data. We check and wipe here — the only guaranteed-safe point.
        let storedId: string | null = null;
        try { storedId = localStorage.getItem('stored_user_id'); } catch { /* */ }

        console.log('[sync] initializeFromCloud — userId:', userId, '| storedId:', storedId);

        const isDifferentUser = storedId !== null && storedId !== '' && storedId !== userId;
        const isUnknownDevice = storedId === null || storedId === '';

        const wipeLocal = () => {
          get().resetToDefaults();
          for (const key of USER_STORAGE_KEYS) {
            try { localStorage.removeItem(key); } catch { /* */ }
          }
        };

        const applyCloud = (cloud: NonNullable<Awaited<ReturnType<typeof loadProgressFromSupabase>>>) => {
          const sanitizedStages = sanitizeUnlockedStages(cloud.unlockedStages, cloud.completedLessons);
          set({
            xp: cloud.xp,
            level: cloud.level,
            streak: cloud.streak,
            lastPlayedDate: cloud.lastPlayedDate,
            streakMultiplier: cloud.streakMultiplier,
            unlockedStages: sanitizedStages,
            triedEmergencyScenarios: cloud.triedEmergencyScenarios,
            completedLessons: cloud.completedLessons,
            lessonRecords: cloud.lessonRecords,
            snailRaceRecords: cloud.snailRaceRecords,
          });
        };

        if (isDifferentUser) {
          // Case 2: Different user on this device — wipe immediately before fetch
          console.log('[sync] Case 2: different user — wiping local state before cloud load');
          wipeLocal();
        }

        // ── Cloud fetch ─────────────────────────────────────────────────────
        set({ isSyncing: true });
        try {
          const cloud = await loadProgressFromSupabase(userId);

          if (isDifferentUser) {
            // Local is already wiped — load cloud directly or create fresh profile
            if (cloud !== null) {
              applyCloud(cloud);
            } else {
              // No cloud data for this user — push fresh defaults
              await syncProgressToSupabase(userId, get());
            }

          } else if (isUnknownDevice) {
            // Case 3: No stored_user_id yet
            if (cloud !== null) {
              // Returning user from before this fix was deployed — wipe local, load cloud
              console.log('[sync] Case 3: no stored_user_id, cloud data exists — wiping local, loading cloud');
              wipeLocal();
              applyCloud(cloud);
            } else {
              // No cloud data → genuine new user or guest converting — keep local, push up
              console.log('[sync] Case 3: no stored_user_id, no cloud data — guest converting, pushing local');
              const s = get();
              await syncProgressToSupabase(userId, s);
              await Promise.all(s.lessonRecords.map((r) => syncLessonRecord(userId, r)));
              await Promise.all(s.snailRaceRecords.map((r) => syncSnailRaceRecord(userId, r)));
            }

          } else {
            // Case 4: Same user returning — merge cloud + local as before
            console.log('[sync] Case 4: same user returning — merging');
            if (cloud === null) {
              // Same user but no cloud data — push local up
              const s = get();
              await syncProgressToSupabase(userId, s);
              await Promise.all(s.lessonRecords.map((r) => syncLessonRecord(userId, r)));
              await Promise.all(s.snailRaceRecords.map((r) => syncSnailRaceRecord(userId, r)));
            } else {
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
              const sanitizedStages = sanitizeUnlockedStages(merged.unlockedStages, merged.completedLessons);
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
              await syncProgressToSupabase(userId, get());
            }
          }
        } catch (e) {
          console.error('[initializeFromCloud] error:', e);
        } finally {
          // Always stamp stored_user_id so future sign-ins can detect user switches
          try { localStorage.setItem('stored_user_id', userId); } catch { /* */ }
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

      selectNextReviewTargets: () => {
        const targets = pickReviewTargets(get().lessonRecords);
        set({ reviewTargetIds: targets });
      },

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
        // Bootstrap review targets on first run (or after migration)
        const reviewTargetIds =
          s.reviewTargetIds.length > 0
            ? s.reviewTargetIds
            : pickReviewTargets(updatedRecords);
        set({ lessonRecords: updatedRecords, reviewTargetIds });
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
      version: 10,
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

        if (version < 8) {
          old = { ...old, isSessionRegistered: false };
        }

        if (version < 9) {
          old = { ...old, reviewTargetIds: [] };
        }

        if (version < 10) {
          old = { ...old, weeklyXp: 0 };
        }

        return old as unknown as ProgressStore;
      },
    },
  ),
);
