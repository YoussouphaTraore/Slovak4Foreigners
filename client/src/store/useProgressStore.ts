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
  strength: number;         // 0–100, cached — recomputed by decayLessonStrengths on app load
  xpEarned: number;
  timesCompleted: number;
  // Spaced-repetition fields (added v16)
  intervalStage: number;           // 0=never reviewed; 1–5=review stages (grows per pass)
  nextReviewDue: string;           // ISO timestamp — when this lesson is next due for review
  timesReviewed: number;           // how many review sessions this lesson has appeared in
  strikesInLastReview: number;     // strikes accumulated in the most recent review session
  mastered?: boolean;              // true once the user completes a run with zero wrong answers
}

export interface SnailRaceRecord {
  stageId: string;
  attemptsToday: number;    // max 5, resets at midnight
  lastAttemptDate: string;  // YYYY-MM-DD
  bestScore: number;
}

export interface BlockRaceRecord {
  blockId: string;
  passed: boolean;
  bestScore: number;
}

export interface TopicRaceRecord {
  topicId: string;
  passed: boolean;
  bestScore: number;
}

export interface PartialLessonProgress {
  lessonId: string;
  resumeFromIndex: number;  // exercise index to start from on resume
  savedAt: number;          // epoch ms
}

// ── Constants ────────────────────────────────────────────────────────────────

