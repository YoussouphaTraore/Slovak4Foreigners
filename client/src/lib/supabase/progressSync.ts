import { supabase } from './client';
import type { LessonRecord, SnailRaceRecord } from '../../store/useProgressStore';

// Subset of store state needed for cloud sync
export interface ProgressSnapshot {
  xp: number;
  level: number;
  streak: number;
  lastPlayedDate: string | null;
  streakMultiplier: number;
  triedEmergencyScenarios: string[];
  completedLessons: string[];
  lessonRecords: LessonRecord[];
  snailRaceRecords: SnailRaceRecord[];
  passedBlocks: string[];
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
          tried_emergency_scenarios: s.triedEmergencyScenarios,
          passed_blocks: s.passedBlocks,
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
        interval_stage: record.intervalStage,
        next_review_due: record.nextReviewDue,
        times_reviewed: record.timesReviewed,
        strikes_in_last_review: record.strikesInLastReview,
        mastered: record.mastered ?? false,
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
      intervalStage: (r.interval_stage as number) ?? 0,
      nextReviewDue:
        (r.next_review_due as string | null) ??
        new Date(new Date(r.completed_at as string).getTime() + 86_400_000).toISOString(),
      timesReviewed: (r.times_reviewed as number) ?? 0,
      strikesInLastReview: (r.strikes_in_last_review as number) ?? 0,
      mastered: (r.mastered as boolean) ?? false,
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
      triedEmergencyScenarios:
        (p.tried_emergency_scenarios as string[]) ?? [],
      completedLessons: lessonRecords.map((r) => r.lessonId),
      lessonRecords,
      snailRaceRecords,
      passedBlocks: (p.passed_blocks as string[]) ?? [],
    };
  } catch (e) {
    console.error('[sync] loadProgressFromSupabase error:', e);
    return null;
  }
}

// ── Weekly XP ─────────────────────────────────────────────────────────────────

export async function syncWeeklyXp(userId: string, weeklyXp: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ weekly_xp: weeklyXp })
      .eq('id', userId);
    if (error) console.error('[sync] weekly_xp:', error.message);
  } catch (e) {
    console.error('[sync] weekly_xp error:', e);
  }
}

export async function loadWeeklyXp(userId: string): Promise<number> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('weekly_xp')
      .eq('id', userId)
      .maybeSingle();
    return (data as { weekly_xp?: number } | null)?.weekly_xp ?? 0;
  } catch {
    return 0;
  }
}

// ── Admin flag ────────────────────────────────────────────────────────────────

export async function loadIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    return (data as { is_admin?: boolean } | null)?.is_admin ?? false;
  } catch {
    return false;
  }
}

// ── Onboarding demographics (gender + country) ────────────────────────────────
// Gender + country are NO LONGER stored per-user. They're recorded only as an
// anonymous aggregate count (record_demographics RPC) and kept device-locally for
// grammar personalisation — see client/src/lib/demographics.ts. The old per-user
// DB read/write helpers (loadNeedsOnboarding / loadProfileOnboarding /
// saveOnboarding) were removed here as part of that data-minimisation change.

// ── Weekly Winner ─────────────────────────────────────────────────────────────

const WINNER_SEEN_KEY = 'winner_seen_week';

function getLastMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon…6=Sat
  const daysBack = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split('T')[0];
}

export interface WeeklyWinnerResult {
  show: boolean;
  winnerAlias: string;
  winnerAvatar: string;
  winnerXp: number;
  isCurrentUser: boolean;
}

export async function checkWeeklyWinner(
  _userId: string,
  userAlias: string,
): Promise<WeeklyWinnerResult | null> {
  const lastMonday = getLastMonday();

  try {
    const seen = localStorage.getItem(WINNER_SEEN_KEY);
    if (seen === lastMonday) return null;
  } catch { /* */ }

  try {
    const { data, error } = await supabase
      .from('weekly_winners')
      .select('alias, avatar, weekly_xp')
      .eq('week_of', lastMonday)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as { alias: string; avatar: string; weekly_xp: number };
    const userBase = userAlias.replace(/_\d+$/, '');
    const winnerBase = row.alias.replace(/_\d+$/, '');
    const isCurrentUser = row.alias === userAlias || winnerBase === userBase;

    return {
      show: true,
      winnerAlias: row.alias,
      winnerAvatar: row.avatar,
      winnerXp: row.weekly_xp ?? 0,
      isCurrentUser,
    };
  } catch {
    return null;
  }
}

export function markWinnerSeen(): void {
  try { localStorage.setItem(WINNER_SEEN_KEY, getLastMonday()); } catch { /* */ }
}

// ── Physical Session Registration ─────────────────────────────────────────────

export async function checkSessionRegistration(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('physical_session_regist')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

// Registers the logged-in account's interest in a physical session. We store
// only the account link — no name/email/phone. The organiser reaches
// registrants via their account email, and the real name is written on paper
// on-site (then destroyed), never held digitally.
export async function insertSessionRegistration(
  userId: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('physical_session_regist')
      .insert({ user_id: userId });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Merge (never lose progress) ───────────────────────────────────────────────

export function mergeProgress(
  local: ProgressSnapshot,
  cloud: ProgressSnapshot,
): ProgressSnapshot {
  const xp = Math.max(local.xp, cloud.xp);
  const passedBlocks = [...new Set([...local.passedBlocks, ...cloud.passedBlocks])];
  const level = passedBlocks.length + 1;
  const streak = Math.max(local.streak, cloud.streak);

  // More recent date wins; treat null as oldest
  const localDate = local.lastPlayedDate ?? '';
  const cloudDate = cloud.lastPlayedDate ?? '';
  const lastPlayedDate =
    localDate >= cloudDate ? local.lastPlayedDate : cloud.lastPlayedDate;

  // Keep multiplier from whichever side had more XP; clamp to valid range
  const rawMultiplier =
    cloud.xp >= local.xp ? cloud.streakMultiplier : local.streakMultiplier;
  const streakMultiplier = Math.min(2.0, Math.max(1.0, rawMultiplier));

  const triedEmergencyScenarios = [
    ...new Set([
      ...local.triedEmergencyScenarios,
      ...cloud.triedEmergencyScenarios,
    ]),
  ];
  const completedLessons = [
    ...new Set([...local.completedLessons, ...cloud.completedLessons]),
  ];

  // Lesson records — prefer the record with the most SR review progress (higher intervalStage).
  // Tie-break on timesCompleted so lesson-play progress is also never lost.
  const lessonMap = new Map<string, LessonRecord>();
  for (const r of local.lessonRecords) lessonMap.set(r.lessonId, r);
  for (const r of cloud.lessonRecords) {
    const ex = lessonMap.get(r.lessonId);
    if (!ex) {
      lessonMap.set(r.lessonId, r);
    } else {
      const cloudWins =
        r.intervalStage > ex.intervalStage ||
        (r.intervalStage === ex.intervalStage && r.timesCompleted > ex.timesCompleted);
      if (cloudWins) lessonMap.set(r.lessonId, r);
    }
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
    triedEmergencyScenarios,
    completedLessons,
    lessonRecords: [...lessonMap.values()],
    snailRaceRecords: [...raceMap.values()],
    passedBlocks,
  };
}
