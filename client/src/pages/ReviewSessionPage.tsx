import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { useProgressStore, computeStrength } from '../store/useProgressStore';
import type { LessonRecord } from '../store/useProgressStore';
import { ExerciseShell } from '../components/exercises/ExerciseShell';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ExerciseCelebration } from '../components/ui/ExerciseCelebration';
import type { Exercise } from '../types/lesson';

interface ReviewItem {
  exercise: Exercise;
  lessonTitle: string;
  lessonId: string;
}

interface ReviewedLesson {
  id: string;
  title: string;
  strengthBefore: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Milliseconds until the soonest nextReviewDue among all lesson records.
function msUntilNextDue(lessonRecords: LessonRecord[]): number {
  const now = Date.now();
  let soonest = Infinity;
  for (const r of lessonRecords) {
    if (r.nextReviewDue) {
      const due = new Date(r.nextReviewDue).getTime();
      if (due > now) soonest = Math.min(soonest, due - now);
    }
  }
  return soonest === Infinity ? 0 : soonest;
}

// Distribute `total` exercises across lessons weighted by strikesInLastReview.
// Lessons the user struggled with most recently get more exercises; each lesson gets at least 1.
function weightedCounts(records: LessonRecord[], total: number): Map<string, number> {
  const n = records.length;
  const result = new Map<string, number>();
  if (n === 0) return result;

  const weights = records.map((r) => r.strikesInLastReview + 1); // +1 so 0-strike lessons still get weight
  const totalW = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / totalW) * total);
  const counts = raw.map(Math.floor);
  let remaining = total - counts.reduce((a, b) => a + b, 0);

  for (let i = 0; i < n; i++) {
    if (counts[i] === 0) { counts[i] = 1; remaining--; }
  }
  if (remaining > 0) {
    const order = raw
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < Math.min(remaining, order.length); k++) {
      counts[order[k].i]++;
    }
  }

  records.forEach((r, i) => result.set(r.lessonId, counts[i]));
  return result;
}

// Build a session from due lessons (already sorted/capped by getDueLessons in the store).
// Each lesson gets 2 exercises (weighted by strikesInLastReview); exercises are shuffled.
const EXERCISES_PER_LESSON = 2;

function buildSession(
  completedLessonIds: string[],
  lessonRecords: LessonRecord[],
  reviewTargetIds: string[], // due lesson IDs, pre-sorted by priority, pre-capped at 3
): {
  items: ReviewItem[];
  reviewed: ReviewedLesson[];
} {
  const nowMs = Date.now();
  const dueIds = reviewTargetIds.filter((id) => completedLessonIds.includes(id));
  const targetLessons = lessons.filter((l) => dueIds.includes(l.id));

  const targetRecords = targetLessons
    .map((l) => lessonRecords.find((r) => r.lessonId === l.id))
    .filter((r): r is LessonRecord => !!r)
    .sort((a, b) => b.strikesInLastReview - a.strikesInLastReview);

  const counts = weightedCounts(targetRecords, targetRecords.length * EXERCISES_PER_LESSON);

  const items: ReviewItem[] = [];
  const reviewed: ReviewedLesson[] = [];

  targetRecords.forEach((record) => {
    const lesson = targetLessons.find((l) => l.id === record.lessonId)!;
    const strengthBefore = computeStrength(record, nowMs);
    reviewed.push({ id: lesson.id, title: lesson.title, strengthBefore });

    const pool = lesson.exercises.filter(
      (e) =>
        e.type !== 'WORD_MATCH_REVIEW' &&
        e.type !== 'VOCABULARY_INTRO' &&
        e.type !== 'VOCABULARY_TABLE' &&
        e.type !== 'LISTEN_AND_PICK',
    );
    const n = counts.get(lesson.id) ?? 1;
    const picked = shuffle(pool).slice(0, n);
    picked.forEach((ex) =>
      items.push({ exercise: ex, lessonTitle: lesson.title, lessonId: lesson.id }),
    );
  });

  return { items: shuffle(items), reviewed };
}

