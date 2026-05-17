import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useProgressStore } from '../store/useProgressStore';
import { lessons } from '../data/lessons';
import { foreignPoliceLessons } from '../data/foreigner-exclusive/foreign-police';
import { supabase } from '../lib/supabase/client';
import { BottomNav } from '../components/ui/BottomNav';

// ── Stage metadata ─────────────────────────────────────────────────────────────

const STAGE_NAMES: Record<string, string> = {
  survival: 'Stage 1 — Survival',
  settling: 'Stage 2 — Settling In',
  advanced: 'Stage 3 — Advanced',
};

// Ordered list of all stages present in lesson data (preserves source order)
const ALL_STAGE_IDS = [...new Set(lessons.map((l) => l.stageId))];

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
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-3">Delete account?</h2>
        <p className="text-sm text-gray-500 text-center leading-snug mb-6">
          This will permanently delete your account and all progress. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={onConfirm}
          className="w-full bg-red-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all mb-3"
        >
          Delete forever
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-gray-400 text-sm py-1.5 cursor-pointer hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ContactSupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-3">Contact support</h2>
        <p className="text-sm text-gray-500 text-center leading-snug mb-6">
          To delete your account please contact us at{' '}
          <span className="font-semibold text-gray-700 break-all">
            support@learnslovakforforeigners.com
          </span>
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Got it
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
  const xp = useProgressStore((s) => s.xp);
  const level = useProgressStore((s) => s.level);
  const streak = useProgressStore((s) => s.streak);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const snailRaceRecords = useProgressStore((s) => s.snailRaceRecords);
  const unlockedStages = useProgressStore((s) => s.unlockedStages);
  const unlockedReferenceCards = useProgressStore((s) => s.unlockedReferenceCards);

  // All useState hooks must be before any conditional return
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [streakReminders, setStreakReminders] = useState(() => {
    try { return localStorage.getItem('streak_reminders_enabled') !== 'false'; }
    catch { return true; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);

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

  const handleEditStart = () => {
    setNameInput(displayName);
    setNameError('');
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) { setNameError('Name cannot be empty.'); return; }
    if (trimmed.length > 50) { setNameError('Name must be 50 characters or fewer.'); return; }
    if (/[<>]/.test(trimmed)) { setNameError('Name contains invalid characters.'); return; }
    if (trimmed === displayName) { setEditingName(false); return; }
    setNameSaving(true);
    setNameError('');
    try {
      const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
      if (authErr) throw authErr;
      await supabase.from('user_profiles').update({ display_name: trimmed }).eq('id', user.id);
      setEditingName(false);
    } catch {
      setNameError('Could not save. Please try again.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleToggleReminders = (val: boolean) => {
    setStreakReminders(val);
    try { localStorage.setItem('streak_reminders_enabled', String(val)); } catch { /* */ }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteConfirmed = () => {
    setShowDeleteConfirm(false);
    setShowDeleteMessage(true);
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
                  <Row key={l.id} last={i === arr.length - 1} onClick={hasCard ? () => navigate('/foreigner-exclusive/foreign-police') : undefined}>
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
            {/* Display name row */}
            {editingName ? (
              <div className="px-4 py-3.5 border-b border-gray-50">
                <p className="text-xs text-gray-400 mb-1.5 font-medium">Display name</p>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setNameError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 mb-2 focus:outline-none focus:border-brand-green transition-colors"
                  autoFocus
                  maxLength={50}
                />
                {nameError && <p className="text-xs text-red-500 mb-2">{nameError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    className="flex-1 bg-brand-green text-white text-sm font-bold py-2.5 rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {nameSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingName(false); setNameError(''); }}
                    className="flex-1 text-sm text-gray-500 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <Row>
                <span className="text-xl w-7 flex-none text-center leading-none">✏️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 leading-none mb-0.5">Display name</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleEditStart}
                  className="text-xs text-brand-green font-semibold cursor-pointer hover:opacity-70 transition-opacity shrink-0"
                >
                  Edit
                </button>
              </Row>
            )}

            {/* Streak reminders toggle */}
            <Row last>
              <span className="text-xl w-7 flex-none text-center leading-none">🔔</span>
              <span className="text-sm text-gray-700 flex-1">Streak reminders</span>
              <Toggle on={streakReminders} onChange={handleToggleReminders} />
            </Row>
          </Card>
        </div>

        {/* ── 8. Legal ───────────────────────────────────────────────────────── */}
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

        {/* ── 9. Sign out ────────────────────────────────────────────────────── */}
        <Card>
          <Row last onClick={handleSignOut}>
            <span className="text-xl w-7 flex-none text-center leading-none">🚪</span>
            <span className="text-sm font-semibold text-red-500">Sign out</span>
          </Row>
        </Card>

        {/* ── 10. Delete account ─────────────────────────────────────────────── */}
        <div className="opacity-60">
          <Card>
            <Row last onClick={() => setShowDeleteConfirm(true)}>
              <span className="text-xl w-7 flex-none text-center leading-none">🗑️</span>
              <span className="text-sm font-semibold text-red-500">Delete account</span>
            </Row>
          </Card>
        </div>

      </div>

      <BottomNav active="profile" />

      {showDeleteConfirm && !showDeleteMessage && (
        <ConfirmDeleteModal
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showDeleteMessage && (
        <ContactSupportModal
          onClose={() => { setShowDeleteMessage(false); setShowDeleteConfirm(false); }}
        />
      )}
    </div>
  );
}
