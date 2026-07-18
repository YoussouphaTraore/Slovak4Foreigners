import { supabase } from './supabase/client';
import { lessons } from '../data/lessons';

// Admin-only KPI layer. All aggregation happens client-side from tables the
// admin's session can already read under RLS (the same pattern AdminPage uses),
// so no schema change is needed. The two datasets sealed behind SECURITY
// DEFINER (support_tickets, demographic_counts) come from the
// admin_dashboard_extras() RPC — see docs/sql/ — and degrade gracefully when
// that function hasn't been applied yet.
//
// All "days" are UTC, matching the app's streak/day convention.

// ── Raw rows (only the columns we fetch) ─────────────────────────────────────

export interface RawProfile {
  id: string;
  created_at: string;
  is_admin: boolean;
  weekly_xp: number;
  magic_box_last_claimed: string | null;
}
export interface RawSession {
  user_id: string | null;
  started_at: string;
  duration_seconds: number | null;
  device_type: string | null;
}
export interface RawProgress {
  user_id: string;
  streak: number;
  last_played_date: string | null;
  passed_blocks: string[] | null;
}
export interface RawLessonRecord {
  user_id: string;
  lesson_id: string;
  strikes: number;
  times_completed: number;
  mastered: boolean | null;
  next_review_due: string | null;
}

export interface RawRows {
  profiles: RawProfile[];
  sessions: RawSession[];      // last SESSION_WINDOW_DAYS only
  progress: RawProgress[];
  lessonRecords: RawLessonRecord[];
  npcCount: number;
}

// ── Computed insights ────────────────────────────────────────────────────────

export interface DayCount { day: string; users: number }
export interface Cohort { weekOf: string; size: number; returned: number }
export interface HardLesson {
  lessonId: string;
  title: string;
  icon: string;
  learners: number;
  avgStrikes: number;
  masteredPct: number;
}

export interface CurriculumPosition {
  lessonId: string;
  title: string;
  icon: string;
  users: number;                  // learners whose FURTHEST completed lesson is this one
}

export interface Insights {
  // Growth
  dauToday: number;
  guestSessionsToday: number;
  wau: number;
  mau: number;
  dauSeries: DayCount[];          // last 14 UTC days, oldest first
  cohorts: Cohort[];              // last 5 signup weeks, oldest first
  daysSinceLastSignup: number | null;
  stickinessPct: number;          // avg DAU over last 7 days ÷ MAU
  // Engagement
  avgSession7dSec: number | null;
  avgSession30dSec: number | null;
  sessionsPerActive7d: number | null;
  deviceSplit: Record<string, number>;   // 30d, raw device_type values
  hourHistogram: number[];        // 24 buckets, VIEWER-LOCAL hour, 30d, incl. guests
  // Learning
  funnel: { registered: number; oneLesson: number; threeLessons: number; oneBlock: number };
  hardestLessons: HardLesson[];
  curriculum: { positions: CurriculumPosition[]; notStarted: number };
  streaksAtRisk: number;          // played yesterday (UTC), not yet today, streak > 0
  reviewDebtUsers: number;
  reviewDebtLessons: number;
  inactive: { d7: number; d14: number; d30: number };
  // This week
  realLeaderboardPlayers: number; // non-admin users with weekly_xp > 0
  npcCount: number;
  magicBoxClaimers7d: number;     // users whose latest claim was in the last 7 days
}

// Sessions are only fetched this far back; retention cohorts must fit inside it.
export const SESSION_WINDOW_DAYS = 56;

const DAY_MS = 86_400_000;
const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Monday of the UTC week containing `ms` — matches the app's week convention.
function weekMonday(ms: number): string {
  const d = new Date(ms);
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return utcDay(ms + diff * DAY_MS);
}

