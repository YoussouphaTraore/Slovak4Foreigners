import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { foreignPoliceLessons } from '../data/foreigner-exclusive/foreign-police';
import { useProgressStore } from '../store/useProgressStore';
import { ForeignerExerciseShell } from '../components/foreigner-exclusive/ForeignerExerciseShell';
import { ReferenceCardScreen } from '../components/foreigner-exclusive/ReferenceCardScreen';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ExerciseCelebration } from '../components/ui/ExerciseCelebration';

const MAX_TOTAL    = 5; // 5 total strikes → back to previous exercise
const MAX_CONSEC   = 3; // 3 consecutive strikes → restart from exercise 1
const MAX_EXERCISE = 2; // 2+ strikes on an exercise when completing → redo it

type PenaltyInfo = { title: string; sub: string; image?: string } | null;
type Screen = 'lesson' | 'referenceCard';

export function ForeignerExclusiveLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const store = useProgressStore();

  const lesson = foreignPoliceLessons.find((l) => l.id === lessonId);

  const [screen, setScreen] = useState<Screen>('lesson');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [exerciseKey, setExerciseKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [penalty, setPenalty] = useState<PenaltyInfo>(null);

  const strikesRef = useRef({ total: 0, consecutive: 0, lessonTotal: 0 });
  const [strikesDisplay, setStrikesDisplay] = useState({ total: 0, consecutive: 0 });
  const penaltyRef = useRef(false);

  if (!lesson) {
    navigate('/foreigner-exclusive/foreign-police');
    return null;
  }

  if (screen === 'referenceCard' && lesson.referenceCard) {
    return (
      <div className="h-dvh flex flex-col max-w-lg mx-auto w-full">
        <ReferenceCardScreen
          card={lesson.referenceCard}
          onDone={() => navigate('/foreigner-exclusive/foreign-police')}
        />
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
    store.completeLesson(lesson.id, strikesRef.current.lessonTotal, exercises.length);
    store.unlockReferenceCard(lesson.unlocksReferenceCard);
    if (lesson.referenceCard) {
      setScreen('referenceCard');
    } else {
      navigate('/foreigner-exclusive/foreign-police');
    }
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
    if (penaltyRef.current) return;

    if (correct) {
      strikesRef.current.consecutive = 0;
      setStrikesDisplay((prev) => ({ ...prev, consecutive: 0 }));
      return;
    }

    strikesRef.current.total       += 1;
    strikesRef.current.consecutive += 1;
    strikesRef.current.lessonTotal += 1;
    const { total, consecutive } = strikesRef.current;
    setStrikesDisplay({ total, consecutive });

    if (consecutive >= MAX_CONSEC) {
      triggerPenalty(
        { title: '3 in a row!', sub: "Let's restart from the beginning!" },
        () => setExerciseIndex(0),
      );
    } else if (total >= MAX_TOTAL) {
      const capturedIdx = exerciseIndex;
      triggerPenalty(
        { title: '', sub: "Let's review the last exercise" },
        () => setExerciseIndex(Math.max(0, capturedIdx - 1)),
      );
    }
  };

  const handleComplete = (correct: boolean) => {
    if (penaltyRef.current) return;
    const isLast = exerciseIndex >= exercises.length - 1;

    if (correct) {
      if (strikesRef.current.total >= MAX_EXERCISE) {
        triggerPenalty(
          { title: 'That was not clean!', sub: 'We redo this exercise again.', image: '/snailPerplexed.png' },
          () => { /* stay — bumpExerciseKey inside triggerPenalty resets it */ },
        );
        return;
      }
      if (isLast) { finishLesson(); return; }
      setCelebrating(true);
    } else {
      if (isLast) { finishLesson(); return; }
      advance();
    }
  };

  return (
    <div className="h-dvh flex flex-col bg-[#E8F4DC] max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="flex-none flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setShowExit(true)}
          className="w-9 h-9 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-gray-400 hover:border-gray-600 hover:text-gray-600 cursor-pointer transition-colors shrink-0"
        >
          ✕
        </button>
        <ProgressBar current={exerciseIndex} total={exercises.length} />
        <span className="text-lg shrink-0">{lesson.icon}</span>
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

      {/* Lesson label */}
      <div className="flex-none px-4 pb-1">
        <p className="text-xs text-gray-400">
          <span className="font-semibold text-gray-500">{lesson.title}</span>
          {' · '}
          <span className="italic">{lesson.titleSlovak}</span>
        </p>
      </div>

      {/* DEV jump bar */}
      {import.meta.env.DEV && (
        <div className="flex-none flex items-center gap-1.5 px-4 pb-1 flex-wrap">
          {exercises.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
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
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-2 pb-3">
        <ForeignerExerciseShell
          key={exerciseKey}
          exercise={currentExercise}
          exerciseIndex={exerciseIndex}
          onComplete={handleComplete}
          onAnswer={handleAnswer}
        />
      </div>

      {showExit && (
        <ConfirmModal
          onConfirm={() => navigate('/foreigner-exclusive/foreign-police')}
          onCancel={() => setShowExit(false)}
        />
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
