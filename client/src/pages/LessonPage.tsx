import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById } from '../data/lessons';
import { useProgressStore } from '../store/useProgressStore';
import { useAuthStore } from '../store/useAuthStore';
import { SOFT_DISMISS_KEY } from '../components/auth/SaveProgressModal';
import { ExerciseShell } from '../components/exercises/ExerciseShell';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ExerciseCelebration } from '../components/ui/ExerciseCelebration';

const MAX_TOTAL    = 5; // 5 total strikes → back to previous exercise
const MAX_CONSEC   = 3; // 3 consecutive strikes → restart from exercise 1
const MAX_EXERCISE = 2; // 2+ strikes on an exercise → must redo it on complete

type PenaltyInfo = { title: string; sub: string; image?: string } | null;

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const store = useProgressStore();

  const lesson = lessonId ? getLessonById(lessonId) : undefined;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [exerciseKey, setExerciseKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [penalty, setPenalty] = useState<PenaltyInfo>(null);

  const strikesRef   = useRef({ total: 0, consecutive: 0, lessonTotal: 0 });
  const [strikesDisplay, setStrikesDisplay] = useState({ total: 0, consecutive: 0 });
  const penaltyRef   = useRef(false);
  const failedWordsRef = useRef<{ slovak: string; english: string }[]>([]);
  const hasShownSoftModal = useRef(false);
  const exercisesCompletedInSession = useRef(0);

  // Modal pause/resume
  const isModalOpen = useProgressStore((s) => s.showSaveProgressModal !== null);
  const pendingAdvance = useRef(false);
  const prevModalOpenRef = useRef(false);

  // When modal closes, execute any deferred advance
  useEffect(() => {
    const wasOpen = prevModalOpenRef.current;
    prevModalOpenRef.current = isModalOpen;
    if (wasOpen && !isModalOpen && pendingAdvance.current) {
      pendingAdvance.current = false;
      const lessonTotal = strikesRef.current.lessonTotal;
      strikesRef.current = { total: 0, consecutive: 0, lessonTotal };
      setStrikesDisplay({ total: 0, consecutive: 0 });
      setExerciseIndex((i) => i + 1);
      setExerciseKey((k) => k + 1);
    }
  }, [isModalOpen]);

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#E8F4DC]">
        <p className="text-gray-500">Lesson not found.</p>
      </div>
    );
  }

  const exercises = lesson.exercises;
  const currentExercise = exercises[exerciseIndex];

  const resetStrikes = () => {
    const lessonTotal = strikesRef.current.lessonTotal;
    strikesRef.current = { total: 0, consecutive: 0, lessonTotal };
    setStrikesDisplay({ total: 0, consecutive: 0 });
  };

  const bumpExerciseKey = () => setExerciseKey((k) => k + 1);

  const advance = () => {
    resetStrikes();
    setExerciseIndex((i) => i + 1);
    bumpExerciseKey();
  };

  const finishLesson = () => {
    const { xpEarned } = store.completeLesson(
      lesson.id,
      strikesRef.current.lessonTotal,
      exercises.length
    );
    store.checkAndUpdateStreak();
    navigate(`/celebration/${lesson.id}`, { state: { xpEarned, totalXP: lesson.xpReward } });
  };

  const handleFailed = (words: { slovak: string; english: string }[]) => {
    const existing = new Set(failedWordsRef.current.map((w) => w.slovak));
    const novel = words.filter((w) => !existing.has(w.slovak));
    failedWordsRef.current = [...failedWordsRef.current, ...novel];
  };

  const triggerPenalty = (info: NonNullable<PenaltyInfo>, doNav: () => void) => {
    penaltyRef.current = true;
    setPenalty(info);
    setTimeout(() => {
      resetStrikes();
      setPenalty(null);
      penaltyRef.current = false;
      doNav();
      bumpExerciseKey();
    }, 3500);
  };

  const handleAnswer = (correct: boolean) => {
    if (isModalOpen || penaltyRef.current) return;

    if (correct) {
      strikesRef.current.consecutive = 0;
      setStrikesDisplay((prev) => ({ ...prev, consecutive: 0 }));
      return;
    }

    strikesRef.current.total        += 1;
    strikesRef.current.consecutive  += 1;
    strikesRef.current.lessonTotal  += 1;
    const { total, consecutive } = strikesRef.current;
    setStrikesDisplay({ total, consecutive });

    if (consecutive >= MAX_CONSEC) {
      // Rule 1: 3 consecutive → restart from the very first exercise
      triggerPenalty(
        { title: '3 in a row!', sub: "Let's restart from the beginning!" },
        () => setExerciseIndex(0),
      );
    } else if (total >= MAX_TOTAL) {
      // Rule 2: 5 total → go back to the previous exercise
      const capturedIdx = exerciseIndex;
      triggerPenalty(
        { title: '', sub: "Let's review the last exercise" },
        () => setExerciseIndex(Math.max(0, capturedIdx - 1)),
      );
    }
  };

  const handleComplete = (correct: boolean) => {
    if (isModalOpen || penaltyRef.current) return;
    const isLast = exerciseIndex === exercises.length - 1;

    if (correct) {
      // Rule 3: exercise is only "clean" with 0 or 1 strike — 2+ means redo
      if (strikesRef.current.total >= MAX_EXERCISE) {
        triggerPenalty(
          { title: 'That was not clean!', sub: 'We redo this exercise again.', image: '/snailPerplexed.png' },
          () => { /* stay on same exercise — bumpExerciseKey inside triggerPenalty resets it */ },
        );
        return;
      }
      const nc = correctCount + 1;
      setCorrectCount(nc);

      // Soft modal — fires once at exercise 3, on lesson 3 or 5, for guests
      exercisesCompletedInSession.current += 1;
      if (
        !hasShownSoftModal.current &&
        exercisesCompletedInSession.current === 3 &&
        (store.completedLessons.length === 2 || store.completedLessons.length === 4) &&
        !useAuthStore.getState().user
      ) {
        try {
          const val = localStorage.getItem(SOFT_DISMISS_KEY);
          const dismissed = !!val && Date.now() < Number(val);
          if (!dismissed) {
            hasShownSoftModal.current = true;
            useProgressStore.setState({ showSaveProgressModal: 'soft' });
            pendingAdvance.current = true;
            return; // Pause here — useEffect resumes after modal closes
          }
        } catch { /* */ }
      }

      if (isLast) { finishLesson(); return; }
      const nextEx = exercises[exerciseIndex + 1];
      if (nextEx?.type === 'WORD_MATCH_REVIEW' && failedWordsRef.current.length === 0) {
        finishLesson();
        return;
      }
      setCelebrating(true);
    } else {
      if (isLast) { finishLesson(); return; }
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
          className="w-9 h-9 border-2 border-dashed border-brand-gray rounded-lg flex items-center justify-center text-brand-gray hover:border-gray-600 hover:text-gray-600 cursor-pointer transition-colors shrink-0"
        >
          ✕
        </button>
        <ProgressBar current={exerciseIndex} total={exercises.length} />
        <div className="flex items-center gap-1 font-bold text-orange-500 shrink-0">
          <span className="text-lg">🔥</span>
          <span className="text-sm">{store.streak}</span>
        </div>
      </div>

      {/* Strike indicators */}
      <div className="flex-none flex items-center justify-end gap-1.5 px-4 pb-1">
        <span className="text-xs text-gray-400 mr-1">strikes</span>
        {Array.from({ length: MAX_TOTAL }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
              i < strikesDisplay.total
                ? 'bg-red-500 border-red-500 scale-110'
                : 'bg-transparent border-gray-300'
            }`}
          />
        ))}
      </div>

      {/* DEV jump bar */}
      {import.meta.env.DEV && (
        <div className="flex-none flex items-center gap-1.5 px-4 pb-1 flex-wrap">
          {exercises.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setCelebrating(false);
                resetStrikes();
                setExerciseIndex(i);
                bumpExerciseKey();
              }}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-all cursor-pointer ${
                i === exerciseIndex
                  ? 'bg-brand-blue text-white'
                  : 'bg-white/70 text-gray-500 hover:bg-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-1">dev</span>
        </div>
      )}

      {/* Exercise */}
      <div className="flex-1 min-h-0 flex flex-col max-w-lg mx-auto w-full px-4 pt-2 pb-3">
        <ExerciseShell
          key={exerciseKey}
          exercise={currentExercise}
          exerciseIndex={exerciseIndex}
          onComplete={handleComplete}
          onFailed={handleFailed}
          onAnswer={handleAnswer}
          reviewPairs={failedWordsRef.current}
        />
      </div>

      {showExit && (
        <ConfirmModal onConfirm={() => navigate('/')} onCancel={() => setShowExit(false)} />
      )}

      {celebrating && (
        <ExerciseCelebration onDone={() => { setCelebrating(false); advance(); }} />
      )}

      {/* Penalty overlay */}
      {penalty && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl px-8 py-10 max-w-xs w-full text-center shadow-2xl">
            <img src={penalty.image ?? '/snailAngry.png'} alt="" className="w-28 h-28 object-contain mx-auto mb-3" />
            <p className="text-xl font-extrabold text-gray-800 mb-1">{penalty.title || 'You Are Not Focus!'}</p>
            <p className="text-sm text-gray-500">{penalty.sub}</p>
          </div>
        </div>
      )}
    </div>
  );
}