function AllCaughtUpScreen({ lessonRecords, onBack }: { lessonRecords: LessonRecord[]; onBack: () => void }) {
  const [ms, setMs] = useState(() => msUntilNextDue(lessonRecords));

  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextDue(lessonRecords)), 1000);
    return () => clearInterval(t);
  }, [lessonRecords]);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center gap-6 max-w-lg mx-auto w-full">
      <img src="/snail.png" alt="" className="w-28 h-28 object-contain" />
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">All caught up!</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          No lessons are due right now.<br />
          Your intervals are working — come back when the next one is ready.
        </p>
      </div>
      {ms > 0 && (
        <div className="bg-white rounded-2xl px-8 py-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Next review due in</p>
          <p className="text-3xl font-extrabold text-brand-green tabular-nums">{formatCountdown(ms)}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onBack}
        className="bg-brand-green text-white font-bold py-3 px-10 rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all"
      >
        Back to Home
      </button>
    </div>
  );
}

type Screen = 'intro' | 'session' | 'complete';

export function ReviewSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useProgressStore();
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const reviewTargetIds = useProgressStore((s) => s.reviewTargetIds);

  const autoTriggered = (location.state as { autoTriggered?: boolean } | null)?.autoTriggered ?? false;

  const [session] = useState(() =>
    buildSession(store.completedLessons, store.lessonRecords, reviewTargetIds)
  );
  const [screen, setScreen] = useState<Screen>('intro');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseKey, setExerciseKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [xpResult, setXpResult] = useState(0);

  const correctCountRef = useRef(0);
  const totalStrikesRef = useRef(0);
  // Per-lesson strike tracking for per-lesson interval advancement
  const lessonStrikesRef = useRef<Map<string, number>>(new Map());

  // Retry queue — wrong answers are appended after each pass until all answered correctly
  const workingQueueRef = useRef<ReviewItem[]>([...session.items]);
  const passStartIdxRef = useRef(0);
  const passEndIdxRef = useRef(session.items.length - 1);
  const wrongInPassRef = useRef<ReviewItem[]>([]);
  const [retryRound, setRetryRound] = useState(0);

  // All hooks above — early returns below are safe
  if (session.items.length === 0) {
    return <AllCaughtUpScreen lessonRecords={lessonRecords} onBack={() => navigate('/')} />;
  }

  if (screen === 'intro') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 py-10 gap-5 max-w-lg mx-auto w-full">
        <img src="/snailReading.png" alt="" className="w-32 h-32 object-contain" />

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-gray-800 mb-3">Time to Review! 📚</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            Answer every exercise correctly to finish — wrong answers come back until you get them right.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            After completing it, all your lesson indicators will turn green.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          {session.reviewed.map((r) => {
            const dot = r.strengthBefore === 0 ? '🔴' : r.strengthBefore < 80 ? '🟡' : '🟢';
            const barColor = r.strengthBefore === 0 ? 'bg-red-500' : r.strengthBefore < 80 ? 'bg-amber-400' : 'bg-brand-green';
            return (
              <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{dot}</span>
                  <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0 truncate">{r.title}</span>
                  <span className="text-xs text-gray-400 tabular-nums shrink-0">{r.strengthBefore}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${r.strengthBefore}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setScreen('session')}
          className="w-full max-w-sm bg-brand-green text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all"
        >
          Start Review
        </button>

        {!autoTriggered && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-gray-400 text-sm py-1 cursor-pointer hover:text-gray-600 transition-colors"
          >
            Maybe Later
          </button>
        )}
      </div>
    );
  }

  if (screen === 'complete') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 py-10 gap-6 max-w-lg mx-auto w-full">
        <img src="/snailExcited.png" alt="" className="w-28 h-28 object-contain" />
        <h1 className="text-2xl font-extrabold text-gray-800">Review Complete! 📚</h1>

        <div className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-1">XP earned</p>
          <p className="text-3xl font-extrabold text-brand-green">+{xpResult}</p>
          {/* eslint-disable-next-line react-hooks/refs */}
          {totalStrikesRef.current === 0 && (
            <p className="text-xs text-amber-600 font-semibold mt-1">Perfect review! +2 bonus XP</p>
          )}
        </div>

        <div className="w-full max-w-sm space-y-3">
          {session.reviewed.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <p className="text-sm font-bold text-gray-700 mb-2">{r.title}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-green rounded-full w-full" />
                </div>
                <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                  {r.strengthBefore}% → 100%
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center">All lessons restored to full strength 🟢</p>

        <p className="text-xs text-gray-400 text-center mt-1">This counts toward your weekly practice days ✓</p>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="bg-brand-green text-white font-bold py-3 px-10 rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const currentItem = workingQueueRef.current[exerciseIndex];

  const advance = () => {
    setExerciseIndex((i) => i + 1);
    setExerciseKey((k) => k + 1);
  };

  const handleAnswer = (correct: boolean) => {
    if (!correct) {
      totalStrikesRef.current += 1;
      const lessonId = workingQueueRef.current[exerciseIndex]?.lessonId;
      if (lessonId) {
        lessonStrikesRef.current.set(lessonId, (lessonStrikesRef.current.get(lessonId) ?? 0) + 1);
      }
    }
  };

  const handleComplete = (correct: boolean) => {
    if (correct) correctCountRef.current += 1;

    // Collect wrong answers for retry
    if (!correct) wrongInPassRef.current.push(workingQueueRef.current[exerciseIndex]);

    const isPassEnd = exerciseIndex >= passEndIdxRef.current;

    if (isPassEnd) {
      const retries = [...wrongInPassRef.current];
      wrongInPassRef.current = [];

      if (retries.length === 0) {
        // Every exercise answered correctly — session complete
        const xp = Math.min(correctCountRef.current, 10) + (totalStrikesRef.current === 0 ? 2 : 0);
        setXpResult(xp);
        const lessonResults = session.reviewed.map((r) => ({
          lessonId: r.id,
          strikes: lessonStrikesRef.current.get(r.id) ?? 0,
        }));
        store.completeReview(xp, lessonResults);
        setScreen('complete');
        return;
      }

      // Append wrong answers as the next pass
      const nextPassStart = passEndIdxRef.current + 1;
      workingQueueRef.current = [...workingQueueRef.current, ...shuffle(retries)];
      passStartIdxRef.current = nextPassStart;
      passEndIdxRef.current = workingQueueRef.current.length - 1;
      setRetryRound((r) => r + 1);
    }

    if (correct) {
      setCelebrating(true);
    } else {
      advance();
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-[#E8F4DC]">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setShowExit(true)}
          className="w-9 h-9 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-gray-400 hover:border-gray-600 hover:text-gray-600 cursor-pointer transition-colors shrink-0"
        >
          ✕
        </button>
        {/* eslint-disable-next-line react-hooks/refs */}
        <ProgressBar current={exerciseIndex - passStartIdxRef.current} total={passEndIdxRef.current - passStartIdxRef.current + 1} />
        <span className="text-lg shrink-0">📚</span>
      </div>

      {/* "From: Lesson Title" + retry indicator */}
      <div className="flex-none px-4 pb-1 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {/* eslint-disable-next-line react-hooks/refs */}
          From: <span className="font-semibold text-gray-500">{currentItem.lessonTitle}</span>
        </p>
        {retryRound > 0 && (
          <p className="text-xs font-semibold text-amber-600">🔁 Try again</p>
        )}
      </div>

      {/* Exercise */}
      <div className="flex-1 min-h-0 flex flex-col max-w-lg mx-auto w-full px-4 pt-2 pb-3">
        <ExerciseShell
          key={exerciseKey}
          exercise={
            // eslint-disable-next-line react-hooks/refs
            currentItem.exercise
          }
          exerciseIndex={exerciseIndex}
          onComplete={handleComplete}
          onFailed={() => {}}
          onAnswer={handleAnswer}
          reviewPairs={[]}
        />
      </div>

      {showExit && (
        <ConfirmModal onConfirm={() => navigate('/')} onCancel={() => setShowExit(false)} />
      )}

      {celebrating && (
        <ExerciseCelebration onDone={() => { setCelebrating(false); advance(); }} />
      )}
    </div>
  );
}
