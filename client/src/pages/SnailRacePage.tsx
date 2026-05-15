import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { buildRacePool, type RaceQuestion } from '../utils/buildRacePool';

const RACE_DURATION = 60;
const BONUS_SECONDS = 3;

type Phase = 'idle' | 'running' | 'finished';
type Flash = 'correct' | 'wrong' | null;

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playCorrect() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Two ascending sine tones — cheerful "ding ding"
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch {}
}

function playWrong() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    // Descending sawtooth buzz — harsh "bzzzt"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {}
}

// ── Component ─────────────────────────────────────────────────────────────────
// Ordered unique stageIds as they appear in the lesson array
const stageOrder = [...new Set(lessons.map((l) => l.stageId))];

// Return all lessons from stages up to and including the given stageId.
// If stageId is unknown or omitted, fall back to all lessons.
function getLessonPool(stageId?: string): typeof lessons {
  const idx = stageId ? stageOrder.indexOf(stageId) : -1;
  if (idx === -1) return lessons;
  return lessons.filter((l) => stageOrder.indexOf(l.stageId) <= idx);
}

export function SnailRacePage() {
  const navigate = useNavigate();
  const { stageId } = useParams<{ stageId?: string }>();
  const lessonPool = getLessonPool(stageId);
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<RaceQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(RACE_DURATION);
  const [flash, setFlash] = useState<Flash>(null);
  const [showBonus, setShowBonus] = useState(false);
  const flashRef = useRef(false);

  const currentQuestion = questions[currentIndex] ?? null;

  const startRace = useCallback(() => {
    const pool = buildRacePool(lessonPool);
    setQuestions(pool);
    setCurrentIndex(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(RACE_DURATION);
    setFlash(null);
    setShowBonus(false);
    flashRef.current = false;
    setPhase('running');
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setPhase('finished');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Reshuffle if pool exhausted (very fast user)
  useEffect(() => {
    if (phase === 'running' && questions.length > 0 && currentIndex >= questions.length) {
      const pool = buildRacePool(lessonPool);
      setQuestions(pool);
      setCurrentIndex(0);
    }
  }, [currentIndex, phase, questions.length]);

  const handleChoice = (choice: string) => {
    if (flashRef.current || phase !== 'running' || !currentQuestion) return;
    flashRef.current = true;

    const isCorrect = choice === currentQuestion.answer;

    if (isCorrect) {
      setCorrect((c) => c + 1);
      setTimeLeft((t) => t + BONUS_SECONDS);
      setShowBonus(true);
      playCorrect();
      setTimeout(() => setShowBonus(false), 800);
    } else {
      setWrong((w) => w + 1);
      playWrong();
    }

    setFlash(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      setFlash(null);
      flashRef.current = false;
      setCurrentIndex((i) => i + 1);
    }, 350);
  };

  const total = correct + wrong;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isGood = accuracy >= 70 && total >= 5;
  const isLong = (currentQuestion?.prompt.length ?? 0) > 60;

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center">
        <img src="/snailTurbo.png" alt="" className="w-36 h-36 object-contain mb-4" />
        <h1 className="text-4xl font-black text-gray-800 mb-2">The Snail Race</h1>
        <p className="text-gray-500 mb-2 text-base max-w-xs leading-relaxed">
          Answer as many questions as you can in{' '}
          <span className="font-bold text-brand-green">60 seconds</span>.
        </p>
        <p className="text-sm text-amber-600 font-semibold mb-8">
          +{BONUS_SECONDS}s bonus for every correct answer!
        </p>
        <button
          type="button"
          onClick={startRace}
          className="bg-brand-green text-white font-black py-4 px-14 rounded-2xl text-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
        >
          Start Race!
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
        >
          Back to home
        </button>
      </div>
    );
  }

  // ── Finished ──────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center">
        <img
          src={isGood ? '/snailTurbo.png' : '/snailSlow.png'}
          alt=""
          className="w-32 h-32 object-contain mb-4"
        />
        <h1 className="text-4xl font-black text-gray-800 mb-2">
          {isGood ? 'Turbo Snail!' : 'Slow Snail...'}
        </h1>
        <p className="text-gray-500 mb-8 max-w-xs">
          {isGood
            ? 'Amazing speed and accuracy. You are unstoppable!'
            : 'Keep practising the lessons and come back for a rematch!'}
        </p>

        <div className="flex gap-3 mb-10">
          <div className="bg-white rounded-2xl px-5 py-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Correct</p>
            <p className="text-3xl font-black text-brand-green">{correct}</p>
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Wrong</p>
            <p className="text-3xl font-black text-red-500">{wrong}</p>
          </div>
          <div className="bg-white rounded-2xl px-5 py-4 text-center shadow-sm">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">Accuracy</p>
            <p className="text-3xl font-black text-gray-800">{accuracy}%</p>
          </div>
        </div>

        <button
          type="button"
          onClick={startRace}
          className="w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-xl text-base uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md mb-3"
        >
          Race Again!
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
        >
          Back to home
        </button>
      </div>
    );
  }

  // ── Running ───────────────────────────────────────────────────────────────
  return (
    <div
      className={`h-dvh flex flex-col transition-colors duration-150 ${
        flash === 'correct'
          ? 'bg-green-100'
          : flash === 'wrong'
          ? 'bg-red-100'
          : 'bg-[#E8F4DC]'
      }`}
    >
      {/* Header: timer + score */}
      <div className="flex-none flex items-center justify-between px-5 pt-5 pb-2">
        <div
          className={`flex items-center gap-2 font-black text-2xl transition-colors ${
            timeLeft <= 10 ? 'text-red-500' : 'text-gray-800'
          }`}
        >
          <span>⏱</span>
          <span>{String(timeLeft).padStart(2, '0')}</span>
          {showBonus && (
            <span className="text-brand-green font-black text-sm animate-bounce">
              +{BONUS_SECONDS}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-brand-green font-black text-lg">✓ {correct}</span>
          <span className="text-red-400 font-black text-lg">✗ {wrong}</span>
        </div>
      </div>

      {/* Question + choices */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 max-w-lg mx-auto w-full">
        {currentQuestion && (
          <>
            {/* Prompt card */}
            <div className="w-full bg-white rounded-3xl shadow-sm px-6 py-8 text-center">
              <p
                className={`font-bold text-gray-800 leading-snug ${
                  isLong ? 'text-base' : 'text-2xl'
                }`}
              >
                {currentQuestion.prompt}
              </p>
              {currentQuestion.subPrompt && (
                <p className="text-sm text-gray-400 mt-2 italic leading-snug">
                  {currentQuestion.subPrompt}
                </p>
              )}
            </div>

            {/* 2×2 choice grid */}
            <div className="w-full grid grid-cols-2 gap-3">
              {currentQuestion.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => handleChoice(choice)}
                  className="bg-white border-2 border-gray-200 rounded-2xl px-3 py-4 text-center font-semibold text-sm text-gray-800 hover:border-brand-blue hover:bg-blue-50 active:scale-[0.97] transition-all cursor-pointer shadow-sm leading-snug"
                >
                  {choice}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
