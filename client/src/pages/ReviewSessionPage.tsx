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

function msUntilNextReview(lastReviewedAt: string): number {
  const next = new Date(lastReviewedAt).getTime() + 12 * 3_600_000;
  return Math.max(0, next - Date.now());
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Max 6 exercises: up to 3 lessons × 2 exercises each
function buildSession(
  completedLessonIds: string[],
  lessonRecords: LessonRecord[],
  lastReviewedAt: string | null,
): {
  items: ReviewItem[];
  reviewed: ReviewedLesson[];
} {
  const nowMs = Date.now();
  const eligible = shuffle(
    lessons.filter((l) => completedLessonIds.includes(l.id))
  ).slice(0, 3);

  const items: ReviewItem[] = [];
  const reviewed: ReviewedLesson[] = [];

  eligible.forEach((lesson) => {
    const record = lessonRecords.find((r) => r.lessonId === lesson.id);
    const strengthBefore = record
      ? computeStrength(lastReviewedAt, record.completedAt, nowMs)
      : 0;
    reviewed.push({ id: lesson.id, title: lesson.title, strengthBefore });

    const pool = lesson.exercises.filter((e) => e.type !== 'WORD_MATCH_REVIEW');
    const picked = shuffle(pool).slice(0, 2);
    picked.forEach((ex) => items.push({ exercise: ex, lessonTitle: lesson.title, lessonId: lesson.id }));
  });

  return { items: shuffle(items), reviewed };
}

function AlreadyDoneScreen({ lastReviewedAt, onBack }: { lastReviewedAt: string; onBack: () => void }) {
  const [ms, setMs] = useState(() => msUntilNextReview(lastReviewedAt));

  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextReview(lastReviewedAt)), 1000);
    return () => clearInterval(t);
  }, [lastReviewedAt]);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center gap-6 max-w-lg mx-auto w-full">
      <img src="/snail.png" alt="" className="w-28 h-28 object-contain" />
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">All caught up!</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          You've completed your review session.<br />
          Come back in 12 hours to keep your lessons strong.
        </p>
      </div>
      <div className="bg-white rounded-2xl px-8 py-5 shadow-sm border border-gray-100">
        <p className="text-xs text-gray-400 mb-1">Next review available in</p>
        <p className="text-3xl font-extrabold text-brand-green tabular-nums">{formatCountdown(ms)}</p>
      </div>
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
  const lastReviewedAt = useProgressStore((s) => s.lastReviewedAt);

  const autoTriggered = (location.state as { autoTriggered?: boolean } | null)?.autoTriggered ?? false;

  const hoursElapsed = lastReviewedAt
    ? (Date.now() - new Date(lastReviewedAt).getTime()) / 3_600_000
    : null;

  // Already done if reviewed within the last 12 hours
  const alreadyDone = hoursElapsed !== null && hoursElapsed < 12;

  const [session] = useState(() =>
    buildSession(store.completedLessons, store.lessonRecords, lastReviewedAt)
  );
  const [screen, setScreen] = useState<Screen>('intro');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseKey, setExerciseKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [xpResult, setXpResult] = useState(0);

  const correctCountRef = useRef(0);
  const totalStrikesRef = useRef(0);

  // All hooks above — early returns below are safe
  if (alreadyDone) {
    return <AlreadyDoneScreen lastReviewedAt={lastReviewedAt!} onBack={() => navigate('/')} />;
  }

  if (session.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center gap-6 max-w-lg mx-auto w-full">
        <img src="/snail.png" alt="" className="w-28 h-28 object-contain" />
        <h1 className="text-xl font-extrabold text-gray-800">Nothing to review yet!</h1>
        <p className="text-sm text-gray-500">Complete some lessons first and come back.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="bg-brand-green text-white font-bold py-3 px-10 rounded-xl hover:opacity-90 cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (screen === 'intro') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 py-10 gap-5 max-w-lg mx-auto w-full">
        <img src="/snailReading.png" alt="" className="w-32 h-32 object-contain" />

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-gray-800 mb-3">Time to Review! 📚</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            Keep your lessons strong with a quick 6-exercise session.
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

  const currentItem = session.items[exerciseIndex];

  const advance = () => {
    setExerciseIndex((i) => i + 1);
    setExerciseKey((k) => k + 1);
  };

  const handleAnswer = (correct: boolean) => {
    if (!correct) totalStrikesRef.current += 1;
  };

  const handleComplete = (correct: boolean) => {
    if (correct) correctCountRef.current += 1;

    const isLast = exerciseIndex >= session.items.length - 1;
    if (isLast) {
      const xp = Math.min(correctCountRef.current, 10) + (totalStrikesRef.current === 0 ? 2 : 0);
      setXpResult(xp);
      store.completeReview(xp, session.reviewed.map((r) => r.id));
      setScreen('complete');
    } else if (correct) {
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
        <ProgressBar current={exerciseIndex} total={session.items.length} />
        <span className="text-lg shrink-0">📚</span>
      </div>

      {/* "From: Lesson Title" label */}
      <div className="flex-none px-4 pb-1">
        <p className="text-xs text-gray-400">
          From: <span className="font-semibold text-gray-500">{currentItem.lessonTitle}</span>
        </p>
      </div>

      {/* Exercise */}
      <div className="flex-1 min-h-0 flex flex-col max-w-lg mx-auto w-full px-4 pt-2 pb-3">
        <ExerciseShell
          key={exerciseKey}
          exercise={currentItem.exercise}
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
