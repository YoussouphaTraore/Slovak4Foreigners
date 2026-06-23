import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import { useProgressStore } from '../store/useProgressStore';
import { lessons } from '../data/lessons';
import { PRODUCTION_VISIBLE_STAGES } from '../config/stageBlocks';
import { foreignPoliceLessons } from '../data/foreigner-exclusive/foreign-police';
import { getAvatarUrl } from '../lib/supabase/aliasUtils';
import { BottomNav } from '../components/ui/BottomNav';
import { canInstall, triggerInstall, markInstalled, markShown } from '../lib/pwaInstall';

// ── Stage metadata ─────────────────────────────────────────────────────────────

const STAGE_NAMES: Record<string, string> = {
  survival: 'Stage 1 — Survival',
  settling: 'Stage 2 — Settling In',
  advanced: 'Stage 3 — Advanced',
};

const isDev = import.meta.env.DEV;

// Ordered list of all stages present in lesson data (preserves source order).
// In production, only stages with rebuilt content are shown (see Step 2 of
// the Settling/Advanced hide-in-prod work) — dev still sees every stage.
const ALL_STAGE_IDS = isDev
  ? [...new Set(lessons.map((l) => l.stageId))]
  : [...new Set(lessons.map((l) => l.stageId))].filter((id) => PRODUCTION_VISIBLE_STAGES.includes(id));

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold px-1 mb-2">
      {children}
    </p>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function Row({
  children,
  last = false,
  onClick,
}: {
  children: React.ReactNode;
  last?: boolean;
  onClick?: () => void;
}) {
  const base = `flex items-center gap-3 px-4 py-3.5 ${last ? '' : 'border-b border-gray-50'}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} w-full text-left cursor-pointer hover:bg-gray-50 transition-colors`}>
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-none ${
        on ? 'bg-brand-green' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function ConfirmDeleteModal({
  onConfirm,
  onCancel,
  deleting,
  error,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  error: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-3">Delete account?</h2>
        <p className="text-sm text-gray-500 text-center leading-snug mb-4">
          This will permanently delete your account and all progress. This cannot be undone.
        </p>
        {error && (
          <p className="text-xs text-red-500 text-center leading-snug mb-4">{error}</p>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all mb-3 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {deleting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Deleting…
            </>
          ) : 'Delete forever'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="w-full text-gray-400 text-sm py-1.5 cursor-pointer hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}


// ── Main page ──────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const alias = useAuthStore((s) => s.alias);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const country = useAuthStore((s) => s.country);
  const country_sk = useAuthStore((s) => s.country_sk);
  const gender = useAuthStore((s) => s.gender);
  const xp = useProgressStore((s) => s.xp);
  const level = useProgressStore((s) => s.level);
  const streak = useProgressStore((s) => s.streak);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const snailRaceRecords = useProgressStore((s) => s.snailRaceRecords);
  const unlockedStages = useProgressStore((s) => s.unlockedStages);
  const unlockedReferenceCards = useProgressStore((s) => s.unlockedReferenceCards);

  // All useState hooks must be before any conditional return
  const [streakReminders, setStreakReminders] = useState(() => {
    try { return localStorage.getItem('streak_reminders_enabled') !== 'false'; }
    catch { return true; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // PWA install prompt — reads from shared module (captured in AppShell)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const [installAvailable, setInstallAvailable] = useState(() => canInstall());

  useEffect(() => {
    const update = () => setInstallAvailable(canInstall());
    window.addEventListener('pwa-prompt-available', update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener('pwa-prompt-available', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  const handleInstall = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') markInstalled();
    else markShown();
    setInstallAvailable(false);
  };

  // Redirect guests to auth
  if (!user) return <Navigate to="/auth" replace />;

  // ── Derived values ───────────────────────────────────────────────────────────

  const rawName =
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    '?';
  const displayName = String(rawName);
  const displayLetter = displayName[0].toUpperCase();

  const memberSince = user.created_at
    ? `Member since ${new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    : '';

  // XP progress through current level (each level = 200 XP)
  const xpIntoLevel = xp % 200;
  const xpProgress = Math.round((xpIntoLevel / 200) * 100);
  const xpToNext = 200 - xpIntoLevel;

  // Learning stats
  const bestSnailScore =
    snailRaceRecords.length > 0
      ? Math.max(...snailRaceRecords.map((r) => r.bestScore))
      : null;

  const daysActive = new Set(
    lessonRecords.map((r) => r.completedAt.split('T')[0])
  ).size;

  const dialoguesCompleted = (() => {
    try { return parseInt(localStorage.getItem('dialogues_completed') ?? '0', 10) || 0; }
    catch { return 0; }
  })();

  // Stage progress rows
  const stageProgress = ALL_STAGE_IDS.map((stageId) => {
    const stageLessons = lessons.filter((l) => l.stageId === stageId);
    const completed = stageLessons.filter((l) => completedLessons.includes(l.id)).length;
    const unlocked = unlockedStages.includes(stageId);
    const isDone = unlocked && completed === stageLessons.length;
    return { stageId, name: STAGE_NAMES[stageId] ?? stageId, total: stageLessons.length, completed, unlocked, isDone };
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleToggleReminders = (val: boolean) => {
    setStreakReminders(val);
    try { localStorage.setItem('streak_reminders_enabled', String(val)); } catch { /* */ }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteConfirmed = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc('delete_user');
    if (error) {
      setDeleteError('Deletion failed. Please try again or contact contact@slovakforforeigners.eu');
      setDeleting(false);
      return;
    }
    try { localStorage.clear(); } catch { /* */ }
    window.location.replace('/');
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#E8F4DC]">
      <div className="max-w-[480px] mx-auto px-4 pt-8 pb-28 space-y-6">

        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center pb-2">
          <div
            className="rounded-full bg-brand-green flex items-center justify-center text-white font-extrabold mb-4 shrink-0"
            style={{ width: 72, height: 72, fontSize: 30 }}
          >
            {displayLetter}
          </div>
          <h1 className="text-xl font-extrabold text-gray-800 leading-tight">{displayName}</h1>
          <p className="text-sm text-gray-400 mt-1">{user.email}</p>
          <p className="text-xs text-gray-500 mt-1">User Alias: <span className="font-semibold text-gray-700">{alias || '—'}</span></p>
          {memberSince && <p className="text-xs text-gray-400 mt-1">{memberSince}</p>}
        </div>

        {/* ── 2. Stats grid ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Stats</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            {([
              { icon: '🔥', value: streak, label: 'Day streak' },
              { icon: '⚡', value: xp.toLocaleString(), label: 'Total XP' },
              { icon: '🏅', value: `Lv. ${level}`, label: 'Level' },
            ] as const).map(({ icon, value, label }) => (
              <div
                key={label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center py-4 px-2 gap-1"
              >
                <span className="text-2xl leading-none">{icon}</span>
                <span className="text-lg font-extrabold text-gray-800 mt-1">{value}</span>
                <span className="text-xs text-gray-400 text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. XP progress bar ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Progress</SectionLabel>
          <Card>
            <div className="px-4 py-4">
              <p className="text-xs text-gray-400 text-center mb-3">Progress to next level</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">Level {level}</span>
                <span className="text-xs text-gray-400">{xpToNext} XP to Level {level + 1}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ── 4. Learning stats ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Learning</SectionLabel>
          <Card>
            {([
              { icon: '📚', label: 'Lessons completed', value: `${completedLessons.length} / ${lessons.length}` },
              { icon: '💬', label: 'Dialogues practiced', value: String(dialoguesCompleted) },
              { icon: '🐌', label: 'Best Snail Race score', value: bestSnailScore !== null ? String(bestSnailScore) : '—' },
              { icon: '📅', label: 'Days active', value: String(daysActive) },
              { icon: '🏆', label: 'Stages unlocked', value: `${unlockedStages.length} / ${ALL_STAGE_IDS.length}` },
            ] as const).map(({ icon, label, value }, i, arr) => (
              <Row key={label} last={i === arr.length - 1}>
                <span className="text-xl w-7 flex-none text-center leading-none">{icon}</span>
                <span className="text-sm text-gray-700 flex-1">{label}</span>
                <span className="text-sm font-bold text-gray-800">{value}</span>
              </Row>
            ))}
          </Card>
        </div>

        {/* ── 5. Stage progress ──────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Stage progress</SectionLabel>
          <Card>
            {stageProgress.map((s, i) => (
              <Row key={s.stageId} last={i === stageProgress.length - 1}>
                <span className="text-xl w-7 flex-none text-center leading-none">
                  {!s.unlocked ? '🔒' : s.isDone ? '✅' : '🔓'}
                </span>
                <span className="text-sm text-gray-700 flex-1">{s.name}</span>
                {!s.unlocked ? (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full font-semibold">
                    Locked
                  </span>
                ) : s.isDone ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold">
                    Complete
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-gray-500">
                    {s.completed} / {s.total}
                  </span>
                )}
              </Row>
            ))}
          </Card>
        </div>

        {/* ── 6. Reference Cards ─────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Reference Cards</SectionLabel>
          <Card>
            {foreignPoliceLessons
              .filter((l) => !l.coming_soon)
              .map((l, i, arr) => {
                const hasCard = unlockedReferenceCards.includes(l.unlocksReferenceCard);
                return (
                  <Row key={l.id} last={i === arr.length - 1} onClick={hasCard ? () => navigate(`/foreigner-exclusive/lesson/${l.id}?card=1`) : undefined}>
                    <span className="text-xl w-7 flex-none text-center leading-none">
                      {hasCard ? '📋' : '🔒'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${hasCard ? 'text-gray-800' : 'text-gray-400'}`}>
                        {l.title}
                      </p>
                      <p className="text-xs text-gray-400 italic truncate">{l.titleSlovak}</p>
                    </div>
                    {hasCard ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-semibold shrink-0">Unlocked</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-0.5 rounded-full font-semibold shrink-0">Locked</span>
                    )}
                  </Row>
                );
              })}
          </Card>
        </div>

        {/* ── 7. Account settings ────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Account</SectionLabel>
          <Card>
            {/* Alias row — read-only */}
            <Row>
              <img
                src={alias ? getAvatarUrl(alias) : '/pp/FrogySnail.png'}
                alt=""
                className="w-10 h-10 rounded-full object-cover flex-none"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-0.5">Your alias</p>
                <p className="text-[10px] text-gray-400 leading-none mb-1">This is how others see you</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{alias || '—'}</p>
              </div>
            </Row>

            {/* Display name — read-only, sourced from Google */}
            <Row>
              <span className="text-xl w-7 flex-none text-center leading-none">🔑</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-0.5">Your name</p>
                <p className="text-[10px] text-gray-400 leading-none mb-1">From your Google account</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
              </div>
            </Row>

            {/* Country of origin — read-only */}
            <Row>
              <span className="text-xl w-7 flex-none text-center leading-none">🌍</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-0.5">Country of origin</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{country || '—'}</p>
                {country_sk && (
                  <p className="text-xs text-gray-400 truncate">{country_sk}</p>
                )}
              </div>
            </Row>

            {/* Gender — read-only */}
            <Row>
              <span className="text-xl w-7 flex-none text-center leading-none">👤</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-0.5">Gender</p>
                <p className="text-sm font-semibold text-gray-800">{gender || '—'}</p>
              </div>
            </Row>

            {/* Streak reminders toggle */}
            <Row last>
              <span className="text-xl w-7 flex-none text-center leading-none">🔔</span>
              <span className="text-sm text-gray-700 flex-1">Streak reminders</span>
              <Toggle on={streakReminders} onChange={handleToggleReminders} />
            </Row>
          </Card>
        </div>

        {/* ── 8. Install App ─────────────────────────────────────────────────── */}
        {!isStandalone && installAvailable && (
          <Card>
            <Row last onClick={handleInstall}>
              <span className="text-xl w-7 flex-none text-center leading-none">📲</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">Install App</p>
                <p className="text-xs text-gray-400">Add to your home screen</p>
              </div>
              <span className="text-xs text-brand-green font-semibold">Install</span>
            </Row>
          </Card>
        )}

        {/* ── 10. Sign out ───────────────────────────────────────────────────── */}
        <Card>
          <Row last onClick={handleSignOut}>
            <span className="text-xl w-7 flex-none text-center leading-none">🚪</span>
            <span className="text-sm font-semibold text-red-500">Sign out</span>
          </Row>
        </Card>

        {/* ── 10. Legal ──────────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>Legal</SectionLabel>
          <Card>
            <Row onClick={() => navigate('/privacy')}>
              <span className="text-xl w-7 flex-none text-center leading-none">🔏</span>
              <span className="text-sm text-gray-700 flex-1">Privacy Policy</span>
              <span className="text-xs text-gray-400">›</span>
            </Row>
            <Row last onClick={() => navigate('/terms')}>
              <span className="text-xl w-7 flex-none text-center leading-none">📄</span>
              <span className="text-sm text-gray-700 flex-1">Terms of Service</span>
              <span className="text-xs text-gray-400">›</span>
            </Row>
          </Card>
        </div>

        {/* ── 10. Admin — intentionally unremarkable ─────────────────────────── */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="w-full text-center text-gray-300 py-1 cursor-pointer"
          >
            ⁂
          </button>
        )}

        {/* ── 11. Delete account — plain text, no card ───────────────────────── */}
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full text-center text-xs text-gray-400 py-2 cursor-pointer hover:text-gray-500 transition-colors"
        >
          Delete account
        </button>

      </div>

      <BottomNav active="profile" />

      {showDeleteConfirm && (
        <ConfirmDeleteModal
          onConfirm={handleDeleteConfirmed}
          onCancel={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
          deleting={deleting}
          error={deleteError}
        />
      )}


    </div>
  );
}
