import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById, lessons } from '../data/lessons';
import { useProgressStore } from '../store/useProgressStore';
import { useAuthStore } from '../store/useAuthStore';
import { SOFT_DISMISS_KEY } from '../components/auth/SaveProgressModal';
import { ExerciseShell } from '../components/exercises/ExerciseShell';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ExerciseCelebration } from '../components/ui/ExerciseCelebration';

const MAX_TOTAL      = 5;           // 5 total strikes → back to previous exercise
const MAX_CONSEC     = 3;           // 3 consecutive strikes → restart from exercise 1
const MAX_EXERCISE   = 2;           // 2+ strikes on an exercise → must redo it on complete
const CHECKPOINT_MS  = 4 * 60_000; // 4 minutes of active lesson time

type PenaltyInfo = { title: string; sub: string; image?: string } | null;

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const store = useProgressStore();

  const lesson = lessonId ? getLessonById(lessonId) : undefined;

  // Resume from partial progress if this lesson was saved mid-way
  const initialIndex = (() => {
    const p = useProgressStore.getState().partialLessonProgress;
    return p && p.lessonId === lessonId ? p.resumeFromIndex : 0;
  })();

  const [exerciseIndex, setExerciseIndex] = useState(initialIndex);
  const [correctCount, setCorrectCount] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [exerciseKey, setExerciseKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [penalty, setPenalty] = useState<PenaltyInfo>(null);
  const [showCheckpoint, setShowCheckpoint] = useState(false);

  const strikesRef   = useRef({ total: 0, consecutive: 0, lessonTotal: 0 });
  const wrongAnswersThisRun = useRef(0);
  const [strikesDisplay, setStrikesDisplay] = useState({ total: 0, consecutive: 0 });
  const penaltyRef   = useRef(false);
  const failedWordsRef = useRef<{ slovak: string; english: string }[]>([]);
  const hasShownSoftModal = useRef(false);
  const exercisesCompletedInSession = useRef(0);

  // ── 4-minute checkpoint timer ─────────────────────────────────────────────
  const timerStartRef    = useRef<number>(Date.now());
  const accumulatedMsRef = useRef<number>(0);
  const timerPausedRef   = useRef<boolean>(false);
  const checkpointShownRef   = useRef<boolean>(false);

  function getActiveMs() {
    if (timerPausedRef.current) return accumulatedMsRef.current;
    return accumulatedMsRef.current + (Date.now() - timerStartRef.current);
  }
  function resetTimer() {
    accumulatedMsRef.current = 0;
    timerStartRef.current = Date.now();
    timerPausedRef.current = false;
  }

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        accumulatedMsRef.current = getActiveMs();
        timerPausedRef.current = true;
      } else {
        timerStartRef.current = Date.now();
        timerPausedRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isStage1 = lesson.stageId === 'survival';
  const snailSuccess = isStage1 ? '/snailExcited.png' : '/snailExcitedListening.png';
  const snailFail    = isStage1 ? '/snailPerplexed.png' : '/snailPerplexedListening.png';

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
    if (useProgressStore.getState().partialLessonProgress?.lessonId === lesson.id) {
      store.clearPartialProgress();
    }
    const result = store.completeLesson(lesson.id, {
      lessonXpReward: lesson.xpReward,
      totalStrikes: strikesRef.current.lessonTotal,
      wrongAnswersThisRun: wrongAnswersThisRun.current,
    });
    store.checkAndUpdateStreak();
    navigate(`/celebration/${lesson.id}`, {
      state: {
        xpEarned: result.xpEarned,
        baseXP: result.baseXP,
        perfectBonusXP: result.perfectBonusXP,
        wasPerfectRun: result.wasPerfectRun,
        isFirstMastery: result.isFirstMastery,
        alreadyMastered: result.alreadyMastered,
        streakMultiplier: result.streakMultiplier,
        totalXP: lesson.xpReward,
      },
    });
  };

  const handleSaveAndExit = () => {
    store.savePartialProgress(lesson.id, exerciseIndex + 1);
    navigate('/');
  };

  const handleKeepGoing = () => {
    resetTimer();
    checkpointShownRef.current = false;
    setShowCheckpoint(false);
    advance();
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
    wrongAnswersThisRun.current     += 1;
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
          { title: 'That was not clean!', sub: 'We redo this exercise again.', image: snailFail },
          () => { /* stay on same exercise — bumpExerciseKey inside triggerPenalty resets it */ },
        );
        return;
      }
      const nc = correctCount + 1;
      setCorrectCount(nc);

      exercisesCompletedInSession.current += 1;

      // Soft login prompt — fires at exercise 5 of every even-numbered survival lesson
      // (i.e. 2nd, 4th, 6th) for guest users only. completedSurvivalCount is odd when
      // the user has finished 1, 3 or 5 survival lessons (meaning they're now on #2, #4, #6).
      if (
        !hasShownSoftModal.current &&
        nc === 5 &&
        lesson.stageId === 'survival' &&
        !useAuthStore.getState().user
      ) {
        const completedSurvivalCount = store.completedLessons.filter((id) =>
          lessons.some((l) => l.id === id && l.stageId === 'survival')
        ).length;
        if (completedSurvivalCount % 2 === 1) {
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
        <ExerciseCelebration image={snailSuccess} onDone={() => {
          setCelebrating(false);
          const remaining = exercises.length - exerciseIndex - 1;
          const isReplay = store.completedLessons.includes(lesson.id);
          if (!isReplay && remaining > 1 && getActiveMs() >= CHECKPOINT_MS && !checkpointShownRef.current) {
            checkpointShownRef.current = true;
            setShowCheckpoint(true);
          } else {
            advance();
          }
        }} />
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

      {/* Checkpoint modal */}
      {showCheckpoint && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl px-6 py-6 max-w-xs w-full text-center shadow-2xl">
            <img src="/SnailDrinking.png" alt="" className="w-16 h-16 object-contain mx-auto mb-2" />
            <p className="text-lg font-extrabold text-gray-800 mb-1">You've been at it for 4 minutes!</p>
            <p className="text-xs text-gray-500 mb-4">We care about our users mental health. Drink water!</p>
            <button
              type="button"
              onClick={handleKeepGoing}
              className="w-full bg-brand-green text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all mb-2"
            >
              Keep going
            </button>
            <button
              type="button"
              onClick={handleSaveAndExit}
              className="w-full bg-blue-100 text-blue-500 font-semibold py-2.5 rounded-xl text-sm cursor-pointer hover:bg-blue-200 active:scale-[0.98] transition-all"
            >
              Take a Break
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
