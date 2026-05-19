import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { getAvatarUrl } from '../lib/supabase/aliasUtils';
import { lessons } from '../data/lessons';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PhysReg {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface TopUser {
  userId: string;
  xp: number;
  streak: number;
  alias: string | null;
  email: string;
}

interface UserControl {
  userId: string;
  alias: string | null;
  email: string;
  weeklyXp: number;
  totalXp: number;
  level: number;
  lastLessonId: string | null;
}

interface Npc {
  alias: string;
  avatar: string;
  weekly_xp: number;
}

interface RecentSession {
  id: string;
  user_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  device_type: string | null;
}

interface AdminStats {
  liveNow: number;
  totalUsers: number;
  newUsersThisWeek: number;
  sessionsToday: number;
  avgDurationTodaySec: number | null;
  physicalRegs: PhysReg[];
  topUsers: TopUser[];
  userControls: UserControl[];
  npcs: Npc[];
  recentSessions: RecentSession[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(sec: number | null): string {
  if (sec === null || sec < 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function lessonName(id: string | null): string {
  if (!id) return '—';
  return lessons.find((l) => l.id === id)?.title ?? id;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold px-1 mb-2">{title}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

// ── Boost confirmation modal ──────────────────────────────────────────────────

function BoostModal({
  target,
  boosting,
  onConfirm,
  onCancel,
}: {
  target: { alias: string | null; amount: number };
  boosting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-2">Confirm Boost</h2>
        <p className="text-sm text-gray-500 text-center leading-snug mb-6">
          Add{' '}
          <span className="font-bold text-gray-800">+{target.amount} XP</span> to{' '}
          <span className="font-bold text-gray-800">{target.alias ?? 'this user'}</span>?
        </p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={boosting}
          className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all mb-3 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {boosting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Boosting…
            </>
          ) : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={boosting}
          className="w-full text-gray-400 text-sm py-1.5 cursor-pointer hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // NPC controls
  const [npcSaving, setNpcSaving] = useState<string | null>(null);

  // User boost
  const [boostTarget, setBoostTarget] = useState<{ userId: string; alias: string | null; amount: number } | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [boostMessage, setBoostMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!userId) { navigate('/'); return; }

    setLoading(true);
    try {
      // Gate: must be admin
      const { data: me } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      if (!(me as { is_admin?: boolean } | null)?.is_admin) { navigate('/'); return; }
      setAuthorized(true);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
      const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();

      const [
        liveRes,
        totalRes,
        newRes,
        sessTodayCountRes,
        sessTodayDurRes,
        physRes,
        topProgressRes,
        userProfilesRes,
        npcRes,
        recentSessRes,
      ] = await Promise.all([
        supabase
          .from('user_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_active_at', fiveMinAgo),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo),
        supabase
          .from('user_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('started_at', todayStart.toISOString()),
        supabase
          .from('user_sessions')
          .select('duration_seconds')
          .gte('started_at', todayStart.toISOString())
          .not('duration_seconds', 'is', null),
        supabase
          .from('physical_session_regist')
          .select('id, name, email, phone')
          .order('id', { ascending: false }),
        supabase
          .from('user_progress')
          .select('user_id, xp, streak')
          .order('xp', { ascending: false })
          .limit(10),
        // All non-admin users for User Controls
        supabase
          .from('user_profiles')
          .select('id, alias, email, weekly_xp')
          .eq('is_admin', false)
          .order('weekly_xp', { ascending: false }),
        supabase
          .from('npc_profiles')
          .select('alias, avatar, weekly_xp')
          .order('weekly_xp', { ascending: false }),
        supabase
          .from('user_sessions')
          .select('id, user_id, started_at, ended_at, duration_seconds, device_type')
          .order('started_at', { ascending: false })
          .limit(30),
      ]);

      const durations = ((sessTodayDurRes.data ?? []) as { duration_seconds: number }[]).map(
        (r) => r.duration_seconds,
      );
      const avgDur =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : null;

      // Top Learners: join progress + profiles
      const topIds = ((topProgressRes.data ?? []) as { user_id: string }[]).map((p) => p.user_id);
      const { data: topProfilesData } = topIds.length > 0
        ? await supabase.from('user_profiles').select('id, alias, email').in('id', topIds)
        : { data: [] };

      const topUsers: TopUser[] = ((topProgressRes.data ?? []) as { user_id: string; xp: number; streak: number }[]).map((p) => {
        const profile = ((topProfilesData ?? []) as { id: string; alias: string | null; email: string }[]).find(
          (pr) => pr.id === p.user_id,
        );
        return {
          userId: p.user_id,
          xp: p.xp,
          streak: p.streak,
          alias: profile?.alias ?? null,
          email: profile?.email ?? '',
        };
      });

      // User Controls: fetch progress + last lesson for all non-admin users
      type ProfileRow = { id: string; alias: string | null; email: string; weekly_xp: number };
      const profileRows = (userProfilesRes.data ?? []) as ProfileRow[];
      const controlIds = profileRows.map((u) => u.id);

      const [userProgressRes, lastLessonRes] = controlIds.length > 0
        ? await Promise.all([
            supabase.from('user_progress').select('user_id, xp, level').in('user_id', controlIds),
            supabase
              .from('lesson_records')
              .select('user_id, lesson_id, completed_at')
              .in('user_id', controlIds)
              .order('completed_at', { ascending: false }),
          ])
        : [{ data: [] }, { data: [] }];

      // First occurrence per user = their most recent lesson
      const lastLessonMap = new Map<string, string>();
      for (const r of (lastLessonRes.data ?? []) as { user_id: string; lesson_id: string }[]) {
        if (!lastLessonMap.has(r.user_id)) lastLessonMap.set(r.user_id, r.lesson_id);
      }

      const userControls: UserControl[] = profileRows.map((u) => {
        const prog = ((userProgressRes.data ?? []) as { user_id: string; xp: number; level: number }[]).find(
          (p) => p.user_id === u.id,
        );
        return {
          userId: u.id,
          alias: u.alias,
          email: u.email,
          weeklyXp: u.weekly_xp ?? 0,
          totalXp: prog?.xp ?? 0,
          level: prog?.level ?? 1,
          lastLessonId: lastLessonMap.get(u.id) ?? null,
        };
      });

      setStats({
        liveNow: liveRes.count ?? 0,
        totalUsers: totalRes.count ?? 0,
        newUsersThisWeek: newRes.count ?? 0,
        sessionsToday: sessTodayCountRes.count ?? 0,
        avgDurationTodaySec: avgDur,
        physicalRegs: (physRes.data ?? []) as PhysReg[],
        topUsers,
        userControls,
        npcs: (npcRes.data ?? []) as Npc[],
        recentSessions: (recentSessRes.data ?? []) as RecentSession[],
      });
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => { load(); }, [load]);

  // ── NPC boost ──────────────────────────────────────────────────────────────

  async function adjustNpcXp(alias: string, delta: number) {
    if (!stats) return;
    const npc = stats.npcs.find((n) => n.alias === alias);
    if (!npc) return;
    const newXp = Math.max(0, npc.weekly_xp + delta);
    setStats((prev) =>
      prev
        ? { ...prev, npcs: prev.npcs.map((n) => (n.alias === alias ? { ...n, weekly_xp: newXp } : n)) }
        : prev,
    );
    setNpcSaving(alias);
    await supabase.from('npc_profiles').update({ weekly_xp: newXp }).eq('alias', alias);
    setNpcSaving(null);
  }

  // ── User boost ─────────────────────────────────────────────────────────────

  async function confirmBoost() {
    if (!boostTarget) return;
    setBoosting(true);
    const { alias, amount } = boostTarget;
    const { error } = await supabase.rpc('admin_boost_user_xp', {
      target_user_id: boostTarget.userId,
      boost_amount: amount,
    });
    setBoosting(false);
    setBoostTarget(null);
    if (error) {
      setBoostMessage({ text: 'Boost failed — ' + error.message, ok: false });
    } else {
      setBoostMessage({ text: `+${amount} XP added to ${alias ?? 'user'}!`, ok: true });
      load(); // refresh stats
    }
    setTimeout(() => setBoostMessage(null), 4000);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authorized || !stats) return null;

  return (
    <div className="min-h-screen bg-[#E8F4DC]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#E8F4DC] px-4 pt-12 pb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 cursor-pointer"
        >
          ‹
        </button>
        <h1 className="text-base font-extrabold text-gray-800">Admin Dashboard</h1>
        <button
          type="button"
          onClick={load}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-600 cursor-pointer text-sm"
        >
          ↺
        </button>
      </div>

      <div className="px-4 pb-24">
        {/* Live Now */}
        <Section title="Live Now">
          <div className="flex flex-col items-center py-6">
            <span className="text-5xl font-black text-brand-green">{stats.liveNow}</span>
            <span className="text-xs text-gray-400 mt-1">active in the last 5 minutes</span>
          </div>
        </Section>

        {/* Users */}
        <Section title="Users">
          <StatRow label="Total registered" value={stats.totalUsers} />
          <StatRow label="New this week" value={stats.newUsersThisWeek} />
        </Section>

        {/* Today */}
        <Section title="Today">
          <StatRow label="Sessions" value={stats.sessionsToday} />
          <StatRow label="Avg session duration" value={fmtDuration(stats.avgDurationTodaySec)} />
        </Section>

        {/* Physical Registrations */}
        <Section title={`Physical Session Registrations (${stats.physicalRegs.length})`}>
          {stats.physicalRegs.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-4 text-center">No registrations yet</p>
          ) : (
            stats.physicalRegs.map((r) => (
              <div key={r.id} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
                <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                <p className="text-xs text-gray-400">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p>
              </div>
            ))
          )}
        </Section>

        {/* Top Learners */}
        <Section title="Top Learners">
          {stats.topUsers.map((u, i) => (
            <div key={u.userId} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0">
              <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {u.alias ?? u.email.split('@')[0]}
                </p>
                <p className="text-xs text-gray-400">{u.streak} day streak</p>
              </div>
              <span className="text-sm font-bold text-brand-green">{u.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </Section>

        {/* User Controls */}
        <Section title={`User Controls (${stats.userControls.length})`}>
          {boostMessage && (
            <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-semibold text-center ${boostMessage.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {boostMessage.text}
            </div>
          )}
          {stats.userControls.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-4 text-center">No users yet</p>
          ) : (
            <div className="overflow-y-auto max-h-[560px]">
              {stats.userControls.map((u) => {
                const avatarSrc = u.alias ? getAvatarUrl(u.alias) : '/pp/FrogySnail.png';
                const displayName = u.alias ?? u.email.split('@')[0];
                return (
                  <div
                    key={u.userId}
                    className="px-4 py-3 border-b border-gray-50 last:border-b-0"
                  >
                    {/* Top row: avatar + name + level + XP */}
                    <div className="flex items-center gap-3 mb-2">
                      <img src={avatarSrc} alt={displayName} className="w-9 h-9 rounded-full object-cover flex-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                          <span className="text-[10px] font-bold text-white bg-brand-green rounded-full px-1.5 py-0.5 leading-none flex-none">
                            Lv {u.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          Last: {lessonName(u.lastLessonId)}
                        </p>
                      </div>
                      <div className="text-right flex-none">
                        <p className="text-xs font-bold text-brand-green">{u.weeklyXp.toLocaleString()} wk</p>
                        <p className="text-[10px] text-gray-400">{u.totalXp.toLocaleString()} total</p>
                      </div>
                    </div>
                    {/* Bottom row: boost buttons */}
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[10px] text-gray-400 mr-1">Boost:</span>
                      {[5, 10, 15, 20].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setBoostTarget({ userId: u.userId, alias: u.alias, amount: amt })}
                          className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer transition-colors"
                        >
                          +{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* NPC Controls */}
        <Section title="NPC Controls">
          {stats.npcs.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-4 text-center">No NPCs found</p>
          ) : (
            <div className="overflow-y-auto max-h-[560px]">
              {stats.npcs.map((npc) => (
                <div
                  key={npc.alias}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0"
                >
                  <img src={npc.avatar} alt={npc.alias} className="w-8 h-8 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{npc.alias}</p>
                    <p className="text-xs text-gray-400">
                      {npcSaving === npc.alias ? 'Saving…' : `${npc.weekly_xp} weekly XP`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[-50, -10, +10, +50].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => adjustNpcXp(npc.alias, delta)}
                        disabled={npcSaving === npc.alias}
                        className={`text-xs font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors disabled:opacity-40 ${
                          delta < 0
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent Sessions */}
        <Section title="Recent Sessions">
          {stats.recentSessions.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-4 text-center">No sessions yet</p>
          ) : (
            stats.recentSessions.map((s) => (
              <div key={s.id} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">
                    {s.user_id ? 'User' : 'Guest'} · {s.device_type ?? '?'}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(s.started_at)}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-400 font-mono truncate max-w-[160px]">
                    {s.user_id ? s.user_id.slice(0, 8) + '…' : '—'}
                  </span>
                  <span className="text-xs text-gray-500">{fmtDuration(s.duration_seconds)}</span>
                </div>
              </div>
            ))
          )}
        </Section>
      </div>

      {/* Boost confirmation modal */}
      {boostTarget && (
        <BoostModal
          target={boostTarget}
          boosting={boosting}
          onConfirm={confirmBoost}
          onCancel={() => setBoostTarget(null)}
        />
      )}
    </div>
  );
}
