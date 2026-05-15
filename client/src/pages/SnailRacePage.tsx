import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { buildRacePool, type RaceQuestion } from '../utils/buildRacePool';
import { useProgressStore } from '../store/useProgressStore';

const RACE_DURATION = 60;
const BONUS_SECONDS = 3;
const MAX_ATTEMPTS   = 5;
const FREEZE_MS      = 2000;
const TURBO_THRESHOLD = 25;

type Phase = 'idle' | 'blocked' | 'running' | 'finished';
type Flash = 'correct' | 'wrong' | null;

// ── Audio ─────────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playCorrect() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = now + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t); osc.stop(t + 0.22);
    });
  } catch {}
}

function playWrong() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const stageOrder = [...new Set(lessons.map((l) => l.stageId))];

function getLessonPool(stageId?: string): typeof lessons {
  const idx = stageId ? stageOrder.indexOf(stageId) : -1;
  if (idx === -1) return lessons;
  return lessons.filter((l) => stageOrder.indexOf(l.stageId) <= idx);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function attemptsUsedToday(stageId: string, records: ReturnType<typeof useProgressStore.getState>['snailRaceRecords']): number {
  const rec = records.find((r) => r.stageId === stageId);
  if (!rec || rec.lastAttemptDate !== todayStr()) return 0;
  return rec.attemptsToday;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SnailRacePage() {
  const navigate = useNavigate();
  const { stageId } = useParams<{ stageId?: string }>();
  const store = useProgressStore();
  const lessonPool = getLessonPool(stageId);
  const resolvedStageId = stageId ?? 'all';

  // Check daily limit before render
  const usedOnLoad = attemptsUsedToday(resolvedStageId, store.snailRaceRecords);
  const initialPhase: Phase = usedOnLoad >= MAX_ATTEMPTS ? 'blocked' : 'idle';

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [questions, setQuestions] = useState<RaceQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(RACE_DURATION);
  const [flash, setFlash] = useState<Flash>(null);
  const [showBonus, setShowBonus] = useState(false);
  const [raceResult, setRaceResult] = useState<{ xpEarned: number; attemptsLeft: number } | null>(null);

  const flashRef  = useRef(false);
  const frozenRef = useRef(false); // timer paused on wrong answer

  const currentQuestion = questions[currentIndex] ?? null;
  const attemptsLeft = MAX_ATTEMPTS - attemptsUsedToday(resolvedStageId, store.snailRaceRecords);

  const startRace = useCallback(() => {
    if (attemptsLeft <= 0) { setPhase('blocked'); return; }
    const pool = buildRacePool(lessonPool);
    setQuestions(pool);
    setCurrentIndex(0);
    setCorrect(0);
    setWrong(0);
    setTimeLeft(RACE_DURATION);
    setFlash(null);
    setShowBonus(false);
    setRaceResult(null);
    flashRef.current = false;
    frozenRef.current = false;
    setPhase('running');
  }, [attemptsLeft, lessonPool]);

  // Countdown — skips while frozen
  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      if (frozenRef.current) return;
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); setPhase('finished'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Record result when race finishes
  useEffect(() => {
    if (phase !== 'finished') return;
    const result = store.recordSnailRaceAttempt(resolvedStageId, correct);
    setRaceResult(result.blocked ? { xpEarned: 0, attemptsLeft: 0 } : result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Reshuffle if pool exhausted
  useEffect(() => {
    if (phase === 'running' && questions.length > 0 && currentIndex >= questions.length) {
      setQuestions(buildRacePool(lessonPool));
      setCurrentIndex(0);
    }
  }, [currentIndex, phase, questions.length, lessonPool]);

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
      setFlash('correct');
      setTimeout(() => {
        setFlash(null);
        flashRef.current = false;
        setCurrentIndex((i) => i + 1);
      }, 350);
    } else {
      setWrong((w) => w + 1);
      playWrong();
      frozenRef.current = true;
      setFlash('wrong');
      setTimeout(() => {
        frozenRef.current = false;
        setFlash(null);
        flashRef.current = false;
        setCurrentIndex((i) => i + 1);
      }, FREEZE_MS);
    }
  };

  const total = correct + wrong;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isTurbo = correct > 10 && accuracy > 50;
  const isLong = (currentQuestion?.prompt.length ?? 0) > 60;
  const progressPct = Math.min(100, (correct / TURBO_THRESHOLD) * 100);

  // Best score from store
  const stageRecord = store.snailRaceRecords.find((r) => r.stageId === resolvedStageId);
  const bestScore = stageRecord?.bestScore ?? 0;

  // ── Blocked (no attempts left today) ──────────────────────────────────────
  if (phase === 'blocked') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center">
        <img src="/snail.png" alt="" className="w-32 h-32 object-contain mb-4 opacity-60" />
        <h1 className="text-3xl font-black text-gray-700 mb-2">Come Back Tomorrow!</h1>
        <p className="text-gray-500 mb-2 text-base max-w-xs leading-relaxed">
          You've used all <span className="font-bold">{MAX_ATTEMPTS}</span> attempts for today.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          Best score: <span className="font-bold text-gray-600">{bestScore}</span> correct
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="bg-brand-green text-white font-black py-4 px-14 rounded-2xl text-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
        >
          Back to lessons
        </button>
      </div>
    );
  }

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
        <p className="text-sm text-amber-600 font-semibold mb-1">
          +{BONUS_SECONDS}s bonus for every correct answer!
        </p>
        <p className="text-sm text-gray-400 mb-2">
          Attempts today: <span className="font-bold">{MAX_ATTEMPTS - attemptsLeft}/{MAX_ATTEMPTS}</span>
        </p>
        {bestScore > 0 && (
          <p className="text-sm text-gray-400 mb-6">
            Best: <span className="font-bold text-gray-700">{bestScore} correct</span>
          </p>
        )}
        <button
          type="button"
          onClick={startRace}
          className="bg-brand-green text-white font-black py-4 px-14 rounded-2xl text-xl hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg mb-4"
        >
          Start Race!
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

  // ── Finished ──────────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const xpEarned = raceResult?.xpEarned ?? 0;
    const attLeft = raceResult?.attemptsLeft ?? 0;

    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col items-center justify-center px-6 text-center">
        <img
          src={isTurbo ? '/snailTurbo.png' : '/snailSlow.png'}
          alt=""
          className="w-32 h-32 object-contain mb-4"
        />
        <h1 className="text-4xl font-black text-gray-800 mb-1">
          {isTurbo ? '🐌💨 Turbo Snail!' : '🐌 Snail Pace...'}
        </h1>
        <p className="text-gray-500 mb-6 max-w-xs">
          {isTurbo
            ? 'Amazing speed and accuracy. You are unstoppable!'
            : 'Keep practising the lessons and come back for a rematch!'}
        </p>

        <div className="flex gap-3 mb-5">
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

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-8 py-4 mb-5">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">XP Earned</p>
          <p className="text-4xl font-black text-amber-500">+{xpEarned}</p>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Best score: <span className="font-bold text-gray-700">{stageRecord?.bestScore ?? correct}</span>
          {' · '}Attempts used today: <span className="font-bold">{MAX_ATTEMPTS - attLeft}/{MAX_ATTEMPTS}</span>
        </p>

        {attLeft > 0 ? (
          <button
            type="button"
            onClick={startRace}
            className="w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-xl text-base uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md mb-3"
          >
            Race Again!
          </button>
        ) : (
          <div className="w-full max-w-xs bg-gray-100 text-gray-400 font-bold py-4 rounded-xl text-base text-center uppercase tracking-widest mb-3">
            Come Back Tomorrow
          </div>
        )}
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
        flash === 'correct' ? 'bg-green-100' : flash === 'wrong' ? 'bg-red-100' : 'bg-[#E8F4DC]'
      }`}
    >
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-5 pt-5 pb-2">
        <div
          className={`flex items-center gap-2 font-black text-2xl transition-colors ${
            timeLeft <= 10 ? 'text-red-500' : 'text-gray-800'
          }`}
        >
          <span>⏱</span>
          <span>{String(timeLeft).padStart(2, '0')}</span>
          {showBonus && (
            <span className="text-brand-green font-black text-sm animate-bounce">+{BONUS_SECONDS}s</span>
          )}
          {flash === 'wrong' && (
            <span className="text-red-500 font-black text-sm">⏸ {(FREEZE_MS / 1000)}s</span>
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
            <div className="w-full bg-white rounded-3xl shadow-sm px-6 py-8 text-center">
              <p className={`font-bold text-gray-800 leading-snug ${isLong ? 'text-base' : 'text-2xl'}`}>
                {currentQuestion.prompt}
              </p>
              {currentQuestion.subPrompt && (
                <p className="text-sm text-gray-400 mt-2 italic leading-snug">
                  {currentQuestion.subPrompt}
                </p>
              )}
            </div>

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

      {/* Snail progress bar */}
      <div className="flex-none px-5 pb-6 pt-2">
        <div className="relative w-full h-5 bg-white/60 rounded-full overflow-hidden border border-white/80">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
          <span
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 text-base leading-none"
            style={{ left: `calc(${progressPct}% - 10px)` }}
          >
            {isTurbo ? '🐌💨' : '🐌'}
          </span>
        </div>
        <p className="text-xs text-center text-gray-500 mt-1">
          {correct > 10 && accuracy > 50 ? '🐌💨 Turbo Snail!' : `${correct}/10 correct + 50% accuracy for Turbo`}
        </p>
      </div>
    </div>
  );
}
