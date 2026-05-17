import { useState, useEffect, useRef } from 'react';
import type { ListenAndPickExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';
import { cleanForSpeech } from '../../utils/speak';
import { slovakifyNumbers } from '../../utils/numberToSlovak';

interface WordEntry { id: number; slovak: string; english: string }
type Feedback = 'correct' | 'wrong' | 'timeout' | null;
type Phase = 'listening' | 'feedback';

const MAX_RETRIES = 2; // word plays up to 3 times total (initial + 2 repeats)
const COUNTDOWN = 10;
const FEEDBACK_DELAY = 1300;

const RADIUS = 18;
const CIRC = 2 * Math.PI * RADIUS;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string, lang: 'sk-SK' | 'en-US' = 'sk-SK') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

interface Props {
  exercise: TExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

export function ListenAndPickExercise({ exercise, onDone, onAnswer }: Props) {
  const isEnglishMode = exercise.speakLanguage === 'en';
  const lang: 'sk-SK' | 'en-US' = isEnglishMode ? 'en-US' : 'sk-SK';
  const getSpokenText = (w: WordEntry) => isEnglishMode ? w.english : w.slovak;

  // Stable shuffled orders set once on mount
  const [cards] = useState<WordEntry[]>(() =>
    shuffle(exercise.words.map((w, i) => ({ ...w, id: i })))
  );
  const [playQueue] = useState<WordEntry[]>(() =>
    shuffle(exercise.words.map((w, i) => ({ ...w, id: i })))
  );

  // Session = which word in the play queue + how many times it has replayed
  const [session, setSession] = useState({ wordIdx: 0, retryCount: 0 });
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const [phase, setPhase] = useState<Phase>('listening');
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN);
  const [tappedId, setTappedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const currentWord = playQueue[session.wordIdx];

  // ── Speak + countdown (re-fires on each session change) ──────────────────
  useEffect(() => {
    if (phase !== 'listening') return;

    speak(getSpokenText(currentWord), lang);
    setTimeLeft(COUNTDOWN);

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t > 1) return t - 1;

        // Timer expired
        clearInterval(id);
        const { wordIdx, retryCount } = sessionRef.current;

        if (retryCount < MAX_RETRIES) {
          // Replay the word
          setSession({ wordIdx, retryCount: retryCount + 1 });
        } else {
          // Auto-fail after max retries
          onAnswer?.(false);
          setFeedback('timeout');
          setPhase('feedback');
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ── Advance to next word after feedback delay ─────────────────────────────
  useEffect(() => {
    if (phase !== 'feedback') return;

    const t = setTimeout(() => {
      const nextIdx = session.wordIdx + 1;
      if (nextIdx >= playQueue.length) {
        onDone();
      } else {
        setSession({ wordIdx: nextIdx, retryCount: 0 });
        setTappedId(null);
        setFeedback(null);
        setPhase('listening');
      }
    }, FEEDBACK_DELAY);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Tap handler ───────────────────────────────────────────────────────────
  const handleTap = (card: WordEntry) => {
    if (phase !== 'listening') return;
    setTappedId(card.id);

    const correct = card.id === currentWord.id;
    onAnswer?.(correct);
    setFeedback(correct ? 'correct' : 'wrong');
    setPhase('feedback');
  };

  // ── Card colour ───────────────────────────────────────────────────────────
  const cardClass = (card: WordEntry): string => {
    const isCorrect = card.id === currentWord.id;
    const isTapped = card.id === tappedId;

    if (feedback === null) {
      return 'border-gray-200 bg-white hover:border-brand-blue hover:bg-blue-50';
    }
    if (feedback === 'correct' && isCorrect) {
      return 'border-brand-green bg-green-50';
    }
    if (feedback === 'wrong') {
      if (isTapped) return 'border-brand-red bg-red-50';
      if (isCorrect) return 'border-brand-green bg-green-50';
      return 'border-gray-100 bg-white opacity-40';
    }
    if (feedback === 'timeout' && isCorrect) {
      return 'border-brand-gold bg-yellow-50';
    }
    return 'border-gray-100 bg-white opacity-40';
  };

  // ── Timer ring colour ─────────────────────────────────────────────────────
  const ringColor = timeLeft <= 3 ? '#FF4B4B' : '#1CB0F6';
  const dashOffset = CIRC * (1 - timeLeft / COUNTDOWN);

  const wordNum = session.wordIdx + 1;
  const retryLabel = session.retryCount > 0
    ? ` (repeat ${session.retryCount}/${MAX_RETRIES})`
    : '';

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      {/* Mascot instruction */}
      <MascotSpeech message={isEnglishMode ? 'Tap the Slovak word you hear in English!' : 'Tap the word you hear!'} />

      {/* Countdown ring + word counter + replay */}
      <div className="flex items-center gap-3 flex-none">
        <div className="relative shrink-0 flex items-center justify-center w-11 h-11">
          <svg width="44" height="44" className="-rotate-90">
            <circle cx="22" cy="22" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle
              cx="22" cy="22" r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="4"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span
            className="absolute text-sm font-bold"
            style={{ color: ringColor }}
          >
            {phase === 'listening' ? timeLeft : ''}
          </span>
        </div>

        <p className="text-xs text-gray-400 flex-1">
          Word {wordNum} of {playQueue.length}{retryLabel}
        </p>

        {/* Replay button */}
        <button
          type="button"
          onClick={() => speak(getSpokenText(currentWord), lang)}
          className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0 hover:opacity-80 active:scale-90 cursor-pointer transition-all"
        >
          🔊
        </button>
      </div>

      {/* Word cards grid — fills remaining space, no scroll */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-2 grid-rows-4 gap-2 h-full">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              disabled={phase !== 'listening'}
              onClick={() => handleTap(card)}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-1 shadow-sm transition-all active:scale-95 cursor-pointer disabled:cursor-default ${cardClass(card)}`}
            >
              <span className={`font-bold text-gray-800 text-center leading-tight ${card.slovak.length > 25 ? 'text-xs' : card.slovak.length > 12 ? 'text-sm' : 'text-base'}`}>
                {slovakifyNumbers(card.slovak)}
              </span>
              {!isEnglishMode && (
                <span className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">
                  {card.english}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
