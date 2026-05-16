import { supabase } from './client';
import type { LessonRecord, SnailRaceRecord } from '../../store/useProgressStore';

// Subset of store state needed for cloud sync
export interface ProgressSnapshot {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: string | null;
  streakMultiplier: number;
  unlockedStages: string[];
  triedEmergencyScenarios: string[];
  completedLessons: string[];
  lessonRecords: LessonRecord[];
  snailRaceRecords: SnailRaceRecord[];
}

function calcLevel(xp: number): number {
  return Math.floor(xp / 200) + 1;
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function syncProgressToSupabase(
  userId: string,
  s: ProgressSnapshot,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert(
        {
          user_id: userId,
          xp: s.xp,
          level: s.level,
          streak: s.streak,
          last_played_date: s.lastPlayedDate,
          streak_multiplier: s.streakMultiplier,
          unlocked_stages: s.unlockedStages,
          tried_emergency_scenarios: s.triedEmergencyScenarios,
        },
        { onConflict: 'user_id' },
      );
    if (error) console.error('[sync] user_progress:', error.message);
  } catch (e) {
    console.error('[sync] user_progress error:', e);
  }
}

export async function syncLessonRecord(
  userId: string,
  record: LessonRecord,
): Promise<void> {
  try {
    const { error } = await supabase.from('lesson_records').upsert(
      {
        user_id: userId,
        lesson_id: record.lessonId,
        strength: record.strength,
        strikes: record.strikes,
        completed_at: record.completedAt,
        times_completed: record.timesCompleted,
        xp_earned: record.xpEarned,
        last_decayed_at: record.lastDecayedAt,
      },
      { onConflict: 'user_id,lesson_id' },
    );
    if (error) console.error('[sync] lesson_records:', error.message);
  } catch (e) {
    console.error('[sync] lesson_records error:', e);
  }
}

export async function syncSnailRaceRecord(
  userId: string,
  record: SnailRaceRecord,
): Promise<void> {
  try {
    const { error } = await supabase.from('snail_race_records').upsert(
      {
        user_id: userId,
        stage_id: record.stageId,
        attempts_today: record.attemptsToday,
        last_attempt_date: record.lastAttemptDate,
        best_score: record.bestScore,
      },
      { onConflict: 'user_id,stage_id' },
    );
    if (error) console.error('[sync] snail_race_records:', error.message);
  } catch (e) {
    console.error('[sync] snail_race_records error:', e);
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function loadProgressFromSupabase(
  userId: string,
): Promise<ProgressSnapshot | null> {
  try {
    const [progressRes, lessonsRes, racesRes] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', userId).single(),
      supabase.from('lesson_records').select('*').eq('user_id', userId),
      supabase.from('snail_race_records').select('*').eq('user_id', userId),
    ]);

    if (progressRes.error || !progressRes.data) return null;

    const p = progressRes.data as Record<string, unknown>;

    const lessonRecords: LessonRecord[] = (
      (lessonsRes.data ?? []) as Record<string, unknown>[]
    ).map((r) => ({
      lessonId: r.lesson_id as string,
      completedAt: r.completed_at as string,
      lastDecayedAt:
        (r.last_decayed_at as string | null) ??
        new Date().toISOString().split('T')[0],
      strikes: r.strikes as number,
      strength: r.strength as number,
      xpEarned: r.xp_earned as number,
      timesCompleted: r.times_completed as number,
    }));

    const snailRaceRecords: SnailRaceRecord[] = (
      (racesRes.data ?? []) as Record<string, unknown>[]
    ).map((r) => ({
      stageId: r.stage_id as string,
      attemptsToday: r.attempts_today as number,
      lastAttemptDate: r.last_attempt_date as string,
      bestScore: r.best_score as number,
    }));

    return {
      xp: p.xp as number,
      level: p.level as number,
      streak: p.streak as number,
      lastPlayedDate: p.last_played_date as string | null,
      streakMultiplier: p.streak_multiplier as number,
      unlockedStages: (p.unlocked_stages as string[]) ?? ['survival'],
      triedEmergencyScenarios:
        (p.tried_emergency_scenarios as string[]) ?? [],
      completedLessons: lessonRecords.map((r) => r.lessonId),
      lessonRecords,
      snailRaceRecords,
    };
  } catch (e) {
    console.error('[sync] loadProgressFromSupabase error:', e);
    return null;
  }
}

// ── Merge (never lose progress) ───────────────────────────────────────────────

export function mergeProgress(
  local: ProgressSnapshot,
  cloud: ProgressSnapshot,
): ProgressSnapshot {
  const xp = Math.max(local.xp, cloud.xp);
  const level = calcLevel(xp);
  const streak = Math.max(local.streak, cloud.streak);

  // More recent date wins; treat null as oldest
  const localDate = local.lastPlayedDate ?? '';
  const cloudDate = cloud.lastPlayedDate ?? '';
  const lastPlayedDate =
    localDate >= cloudDate ? local.lastPlayedDate : cloud.lastPlayedDate;

  // Keep multiplier from whichever side had more XP
  const streakMultiplier =
    cloud.xp >= local.xp ? cloud.streakMultiplier : local.streakMultiplier;

  const unlockedStages = [
    ...new Set([...local.unlockedStages, ...cloud.unlockedStages]),
  ];
  const triedEmergencyScenarios = [
    ...new Set([
      ...local.triedEmergencyScenarios,
      ...cloud.triedEmergencyScenarios,
    ]),
  ];
  const completedLessons = [
    ...new Set([...local.completedLessons, ...cloud.completedLessons]),
  ];

  // Lesson records — keep higher timesCompleted per lessonId
  const lessonMap = new Map<string, LessonRecord>();
  for (const r of local.lessonRecords) lessonMap.set(r.lessonId, r);
  for (const r of cloud.lessonRecords) {
    const ex = lessonMap.get(r.lessonId);
    if (!ex || r.timesCompleted > ex.timesCompleted) lessonMap.set(r.lessonId, r);
  }

  // Snail race records — keep higher bestScore per stageId
  const raceMap = new Map<string, SnailRaceRecord>();
  for (const r of local.snailRaceRecords) raceMap.set(r.stageId, r);
  for (const r of cloud.snailRaceRecords) {
    const ex = raceMap.get(r.stageId);
    if (!ex || r.bestScore > ex.bestScore) raceMap.set(r.stageId, r);
  }

  return {
    xp,
    level,
    streak,
    lastPlayedDate,
    streakMultiplier,
    unlockedStages,
    triedEmergencyScenarios,
    completedLessons,
    lessonRecords: [...lessonMap.values()],
    snailRaceRecords: [...raceMap.values()],
  };
}
