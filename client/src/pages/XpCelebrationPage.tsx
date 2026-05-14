import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useProgressStore } from '../store/useProgressStore';

interface LocationState {
  xpEarned: number;
  totalXP: number;
}

export function XpCelebrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState) ?? { xpEarned: 10, totalXP: 10 };
  const store = useProgressStore();

  const [displayXP, setDisplayXP] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  const xpForLevel = store.xp;
  const xpInLevel = ((xpForLevel - 1) % 100);
  const xpToNextLevel = 100 - xpInLevel;
  const progressPct = Math.min(100, xpInLevel);

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#58CC02', '#FFC800', '#1CB0F6', '#FF4B4B', '#ffffff'],
    });

    const duration = 1200;
    const target = state.xpEarned;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayXP(Math.round(ease * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.xpEarned]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <img src="/snailTurbo.png" alt="" className="w-32 h-32 object-contain mb-4 animate-bounce-once" />
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Lesson Complete!</h1>
      <p className="text-gray-500 mb-8">You Are A Snail On Turbo!</p>

      {/* XP earned */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-10 py-6 mb-6">
        <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-1">XP Earned</p>
        <p className="text-5xl font-bold text-brand-gold">+{displayXP}</p>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-center">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Level</p>
          <p className="text-2xl font-bold text-gray-800">{store.level}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-center">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Streak</p>
          <p className="text-2xl font-bold text-orange-500">🔥 {store.streak}</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-5 py-4 text-center">
          <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Total XP</p>
          <p className="text-2xl font-bold text-gray-800">{store.xp}</p>
        </div>
      </div>

      {/* XP ring / progress bar to next level */}
      <div className="w-full max-w-xs mb-8">
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

      <button
        onClick={() => navigate('/')}
        className="w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-xl text-lg hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
      >
        Continue
      </button>
    </div>
  );
}
