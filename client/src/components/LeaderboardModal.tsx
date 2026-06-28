import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { useProgressStore } from '../store/useProgressStore';
import { getAvatarUrl } from '../lib/supabase/aliasUtils';

interface MergedRow {
  key: string;
  alias: string;
  avatarSrc: string;
  weeklyXp: number;
  isMe: boolean;
}

interface Props {
  onClose: () => void;
}

function rankLabel(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaderboardModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const weeklyXp = useProgressStore((s) => s.weeklyXp);

  const [allRows, setAllRows] = useState<MergedRow[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [prevWinner, setPrevWinner] = useState<{ alias: string; avatar: string; weekOf: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashedKeys, setFlashedKeys] = useState<Set<string>>(new Set());

  const rowsRef = useRef<MergedRow[]>([]);
  useEffect(() => { rowsRef.current = allRows; }, [allRows]);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      setLoading(true);

      const [realRes, npcRes, winnerRes] = await Promise.all([
        supabase.rpc('get_leaderboard'),
        supabase.from('npc_profiles').select('alias, avatar, weekly_xp'),
        supabase.from('weekly_winners').select('alias, avatar, week_of').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (winnerRes.data) {
        const w = winnerRes.data as { alias: string; avatar: string; week_of: string };
        const d = new Date(w.week_of);
        const formatted = `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
        setPrevWinner({ alias: w.alias, avatar: w.avatar, weekOf: formatted });
      }

      const realRows: MergedRow[] = ((realRes.data ?? []) as { id: string; alias: string | null; weekly_xp: number }[])
        .map((r) => ({
          key: r.id,
          alias: r.alias ?? '—',
          avatarSrc: r.alias ? getAvatarUrl(r.alias) : '/pp/FrogySnail.png',
          weeklyXp: r.weekly_xp,
          isMe: r.id === user?.id,
        }));

      const npcRows: MergedRow[] = ((npcRes.data ?? []) as { alias: string; avatar: string; weekly_xp: number }[])
        .map((n) => ({
          key: `npc-${n.alias}`,
          alias: n.alias,
          avatarSrc: n.avatar,
          weeklyXp: n.weekly_xp,
          isMe: false,
        }));

      const all = [...realRows, ...npcRows].sort((a, b) => b.weeklyXp - a.weeklyXp);

      const myIdx = all.findIndex((r) => r.isMe);
      setUserRank(myIdx === -1 ? null : myIdx + 1);
      setAllRows(all.slice(0, 100));
      setLoading(false);
    }

    load();
  }, [user]);

  // NPC live movement simulation
  useEffect(() => {
    if (loading) return;

    const id = setInterval(() => {
      const prev = rowsRef.current;
      if (prev.length === 0) return;

      const isSunday = new Date().getDay() === 0;
      const top = prev[0];
      const realUserTopXp = top && !top.key.startsWith('npc-') ? top.weeklyXp : null;

      const npcIndices = prev.reduce<number[]>((acc, r, i) => {
        if (r.key.startsWith('npc-')) acc.push(i);
        return acc;
      }, []);
      if (npcIndices.length === 0) return;

      const count = Math.floor(Math.random() * 3) + 1;
      const chosen = [...npcIndices].sort(() => Math.random() - 0.5).slice(0, count);

      const newFlashed = new Set<string>();
      const updated = prev.map((row, i) => {
        if (!chosen.includes(i)) return row;
        let bump = Math.floor(Math.random() * 15) + 1;

        if (isSunday && realUserTopXp !== null) {
          const cap = realUserTopXp - 1;
          if (row.weeklyXp >= cap) return row;
          bump = Math.min(bump, cap - row.weeklyXp);
          if (bump <= 0) return row;
        }

        newFlashed.add(row.key);
        return { ...row, weeklyXp: row.weeklyXp + bump };
      });

      const sorted = [...updated].sort((a, b) => b.weeklyXp - a.weeklyXp);
      const myIdx = sorted.findIndex((r) => r.isMe);

      setAllRows(sorted);
      setUserRank(myIdx === -1 ? null : myIdx + 1);

      if (newFlashed.size > 0) {
        setFlashedKeys(newFlashed);
        setTimeout(() => setFlashedKeys(new Set()), 600);
      }
    }, 10000);

    return () => clearInterval(id);
  }, [loading]);

  // Banner text + style
  let bannerText = '';
  let bannerClass = 'bg-gray-50 text-gray-500';

  if (!user) {
    bannerText = 'Sign in to join the leaderboard!';
    bannerClass = 'bg-gray-50 text-gray-500';
  } else if (weeklyXp === 0 || userRank === null) {
    bannerText = 'You are not ranked this week. Complete lessons to join the leaderboard!';
    bannerClass = 'bg-gray-50 text-gray-500';
  } else if (userRank > 100) {
    bannerText = 'Currently you are outside the top 100';
    bannerClass = 'bg-gray-50 text-gray-500';
  } else if (userRank === 1) {
    bannerText = 'You are #1 this week! 🥇 Defend your lead!';
    bannerClass = 'bg-green-50 text-brand-green';
  } else {
    bannerText = `You are currently #${userRank} this week`;
    bannerClass = 'bg-amber-50 text-amber-700';
  }

  const isEmpty = !loading && allRows.every((r) => r.weeklyXp === 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-6 sm:pb-0"
      onClick={onClose}
    >
      <style>{`
        @keyframes xp-flash {
          0%   { color: #15803d; }
          70%  { color: #15803d; }
          100% { color: #374151; }
        }
        .xp-flash-anim { animation: xp-flash 0.6s ease-out forwards; }
      `}</style>
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-800">Top 100 · Weekly Leaderboard</h2>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Resets every Monday</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer leading-none"
            >
              ✕
            </button>
          </div>

          {prevWinner && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="text-base shrink-0">🏆</span>
              <img src={prevWinner.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-amber-600 font-semibold leading-none">Winner of Week {prevWinner.weekOf}</p>
                <p className="text-xs font-extrabold text-amber-800 truncate leading-tight mt-0.5">{prevWinner.alias}</p>
              </div>
            </div>
          )}
        </div>

        {/* Guest gate */}
        {!user ? (
          <div className="flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
            <span className="text-5xl">🏆</span>
            <div>
              <p className="text-base font-extrabold text-gray-800 leading-snug">Sign in to join the competition</p>
              <p className="text-sm text-gray-400 mt-1 leading-snug">Create a free account to earn XP and compete on the weekly leaderboard.</p>
            </div>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full bg-brand-blue text-white font-bold py-3 rounded-2xl text-sm cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>

        {/* Banner — always visible, not scrollable */}
        <div className={`px-4 py-2.5 shrink-0 ${bannerClass}`}>
          <p className="text-xs font-semibold text-center">{bannerText}</p>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-8 h-8 border-4 border-gray-200 border-t-brand-green rounded-full animate-spin" />
            </div>
          ) : isEmpty ? (
            <p className="text-sm text-gray-400 text-center px-6 py-12">
              No activity this week yet. Start learning to claim #1!
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {allRows.map((row, i) => (
                <li
                  key={row.key}
                  className={`flex items-center gap-3 px-4 py-3 ${row.isMe ? 'bg-green-50' : ''}`}
                >
                  <span className="w-8 text-center text-sm font-bold text-gray-500 shrink-0">
                    {rankLabel(i + 1)}
                  </span>
                  <img
                    src={row.avatarSrc}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${row.isMe ? 'text-brand-green' : 'text-gray-800'}`}>
                      {row.alias}{row.isMe ? ' (You)' : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-extrabold text-gray-700 tabular-nums shrink-0 ${flashedKeys.has(row.key) ? 'xp-flash-anim' : ''}`}>
                    {row.weeklyXp} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