function calcLevel(xp: number): number {
  return Math.floor(xp / 200) + 1;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function weekMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

// Spaced-repetition intervals — index = intervalStage - 1 (stage 0 and 1 both use 1 day).
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
const MAX_INTERVAL_STAGE = REVIEW_INTERVALS_DAYS.length; // 5

function intervalDaysForStage(stage: number): number {
  const idx = Math.min(Math.max(stage - 1, 0), REVIEW_INTERVALS_DAYS.length - 1);
  return REVIEW_INTERVALS_DAYS[idx];
}

// Returns all lesson records that are currently due for review, sorted by priority.
// Priority score: more strikesInLastReview → worse; fewer timesReviewed → worse; older completedAt → worse.
// Caps at 3 lessons (3 × 2 exercises = 6 max) so a single session is never overwhelming.
const MAX_LESSONS_PER_SESSION = 3;

export function getDueLessons(lessonRecords: LessonRecord[], nowMs: number = Date.now()): LessonRecord[] {
  return lessonRecords
    .filter((r) => r.nextReviewDue && new Date(r.nextReviewDue).getTime() <= nowMs)
    .map((r) => {
      const daysSince = (nowMs - new Date(r.completedAt).getTime()) / 86_400_000;
      const score = r.strikesInLastReview * 3 + daysSince + 10 / Math.max(r.timesReviewed, 1);
      return { record: r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LESSONS_PER_SESSION)
    .map((x) => x.record);
}

// Per-lesson strength based on how far through the current review interval we are.
// Green (<70% elapsed) → yellow (70–90%) → red (90–100%) → overdue (>100%).
export function computeStrength(record: LessonRecord, nowMs: number = Date.now()): number {
  if (!record.nextReviewDue) return 100;
  const due = new Date(record.nextReviewDue).getTime();
  const totalIntervalMs = intervalDaysForStage(record.intervalStage) * 86_400_000;
  const startMs = due - totalIntervalMs;
  const fraction = (nowMs - startMs) / totalIntervalMs;
  if (fraction < 0.7) return 100;
  if (fraction < 0.9) return 60;   // 🟡 warning
  if (fraction < 1.0) return 20;   // 🔴 critical
  return 0;                         // 🔴 overdue
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
  practiceDaysThisWeek: string[];  // YYYY-MM-DD dates of lesson completions in the current ISO week

  completedLessons: string[];
  lessonRecords: LessonRecord[];
  snailRaceRecords: SnailRaceRecord[];
  blockRaceRecords: BlockRaceRecord[];
  passedBlocks: string[];
  blockRaceAttemptsToday: number;
  blockRaceLastAttemptDate: string;
  topicRaceRecords: TopicRaceRecord[];
  passedTopics: string[];
  topicRaceAttemptsToday: number;
  topicRaceLastAttemptDate: string;
  triedEmergencyScenarios: string[];
  completedBlockDialogues: string[];

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

  // Lesson checkpoint — partial progress when user saves mid-lesson
  partialLessonProgress: PartialLessonProgress | null;
  savePartialProgress: (lessonId: string, resumeFromIndex: number) => void;
  clearPartialProgress: () => void;

  // XP actions
  addXP: (amount: number) => void;
  spendXP: (amount: number) => boolean;

  // Lesson lifecycle
  completeLesson: (
    lessonId: string,
    params: {
      lessonXpReward: number;
      totalStrikes: number;
      wrongAnswersThisRun: number;
    },
  ) => {
    xpEarned: number;
    baseXP: number;
    perfectBonusXP: number;
    wasPerfectRun: boolean;
    isFirstMastery: boolean;
    alreadyMastered: boolean;
    streakMultiplier: number;
    newStrength: number;
  };

  // Snail Race
  recordSnailRaceAttempt: (
    stageId: string,
    correctAnswers: number,
  ) => { xpEarned: number; attemptsLeft: number; blocked: boolean };

  // Block Race
  recordBlockRaceAttempt: (
    blockId: string,
    correctAnswers: number,
    accuracy: number,
  ) => { xpEarned: number; attemptsLeft: number; blocked: boolean; isTurboSnail: boolean };
  passBlock: (blockId: string) => void;
  getBlockRaceAttemptsLeft: () => number;
  hasPassedBlock: (blockId: string) => boolean;
  getBlockBestScore: (blockId: string) => number;

  // Topic Race
  recordTopicRaceAttempt: (
    topicId: string,
    correctAnswers: number,
    accuracy: number,
  ) => { xpEarned: number; attemptsLeft: number; blocked: boolean; isTurboSnail: boolean };
  passTopicRace: (topicId: string) => void;
  getTopicRaceAttemptsLeft: () => number;
  hasPassedTopic: (topicId: string) => boolean;
  getTopicBestScore: (topicId: string) => number;

  // Review helpers
  getWeakLessons: () => LessonRecord[];
  getSuggestedReviews: () => LessonRecord[];
  selectNextReviewTargets: () => void;

  // Emergency scenarios
  markEmergencyScenarioTried: (scenarioId: string) => void;

  // Block Dialogue
  completeBlockDialogue: (blockId: string) => void;
  hasCompletedBlockDialogue: (blockId: string) => boolean;

  // Save-progress modal
  dismissSaveProgressModal: () => void;

  // Guest regression
  applyGuestRegression: () => string | null;

  // Review cycle
  completeReview: (xpEarned: number, lessonResults: { lessonId: string; strikes: number }[]) => void;

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
      practiceDaysThisWeek: [],
      completedLessons: [],
      lessonRecords: [],
      snailRaceRecords: [],
      blockRaceRecords: [],
      passedBlocks: [],
      blockRaceAttemptsToday: 0,
      blockRaceLastAttemptDate: '',
      topicRaceRecords: [],
      passedTopics: [],
      topicRaceAttemptsToday: 0,
      topicRaceLastAttemptDate: '',
      triedEmergencyScenarios: [],
      completedBlockDialogues: [],
      isSyncing: false,
      lastSyncedAt: null,
      showSaveProgressModal: null,
      regressionLessonTitle: null,
      lastReviewedAt: null,
      reviewTargetIds: [],
      unlockedReferenceCards: [],
      isSessionRegistered: false,
      weeklyXp: 0,
      partialLessonProgress: null,

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

      completeLesson: (lessonId, { lessonXpReward, totalStrikes, wrongAnswersThisRun }) => {
        const s = get();

        const existing = s.lessonRecords.find((r) => r.lessonId === lessonId);
        const isRepeat = s.completedLessons.includes(lessonId);

        const wasPerfectRun = wrongAnswersThisRun === 0;
        const alreadyMastered = existing?.mastered === true;
        const isFirstMastery = wasPerfectRun && !alreadyMastered;
        const perfectBonusXP = isFirstMastery ? 2 : 0;
        const baseXP = lessonXpReward;
        const xpEarned = Math.round((baseXP + perfectBonusXP) * s.streakMultiplier);

        const now = new Date().toISOString();
        const today = todayStr();

        // Initial nextReviewDue: 1 day from now, staggered if other lessons land on the same day.
        // Lessons completed in a burst otherwise share identical due timestamps, causing pile-ups.
        const baseMs = Date.now() + 86_400_000;
        const sameWindowCount = !existing
          ? s.lessonRecords.filter((r) => {
              if (!r.nextReviewDue) return false;
              const due = new Date(r.nextReviewDue).getTime();
              // 28-hour window: 4h before base to 24h after, catches same-burst completions
              return due >= baseMs - 4 * 3_600_000 && due < baseMs + 24 * 3_600_000;
            }).length
          : 0;
        const staggerMs = Math.min(sameWindowCount * 2.5 * 3_600_000, 12 * 3_600_000);
        const nextReviewDue = new Date(baseMs + staggerMs).toISOString();
        const updatedRecord: LessonRecord = {
          lessonId,
          completedAt: now,
          lastDecayedAt: today,
          strikes: totalStrikes,
          strength: 100,
          xpEarned,
          timesCompleted: (existing?.timesCompleted ?? 0) + 1,
          mastered: alreadyMastered || isFirstMastery,
          // SR fields — re-playing a lesson doesn't reset review progress
          intervalStage: existing?.intervalStage ?? 0,
          nextReviewDue: existing?.nextReviewDue ?? nextReviewDue,
          timesReviewed: existing?.timesReviewed ?? 0,
          strikesInLastReview: existing?.strikesInLastReview ?? 0,
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

        return {
          xpEarned,
          baseXP,
          perfectBonusXP,
          wasPerfectRun,
          isFirstMastery,
          alreadyMastered,
          streakMultiplier: s.streakMultiplier,
          newStrength: 100,
        };
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

      // ── Block Race ────────────────────────────────────────────────────────

      recordBlockRaceAttempt: (blockId, correctAnswers, accuracy) => {
        const s = get();
        const today = new Date().toISOString().slice(0, 10);
        const attemptsToday = s.blockRaceLastAttemptDate === today ? s.blockRaceAttemptsToday : 0;

        if (attemptsToday >= 5) {
          return { xpEarned: 0, attemptsLeft: 0, blocked: true, isTurboSnail: false };
        }

        const isTurboSnail = correctAnswers > 10 && accuracy > 50;
        const xpEarned = Math.max(1, Math.round(correctAnswers * s.streakMultiplier));
        const newXp = Math.max(0, s.xp + xpEarned);
        const newWeeklyXp = s.weeklyXp + xpEarned;
        const newAttemptsToday = attemptsToday + 1;

        const existing = s.blockRaceRecords.find((r) => r.blockId === blockId);
        const updatedRecords = existing
          ? s.blockRaceRecords.map((r) =>
              r.blockId === blockId
                ? { ...r, bestScore: Math.max(correctAnswers, r.bestScore), passed: r.passed || isTurboSnail }
                : r,
            )
          : [...s.blockRaceRecords, { blockId, passed: isTurboSnail, bestScore: correctAnswers }];

        const updatedPassedBlocks =
          isTurboSnail && !s.passedBlocks.includes(blockId)
            ? [...s.passedBlocks, blockId]
            : s.passedBlocks;

        set({
          xp: newXp,
          level: calcLevel(newXp),
          weeklyXp: newWeeklyXp,
          blockRaceRecords: updatedRecords,
          blockRaceAttemptsToday: newAttemptsToday,
          blockRaceLastAttemptDate: today,
          passedBlocks: updatedPassedBlocks,
        });

        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [syncProgressToSupabase(user.id, get()), syncWeeklyXp(user.id, get().weeklyXp)],
            set,
          );
        }

        return { xpEarned, attemptsLeft: 5 - newAttemptsToday, blocked: false, isTurboSnail };
      },

      passBlock: (blockId) =>
        set((s) => ({
          passedBlocks: s.passedBlocks.includes(blockId)
            ? s.passedBlocks
            : [...s.passedBlocks, blockId],
          blockRaceRecords: s.blockRaceRecords.map((r) =>
            r.blockId === blockId ? { ...r, passed: true } : r,
          ),
        })),

      getBlockRaceAttemptsLeft: () => {
        const s = get();
        const today = new Date().toISOString().slice(0, 10);
        const attemptsToday = s.blockRaceLastAttemptDate === today ? s.blockRaceAttemptsToday : 0;
        return Math.max(0, 5 - attemptsToday);
      },

      hasPassedBlock: (blockId) => get().passedBlocks.includes(blockId),

      getBlockBestScore: (blockId) =>
        get().blockRaceRecords.find((r) => r.blockId === blockId)?.bestScore ?? 0,

      // ── Topic Race ────────────────────────────────────────────────────────

      recordTopicRaceAttempt: (topicId, correctAnswers, accuracy) => {
        const s = get();
        const today = new Date().toISOString().slice(0, 10);
        const attemptsToday = s.topicRaceLastAttemptDate === today ? s.topicRaceAttemptsToday : 0;

        if (attemptsToday >= 5) {
          return { xpEarned: 0, attemptsLeft: 0, blocked: true, isTurboSnail: false };
        }

        const isTurboSnail = correctAnswers > 10 && accuracy > 50;
        const xpEarned = Math.max(1, Math.round(correctAnswers * s.streakMultiplier));
        const newXp = Math.max(0, s.xp + xpEarned);
        const newWeeklyXp = s.weeklyXp + xpEarned;
        const newAttemptsToday = attemptsToday + 1;

        const existing = s.topicRaceRecords.find((r) => r.topicId === topicId);
        const updatedRecords = existing
          ? s.topicRaceRecords.map((r) =>
              r.topicId === topicId
                ? { ...r, bestScore: Math.max(correctAnswers, r.bestScore), passed: r.passed || isTurboSnail }
                : r,
            )
          : [...s.topicRaceRecords, { topicId, passed: isTurboSnail, bestScore: correctAnswers }];

        const updatedPassedTopics =
          isTurboSnail && !s.passedTopics.includes(topicId)
            ? [...s.passedTopics, topicId]
            : s.passedTopics;

        set({
          xp: newXp,
          level: calcLevel(newXp),
          weeklyXp: newWeeklyXp,
          topicRaceRecords: updatedRecords,
          topicRaceAttemptsToday: newAttemptsToday,
          topicRaceLastAttemptDate: today,
          passedTopics: updatedPassedTopics,
        });

        const { user } = useAuthStore.getState();
        if (user) {
          fireSync(
            [syncProgressToSupabase(user.id, get()), syncWeeklyXp(user.id, get().weeklyXp)],
            set,
          );
        }

        return { xpEarned, attemptsLeft: 5 - newAttemptsToday, blocked: false, isTurboSnail };
      },

      passTopicRace: (topicId) =>
        set((s) => ({
          passedTopics: s.passedTopics.includes(topicId)
            ? s.passedTopics
            : [...s.passedTopics, topicId],
          topicRaceRecords: s.topicRaceRecords.map((r) =>
            r.topicId === topicId ? { ...r, passed: true } : r,
          ),
        })),

      getTopicRaceAttemptsLeft: () => {
        const s = get();
        const today = new Date().toISOString().slice(0, 10);
        const attemptsToday = s.topicRaceLastAttemptDate === today ? s.topicRaceAttemptsToday : 0;
        return Math.max(0, 5 - attemptsToday);
      },

      hasPassedTopic: (topicId) => get().passedTopics.includes(topicId),

      getTopicBestScore: (topicId) =>
        get().topicRaceRecords.find((r) => r.topicId === topicId)?.bestScore ?? 0,

      // ── Emergency scenarios ───────────────────────────────────────────────

      markEmergencyScenarioTried: (scenarioId) =>
        set((s) => ({
          triedEmergencyScenarios: s.triedEmergencyScenarios.includes(scenarioId)
            ? s.triedEmergencyScenarios
            : [...s.triedEmergencyScenarios, scenarioId],
        })),

      // ── Block Dialogue ────────────────────────────────────────────────────

      completeBlockDialogue: (blockId) =>
        set((s) => ({
          completedBlockDialogues: s.completedBlockDialogues.includes(blockId)
            ? s.completedBlockDialogues
            : [...s.completedBlockDialogues, blockId],
        })),

      hasCompletedBlockDialogue: (blockId) =>
        get().completedBlockDialogues.includes(blockId),

      // ── Save-progress modal ───────────────────────────────────────────────

      dismissSaveProgressModal: () => set({ showSaveProgressModal: null }),

      // ── Lesson checkpoint ─────────────────────────────────────────────────

      savePartialProgress: (lessonId, resumeFromIndex) =>
        set({ partialLessonProgress: { lessonId, resumeFromIndex, savedAt: Date.now() } }),

      clearPartialProgress: () => set({ partialLessonProgress: null }),

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

      completeReview: (xpEarned, lessonResults) => {
        const now = new Date().toISOString();
        const nowMs = Date.now();
        const today = todayStr();
        set((s) => {
          const newXp = Math.max(0, s.xp + xpEarned);
          const updatedRecords = s.lessonRecords.map((r) => {
            const result = lessonResults.find((lr) => lr.lessonId === r.lessonId);
            if (!result) return r; // not in this session — untouched
            // ≤1 strike in the session = passed → advance stage; ≥2 = struggled → reset
            const passed = result.strikes <= 1;
            const newStage = passed ? Math.min(r.intervalStage + 1, MAX_INTERVAL_STAGE) : 0;
            const intervalDays = intervalDaysForStage(newStage);
            const nextReviewDue = new Date(nowMs + intervalDays * 86_400_000).toISOString();
            return {
              ...r,
              intervalStage: newStage,
              nextReviewDue,
              timesReviewed: r.timesReviewed + 1,
              strikesInLastReview: result.strikes,
              strength: 100,
              lastDecayedAt: today,
            };
          });
          // Recompute due list after advancing intervals
          const reviewTargetIds = getDueLessons(updatedRecords, nowMs).map((r) => r.lessonId);
          return {
            xp: newXp,
            level: calcLevel(newXp),
            lastReviewedAt: now,
            lessonRecords: updatedRecords,
            reviewTargetIds,
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
        snailRaceRecords: [],
        blockRaceRecords: [],
        passedBlocks: [],
        blockRaceAttemptsToday: 0,
        blockRaceLastAttemptDate: '',
        triedEmergencyScenarios: [],
        completedBlockDialogues: [],
        isSyncing: false,
        lastSyncedAt: null,
        showSaveProgressModal: null,
        regressionLessonTitle: null,
        lastReviewedAt: null,
        reviewTargetIds: [],
        unlockedReferenceCards: [],
        isSessionRegistered: false,
        weeklyXp: 0,
        partialLessonProgress: null,
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
          set({
            xp: cloud.xp,
            level: cloud.level,
            streak: cloud.streak,
            lastPlayedDate: cloud.lastPlayedDate,
            streakMultiplier: cloud.streakMultiplier,
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
            // Case 3: No stored_user_id — either a guest converting or a returning user on a new device.
            // The handle_new_user trigger always creates a blank user_progress row immediately on
            // sign-up, so cloud is never null for a brand-new user. We cannot distinguish "guest
            // converting" from "returning user on new device" by cloud null-ness alone.
            // Safe solution: always MERGE. Merging local guest data with an empty cloud row
            // preserves all guest progress. Merging empty local with a real cloud record keeps
            // the cloud data. Both cases are handled correctly.
            if (cloud === null) {
              // No cloud data at all (shouldn't happen given the trigger, but handle it)
              console.log('[sync] Case 3: no cloud data — pushing local to cloud');
              const s = get();
              await syncProgressToSupabase(userId, s);
              await Promise.all(s.lessonRecords.map((r) => syncLessonRecord(userId, r)));
              await Promise.all(s.snailRaceRecords.map((r) => syncSnailRaceRecord(userId, r)));
            } else {
              console.log('[sync] Case 3: merging local + cloud (guest convert or new device)');
              const s = get();
              const merged = mergeProgress(
                {
                  xp: s.xp,
                  level: s.level,
                  streak: s.streak,
                  lastPlayedDate: s.lastPlayedDate,
                  streakMultiplier: s.streakMultiplier,
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
                triedEmergencyScenarios: merged.triedEmergencyScenarios,
                completedLessons: merged.completedLessons,
                lessonRecords: merged.lessonRecords,
                snailRaceRecords: merged.snailRaceRecords,
              });
              await syncProgressToSupabase(userId, get());
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
        get().lessonRecords.filter((r) => computeStrength(r) < 80),

      getSuggestedReviews: () =>
        get()
          .lessonRecords
          .filter((r) => computeStrength(r) < 80)
          .sort((a, b) => computeStrength(a) - computeStrength(b))
          .slice(0, 3),

      selectNextReviewTargets: () => {
        const nowMs = Date.now();
        const targets = getDueLessons(get().lessonRecords, nowMs).map((r) => r.lessonId);
        set({ reviewTargetIds: targets });
      },

      // ── Decay (time-based, runs on app load) ──────────────────────────────
      // Each lesson has its own nextReviewDue derived from its intervalStage.
      // Migration guard: if SR fields are missing (e.g. after Supabase restore),
      // bootstrap nextReviewDue from completedAt + 1 day.

      decayLessonStrengths: () => {
        const s = get();
        const nowMs = Date.now();
        const updatedRecords = s.lessonRecords.map((record) => {
          let r = record;
          // Bootstrap missing SR fields (migration guard for Supabase-restored records)
          if (!r.nextReviewDue) {
            r = {
              ...r,
              intervalStage: r.intervalStage ?? 0,
              nextReviewDue: new Date(new Date(r.completedAt).getTime() + 86_400_000).toISOString(),
              timesReviewed: r.timesReviewed ?? 0,
              strikesInLastReview: r.strikesInLastReview ?? 0,
            };
          }
          const strength = computeStrength(r, nowMs);
          return strength !== r.strength ? { ...r, strength, lastDecayedAt: todayStr() } : r;
        });
        const reviewTargetIds = getDueLessons(updatedRecords, nowMs).map((r) => r.lessonId);
        set({ lessonRecords: updatedRecords, reviewTargetIds });
      },

      // ── Streak ────────────────────────────────────────────────────────────

      checkAndUpdateStreak: () =>
        set((s) => {
          const today = todayStr();
          const thisMonday = weekMondayOf(today);

          // Keep only dates from the current ISO week, then add today (deduplicated)
          const daysThisWeek = (s.practiceDaysThisWeek ?? [])
            .filter((d) => weekMondayOf(d) === thisMonday);
          if (!daysThisWeek.includes(today)) daysThisWeek.push(today);

          if (s.lastPlayedDate === today) {
            return { practiceDaysThisWeek: daysThisWeek };
          }

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
            practiceDaysThisWeek: daysThisWeek,
          };
        }),
    }),
    {
      name: 'slovak-progress',
      version: 19,
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

        if (version < 11) {
          old = { ...old, partialLessonProgress: null };
        }

        if (version < 12) {
          old = {
            ...old,
            blockRaceRecords: [],
            passedBlocks: [],
            blockRaceAttemptsToday: 0,
            blockRaceLastAttemptDate: '',
          };
        }

        if (version < 13) {
          old = { ...old, completedBlockDialogues: [] };
        }

        if (version < 14) {
          old = { ...old, completedBlockDialogues: [] };
        }

        if (version < 15) {
          old = { ...old, completedBlockDialogues: [] };
        }

        if (version < 16) {
          // Add SR fields to all existing lesson records.
          // nextReviewDue = completedAt + 1 day — lessons completed long ago will appear
          // overdue on first open, which is correct. Session cap (8 lessons) keeps it manageable.
          const records = (old.lessonRecords as Array<Record<string, unknown>>) ?? [];
          old = {
            ...old,
            lessonRecords: records.map((r) => ({
              ...r,
              intervalStage: 0,
              nextReviewDue: new Date(
                new Date(r.completedAt as string).getTime() + 86_400_000,
              ).toISOString(),
              timesReviewed: 0,
              strikesInLastReview: 0,
            })),
            reviewTargetIds: [], // recomputed by decayLessonStrengths on first load
          };
        }

        if (version < 17) {
          const records = (old.lessonRecords as Array<Record<string, unknown>>) ?? [];
          old = {
            ...old,
            lessonRecords: records.map((r) => ({ ...r, mastered: r.mastered ?? false })),
          };
        }

        if (version < 18) {
          old = { ...old, practiceDaysThisWeek: [] };
        }

        if (version < 19) {
          const { unlockedStages: _dropped, ...rest } = old as Record<string, unknown>;
          void _dropped;
          old = rest;
        }

        return old as unknown as ProgressStore;
      },
    },
  ),
);
