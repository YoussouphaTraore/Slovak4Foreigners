import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { useProgressStore } from '../store/useProgressStore';
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

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function buildSession(lessonRecords: LessonRecord[]): {
  items: ReviewItem[];
  reviewed: ReviewedLesson[];
} {
  const weakRecords = lessonRecords
    .filter((r) => r.strength < 70)
    .sort((a, b) => a.strength - b.strength)
    .slice(0, 3);

  const items: ReviewItem[] = [];
  const reviewed: ReviewedLesson[] = [];

  weakRecords.forEach((record, idx) => {
    const lesson = lessons.find((l) => l.id === record.lessonId);
    if (!lesson) return;
    reviewed.push({ id: lesson.id, title: lesson.title, strengthBefore: record.strength });

    // Exclude WORD_MATCH_REVIEW — it needs lesson-session failed-word context
    const eligible = lesson.exercises.filter((e) => e.type !== 'WORD_MATCH_REVIEW');
    const count = Math.min(idx === 0 ? 4 : 3, eligible.length);
    const picked = shuffle(eligible).slice(0, count);
    picked.forEach((ex) => items.push({ exercise: ex, lessonTitle: lesson.title, lessonId: lesson.id }));
  });

  return { items: shuffle(items), reviewed };
}

function AlreadyDoneScreen({ onBack }: { onBack: () => void }) {
  const [ms, setMs] = useState(msUntilMidnight);

  useEffect(() => {
    const t = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center gap-6 max-w-lg mx-auto w-full">
      <img src="/snail.png" alt="" className="w-28 h-28 object-contain" />
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">All caught up!</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          You've already done your review today.<br />
          Come back tomorrow to keep your lessons strong.
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
  const lastReviewDate = useProgressStore((s) => s.lastReviewDate);

  const autoTriggered = (location.state as { autoTriggered?: boolean } | null)?.autoTriggered ?? false;

  const [session] = useState(() => buildSession(store.lessonRecords));
  const [screen, setScreen] = useState<Screen>('intro');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseKey, setExerciseKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [xpResult, setXpResult] = useState(0);

  const correctCountRef = useRef(0);
  const totalStrikesRef = useRef(0);

  const alreadyDone = lastReviewDate === todayStr();

  // All hooks above — early returns below are safe
  if (alreadyDone) {
    return <AlreadyDoneScreen onBack={() => navigate('/')} />;
  }

  if (session.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center gap-6 max-w-lg mx-auto w-full">
        <img src="/snail.png" alt="" className="w-28 h-28 object-contain" />
        <h1 className="text-xl font-extrabold text-gray-800">Nothing to review!</h1>
        <p className="text-sm text-gray-500">All your lessons are looking great.</p>
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
            Some of your lessons are getting weak — let's strengthen them before you forget.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            This is a short mixed session from your weakest lessons. It only takes a few minutes.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          {session.reviewed.map((r) => {
            const dot = r.strengthBefore < 30 ? '🔴' : r.strengthBefore < 60 ? '🟡' : '🟢';
            const barColor = r.strengthBefore < 30 ? 'bg-red-500' : r.strengthBefore < 60 ? 'bg-amber-400' : 'bg-brand-green';
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
          {session.reviewed.map((r) => {
            const after = Math.min(100, r.strengthBefore + 20);
            return (
              <div key={r.id} className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-2">{r.title}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-green rounded-full"
                      style={{ width: `${after}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {r.strengthBefore}% → {after}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

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
