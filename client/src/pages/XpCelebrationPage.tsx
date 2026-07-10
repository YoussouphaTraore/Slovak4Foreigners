import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useProgressStore } from '../store/useProgressStore';
import { stage1LessonOrder, stage2LessonOrder } from '../config/stageBlocks';
import { stage1Topics } from '../config/stage1Topics';

interface LocationState {
  xpEarned: number;
  baseXP: number;
  perfectBonusXP: number;
  wasPerfectRun: boolean;
  isFirstMastery: boolean;
  alreadyMastered: boolean;
  streakMultiplier: number;
  totalXP: number;
}

const fallbackState: LocationState = {
  xpEarned: 10,
  baseXP: 10,
  perfectBonusXP: 0,
  wasPerfectRun: false,
  isFirstMastery: false,
  alreadyMastered: false,
  streakMultiplier: 1,
  totalXP: 10,
};

export function XpCelebrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const state = { ...fallbackState, ...((location.state as Partial<LocationState>) ?? {}) };
  const store = useProgressStore();

  const [displayXP, setDisplayXP] = useState(0);
  const [showPerfectBonus, setShowPerfectBonus] = useState(false);
  const rafRef = useRef<number>(0);
  const bonusTimeoutRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  const xpForLevel = store.xp;
  const xpInLevel = (xpForLevel - 1) % 100;
  const xpToNextLevel = 100 - xpInLevel;
  const progressPct = Math.min(100, Math.max(0, xpInLevel));
  const hasStreakBoost = state.streakMultiplier > 1;
  const displayTarget = showPerfectBonus ? state.baseXP + state.perfectBonusXP : state.baseXP;

  const stage1Idx = stage1LessonOrder.indexOf(lessonId ?? '');
  const stage2Idx = stage2LessonOrder.indexOf(lessonId ?? '');
  let nextLessonId: string | null = null;
  if (stage1Idx !== -1 && stage1Idx < stage1LessonOrder.length - 1) {
    nextLessonId = stage1LessonOrder[stage1Idx + 1];
  } else if (stage2Idx !== -1 && stage2Idx < stage2LessonOrder.length - 1) {
    nextLessonId = stage2LessonOrder[stage2Idx + 1];
  }

  const parentTopic = stage1Topics.find(t => t.lessonIds.includes(lessonId ?? ''));
  const backPath = parentTopic ? `/topic/${parentTopic.id}` : '/';

  const subtitle = state.isFirstMastery
    ? 'Perfect - not a single mistake.'
    : state.alreadyMastered && state.wasPerfectRun
      ? 'Perfect practice.'
      : state.alreadyMastered
        ? 'Great practice.'
        : 'You Are A Snail On Turbo!';

  useEffect(() => {
    confetti({
      particleCount: 140,
      spread: 82,
      origin: { y: 0.58 },
      colors: ['#58CC02', '#FFC800', '#1CB0F6', '#FF4B4B', '#ffffff'],
    });

    const duration = 1000;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayXP(Math.round(ease * state.baseXP));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (state.isFirstMastery && state.perfectBonusXP > 0) {
        bonusTimeoutRef.current = window.setTimeout(() => {
          setShowPerfectBonus(true);
          setDisplayXP(state.baseXP + state.perfectBonusXP);
        }, 300);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(bonusTimeoutRef.current);
    };
  }, [state.baseXP, state.isFirstMastery, state.perfectBonusXP]);

  return (
    <div className="relative min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8 text-center">
      <button
        type="button"
        onClick={() => navigate(backPath)}
        className="absolute top-4 left-4 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
        aria-label="Back to topic"
      >
        ←
      </button>
      <img src="/snailTurbo.png" alt="" className="w-32 h-32 object-contain mb-4 animate-bounce-once" />
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Lesson Complete!</h1>
      <p className="text-gray-500 mb-8">{subtitle}</p>

      <div className="w-full max-w-sm bg-amber-50 border-2 border-amber-200 rounded-2xl px-8 py-6 mb-5">
        <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-1">XP Earned</p>
        <p className="text-5xl font-bold text-brand-gold">+{displayXP}</p>
        <div className="min-h-[3rem] mt-3 flex flex-col items-center justify-center gap-1">
          {state.isFirstMastery && state.perfectBonusXP > 0 && showPerfectBonus && (
            <p className="text-sm font-bold text-brand-green">+{state.perfectBonusXP} Perfect bonus</p>
          )}
          {hasStreakBoost && (
            <p className="text-xs font-semibold text-amber-600/70">Includes streak boost</p>
          )}
          {state.xpEarned !== displayTarget && hasStreakBoost && (
            <p className="text-xs text-gray-400">Total awarded: +{state.xpEarned} XP</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-7">
        <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
          <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">Level</p>
          <p className="text-xl font-bold text-gray-700">{store.level}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
          <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">Streak</p>
          <p className="text-xl font-bold text-orange-500">{store.streak}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
          <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">Total XP</p>
          <p className="text-xl font-bold text-gray-700">{store.xp}</p>
        </div>
      </div>

      <div className="w-full max-w-sm mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Level {store.level}</span>
          <span>{xpToNextLevel} XP to Level {store.level + 1}</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        <button
          onClick={() => navigate(lessonId ? `/lesson/${lessonId}` : '/')}
          className="border-2 border-gray-200 bg-white text-gray-600 font-bold py-4 rounded-xl text-base hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
        >
          Practice Again
        </button>
        <button
          onClick={() => navigate(nextLessonId ? `/lesson/${nextLessonId}` : '/')}
          className="bg-brand-green text-white font-bold py-4 rounded-xl text-base hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          Next Lesson
        </button>
      </div>
    </div>
  );
}
