import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lessons } from '../data/lessons';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LessonRecord {
  lessonId: string;
  completedAt: string;      // ISO date string
  lastDecayedAt: string;    // YYYY-MM-DD — tracks when decay was last applied
  strikes: number;          // total strikes in last attempt
  strength: number;         // 0–100, decays over time
  xpEarned: number;         // XP earned in last attempt
  timesCompleted: number;
}

export interface SnailRaceRecord {
  stageId: string;
  attemptsToday: number;    // max 5, resets at midnight
  lastAttemptDate: string;  // YYYY-MM-DD
  bestScore: number;        // best correct answers ever
}

// ── Constants ────────────────────────────────────────────────────────────────

// Stage 1 ('survival') is free. Others cost XP.
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

// ── Store interface ──────────────────────────────────────────────────────────

interface ProgressStore {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: string | null;
  streakMultiplier: number;

  completedLessons: string[];     // kept for sequential unlock logic
  lessonRecords: LessonRecord[];
  unlockedStages: string[];       // stageIds user has paid to unlock
  snailRaceRecords: SnailRaceRecord[];
  triedEmergencyScenarios: string[];

  // XP actions
  addXP: (amount: number) => void;
  spendXP: (amount: number) => boolean;

  // Lesson lifecycle
  completeLesson: (
    lessonId: string,
    totalStrikes: number,
    exerciseCount: number
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
    correctAnswers: number
  ) => { xpEarned: number; attemptsLeft: number; blocked: boolean };

  // Review helpers
  getWeakLessons: () => LessonRecord[];
  getSuggestedReviews: () => LessonRecord[];

  // Emergency scenarios
  markEmergencyScenarioTried: (scenarioId: string) => void;

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

        // XP earned: repeat lessons capped at 8, first-time capped at exerciseCount
        const baseXp = isRepeat ? Math.min(8, exerciseCount) : exerciseCount;
        const strikeXpLoss = Math.floor(totalStrikes * 0.5);
        const rawXp = Math.max(0, baseXp - strikeXpLoss);
        const perfectBonus = totalStrikes === 0 && !isRepeat;
        const xpEarned = Math.round(
          (rawXp + (perfectBonus ? 5 : 0)) * s.streakMultiplier
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

        return { xpEarned, perfectBonus, newStrength };
      },

      // ── Stage unlock ──────────────────────────────────────────────────────

      unlockStage: (stageId) => {
        const s = get();
        const xpCost = STAGE_UNLOCK_COSTS[stageId] ?? 0;

        if (s.unlockedStages.includes(stageId)) {
          return { success: true, xpCost, xpRemaining: s.xp };
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

        set({
          xp: newXp,
          level: calcLevel(newXp),
          snailRaceRecords: updatedRecords,
        });

        return {
          xpEarned,
          attemptsLeft: 5 - (attemptsToday + 1),
          blocked: false,
        };
      },

      // ── Emergency scenarios ───────────────────────────────────────────────

      markEmergencyScenarioTried: (scenarioId) =>
        set((s) => ({
          triedEmergencyScenarios: s.triedEmergencyScenarios.includes(scenarioId)
            ? s.triedEmergencyScenarios
            : [...s.triedEmergencyScenarios, scenarioId],
        })),

      // ── Review helpers ────────────────────────────────────────────────────

      getWeakLessons: () =>
        get().lessonRecords.filter((r) => r.strength < 60),

      getSuggestedReviews: () =>
        get()
          .lessonRecords
          .filter((r) => r.strength < 70)
          .sort((a, b) => a.strength - b.strength)
          .slice(0, 3),

      // ── Decay (called on app load) ─────────────────────────────────────────

      decayLessonStrengths: () => {
        const today = todayStr();
        set((s) => ({
          lessonRecords: s.lessonRecords.map((record) => {
            if (record.lastDecayedAt === today) return record;
            const daysSince = Math.max(
              0,
              Math.floor(
                (new Date(today).getTime() - new Date(record.lastDecayedAt).getTime()) /
                  86_400_000
              )
            );
            if (daysSince === 0) return record;
            const decayRate = getDecayRate(record.strikes);
            const newStrength = Math.max(0, record.strength - daysSince * decayRate);
            return { ...record, strength: newStrength, lastDecayedAt: today };
          }),
        }));
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

          return { streak: newStreak, lastPlayedDate: today, streakMultiplier };
        }),
    }),
    {
      name: 'slovak-progress',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const old = persisted as Record<string, unknown>;
        if (version < 2) {
          // Auto-unlock stages that already have completed lessons
          const completedLessons = (old.completedLessons as string[]) ?? [];
          const unlocked = new Set<string>(['survival']);
          for (const lessonId of completedLessons) {
            const lesson = lessons.find((l) => l.id === lessonId);
            if (lesson) unlocked.add(lesson.stageId);
          }
          return {
            ...old,
            streakMultiplier: 1.0,
            lessonRecords: [],
            unlockedStages: [...unlocked],
            snailRaceRecords: [],
          };
        }
        return old as unknown as ProgressStore;
      },
    }
  )
);