export function computeInsights(rows: RawRows, nowMs: number = Date.now()): Insights {
  const admins = new Set(rows.profiles.filter((p) => p.is_admin).map((p) => p.id));
  const users = rows.profiles.filter((p) => !p.is_admin);
  const today = utcDay(nowMs);
  const yesterday = utcDay(nowMs - DAY_MS);

  // Sessions by user (admins excluded — the Boss checking the dashboard is not engagement)
  const userSessions = rows.sessions.filter((s) => s.user_id && !admins.has(s.user_id));

  // ── DAU series / WAU / MAU ──
  const byDay = new Map<string, Set<string>>();
  for (const s of userSessions) {
    const day = s.started_at.slice(0, 10);
    let set = byDay.get(day);
    if (!set) { set = new Set(); byDay.set(day, set); }
    set.add(s.user_id as string);
  }
  const dauSeries: DayCount[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = utcDay(nowMs - i * DAY_MS);
    dauSeries.push({ day, users: byDay.get(day)?.size ?? 0 });
  }
  const activeSince = (days: number) => {
    const cutoff = new Date(nowMs - days * DAY_MS).toISOString();
    return new Set(userSessions.filter((s) => s.started_at >= cutoff).map((s) => s.user_id)).size;
  };
  const dauToday = byDay.get(today)?.size ?? 0;
  const guestSessionsToday = rows.sessions.filter(
    (s) => !s.user_id && s.started_at.slice(0, 10) === today,
  ).length;

  // ── Retention cohorts: signed up in week W → any session ≥7 days after signup ──
  // Only weeks that fit fully inside the session window are trustworthy.
  const lastSessionISO = new Map<string, string>();
  for (const s of userSessions) {
    const prev = lastSessionISO.get(s.user_id as string);
    if (!prev || s.started_at > prev) lastSessionISO.set(s.user_id as string, s.started_at);
  }
  const cohortMap = new Map<string, { size: number; returned: number }>();
  const oldestTrustworthy = utcDay(nowMs - (SESSION_WINDOW_DAYS - 14) * DAY_MS);
  for (const u of users) {
    const signupMs = Date.parse(u.created_at);
    const week = weekMonday(signupMs);
    if (week < oldestTrustworthy || week > weekMonday(nowMs - 7 * DAY_MS)) continue;
    let c = cohortMap.get(week);
    if (!c) { c = { size: 0, returned: 0 }; cohortMap.set(week, c); }
    c.size++;
    const returnCutoff = new Date(signupMs + 7 * DAY_MS).toISOString();
    const cameBack = userSessions.some((s) => s.user_id === u.id && s.started_at >= returnCutoff);
    if (cameBack) c.returned++;
  }
  const cohorts: Cohort[] = [...cohortMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-5)
    .map(([weekOf, c]) => ({ weekOf, ...c }));

  const newestSignup = users.reduce<number | null>(
    (max, u) => Math.max(max ?? 0, Date.parse(u.created_at)), null,
  );
  const daysSinceLastSignup =
    newestSignup === null ? null : Math.floor((nowMs - newestSignup) / DAY_MS);

  // ── Funnel ──
  const nonAdminRecords = rows.lessonRecords.filter((r) => !admins.has(r.user_id));
  const lessonsByUser = new Map<string, Set<string>>();
  for (const r of nonAdminRecords) {
    let set = lessonsByUser.get(r.user_id);
    if (!set) { set = new Set(); lessonsByUser.set(r.user_id, set); }
    set.add(r.lesson_id);
  }
  const nonAdminProgress = rows.progress.filter((p) => !admins.has(p.user_id));
  const funnel = {
    registered: users.length,
    oneLesson: lessonsByUser.size,
    threeLessons: [...lessonsByUser.values()].filter((s) => s.size >= 3).length,
    oneBlock: nonAdminProgress.filter((p) => (p.passed_blocks?.length ?? 0) > 0).length,
  };

  // ── Hardest lessons (needs ≥2 learners to mean anything) ──
  const byLesson = new Map<string, { strikes: number; n: number; mastered: number }>();
  for (const r of nonAdminRecords) {
    let a = byLesson.get(r.lesson_id);
    if (!a) { a = { strikes: 0, n: 0, mastered: 0 }; byLesson.set(r.lesson_id, a); }
    a.strikes += r.strikes;
    a.n++;
    if (r.mastered) a.mastered++;
  }
  const hardestLessons: HardLesson[] = [...byLesson.entries()]
    .filter(([, a]) => a.n >= 2)
    .map(([lessonId, a]) => {
      const meta = lessons.find((l) => l.id === lessonId);
      return {
        lessonId,
        title: meta?.title ?? lessonId,
        icon: meta?.icon ?? '📘',
        learners: a.n,
        avgStrikes: Math.round((a.strikes / a.n) * 10) / 10,
        masteredPct: Math.round((a.mastered / a.n) * 100),
      };
    })
    .sort((a, b) => b.avgStrikes - a.avgStrikes)
    .slice(0, 8);

  // ── Streaks at risk / review debt / churn ──
  const streaksAtRisk = nonAdminProgress.filter(
    (p) => p.streak > 0 && p.last_played_date === yesterday,
  ).length;

  const nowISO = new Date(nowMs).toISOString();
  const debtUsers = new Set<string>();
  let reviewDebtLessons = 0;
  for (const r of nonAdminRecords) {
    if (r.next_review_due && r.next_review_due < nowISO) {
      debtUsers.add(r.user_id);
      reviewDebtLessons++;
    }
  }

  // ── Stickiness: how much of the monthly audience shows up on a given day ──
  let dauSum7 = 0;
  for (let i = 0; i < 7; i++) dauSum7 += byDay.get(utcDay(nowMs - i * DAY_MS))?.size ?? 0;
  const mau = activeSince(30);
  const stickinessPct = mau > 0 ? Math.round(((dauSum7 / 7) / mau) * 100) : 0;

  // ── Engagement: session duration / frequency / device / hour of day ──
  // Guests count here (their usage is real); admins never do.
  const learnerSessions = rows.sessions.filter((s) => !s.user_id || !admins.has(s.user_id));
  const avgDuration = (days: number): number | null => {
    const cutoff = new Date(nowMs - days * DAY_MS).toISOString();
    const ds = learnerSessions
      .filter((s) => s.started_at >= cutoff && s.duration_seconds !== null && s.duration_seconds >= 0)
      .map((s) => s.duration_seconds as number);
    return ds.length > 0 ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : null;
  };
  const cutoff7 = new Date(nowMs - 7 * DAY_MS).toISOString();
  const signedInSessions7d = userSessions.filter((s) => s.started_at >= cutoff7).length;
  const wau = activeSince(7);
  const sessionsPerActive7d =
    wau > 0 ? Math.round((signedInSessions7d / wau) * 10) / 10 : null;

  const cutoff30 = new Date(nowMs - 30 * DAY_MS).toISOString();
  const deviceSplit: Record<string, number> = {};
  const hourHistogram = new Array(24).fill(0) as number[];
  for (const s of learnerSessions) {
    if (s.started_at < cutoff30) continue;
    const dev = s.device_type?.trim() || 'unknown';
    deviceSplit[dev] = (deviceSplit[dev] ?? 0) + 1;
    // Viewer-local hour on purpose: this dashboard is read by one person, and
    // "when do people learn" is a question asked in their clock, not UTC.
    hourHistogram[new Date(s.started_at).getHours()]++;
  }

  // ── Curriculum position: each learner's FURTHEST completed lesson ──
  // "Furthest" by the curriculum order in the lessons data. Records for lesson
  // ids no longer in the curriculum are ignored for placement.
  const lessonIndex = new Map(lessons.map((l, i) => [l.id, i]));
  const furthestByUser = new Map<string, number>();
  for (const [userId, ids] of lessonsByUser) {
    let max = -1;
    for (const id of ids) {
      const idx = lessonIndex.get(id);
      if (idx !== undefined && idx > max) max = idx;
    }
    if (max >= 0) furthestByUser.set(userId, max);
  }
  const usersAtIndex = new Map<number, number>();
  for (const idx of furthestByUser.values()) {
    usersAtIndex.set(idx, (usersAtIndex.get(idx) ?? 0) + 1);
  }
  const positions: CurriculumPosition[] = [...usersAtIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([idx, n]) => ({
      lessonId: lessons[idx].id,
      title: lessons[idx].title,
      icon: lessons[idx].icon,
      users: n,
    }));
  const curriculum = { positions, notStarted: users.length - lessonsByUser.size };

  // ── Leaderboard health / Magic Box ──
  const realLeaderboardPlayers = users.filter((u) => u.weekly_xp > 0).length;
  const claimCutoff = new Date(nowMs - 7 * DAY_MS).toISOString().slice(0, 10);
  const magicBoxClaimers7d = users.filter(
    (u) => u.magic_box_last_claimed && u.magic_box_last_claimed >= claimCutoff,
  ).length;

  // Churn: last seen = latest session in window, else last_played_date, else signup.
  const lastSeen = new Map<string, number>();
  for (const u of users) lastSeen.set(u.id, Date.parse(u.created_at));
  for (const p of nonAdminProgress) {
    if (p.last_played_date) {
      lastSeen.set(p.user_id, Math.max(lastSeen.get(p.user_id) ?? 0, Date.parse(p.last_played_date)));
    }
  }
  for (const [id, iso] of lastSessionISO) {
    lastSeen.set(id, Math.max(lastSeen.get(id) ?? 0, Date.parse(iso)));
  }
  const inactiveFor = (days: number) =>
    users.filter((u) => (nowMs - (lastSeen.get(u.id) ?? 0)) > days * DAY_MS).length;

  return {
    dauToday,
    guestSessionsToday,
    wau,
    mau,
    dauSeries,
    cohorts,
    daysSinceLastSignup,
    stickinessPct,
    avgSession7dSec: avgDuration(7),
    avgSession30dSec: avgDuration(30),
    sessionsPerActive7d,
    deviceSplit,
    hourHistogram,
    funnel,
    hardestLessons,
    curriculum,
    streaksAtRisk,
    reviewDebtUsers: debtUsers.size,
    reviewDebtLessons,
    inactive: { d7: inactiveFor(7), d14: inactiveFor(14), d30: inactiveFor(30) },
    realLeaderboardPlayers,
    npcCount: rows.npcCount,
    magicBoxClaimers7d,
  };
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function loadInsights(): Promise<Insights | null> {
  const sessionCutoff = new Date(Date.now() - SESSION_WINDOW_DAYS * DAY_MS).toISOString();
  const [profilesRes, sessionsRes, progressRes, recordsRes, npcRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, created_at, is_admin, weekly_xp, magic_box_last_claimed'),
    supabase
      .from('user_sessions')
      .select('user_id, started_at, duration_seconds, device_type')
      .gte('started_at', sessionCutoff)
      .limit(10_000),
    supabase.from('user_progress').select('user_id, streak, last_played_date, passed_blocks'),
    supabase
      .from('lesson_records')
      .select('user_id, lesson_id, strikes, times_completed, mastered, next_review_due'),
    supabase.from('npc_profiles').select('*', { count: 'exact', head: true }),
  ]);
  if (profilesRes.error || sessionsRes.error || progressRes.error || recordsRes.error) {
    console.error('[adminInsights] load failed:',
      profilesRes.error ?? sessionsRes.error ?? progressRes.error ?? recordsRes.error);
    return null;
  }
  return computeInsights({
    profiles: (profilesRes.data ?? []) as RawProfile[],
    sessions: (sessionsRes.data ?? []) as RawSession[],
    progress: (progressRes.data ?? []) as RawProgress[],
    lessonRecords: (recordsRes.data ?? []) as RawLessonRecord[],
    npcCount: npcRes.count ?? 0,
  });
}

// ── Extras (tickets + demographics) via SECURITY DEFINER RPC ────────────────

export interface Extras {
  tickets: {
    open: number;
    by_category: Record<string, number>;
    oldest_open_hours: number;
    resolved_7d: number;
  };
  demographics: {
    gender: Record<string, number>;
    countries: { value: string; count: number }[];
  };
}

// null = RPC failed for a transient reason; 'missing' = function not applied yet.
export async function loadExtras(): Promise<Extras | 'missing' | null> {
  try {
    const { data, error } = await supabase.rpc('admin_dashboard_extras');
    if (error) {
      if (/function|schema cache|not exist/i.test(error.message)) return 'missing';
      console.error('[adminInsights] extras failed:', error.message);
      return null;
    }
    return data as Extras;
  } catch (e) {
    console.error('[adminInsights] extras error:', e);
    return null;
  }
}
