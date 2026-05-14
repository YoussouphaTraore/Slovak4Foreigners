import { useState, useEffect, useMemo } from 'react';
import type { ListenAndIdentifyExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string, lang: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

interface Props {
  exercise: TExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

type Phase = 'listening' | 'feedback';

export function ListenAndIdentifyExercise({ exercise, onDone, onAnswer }: Props) {
  // Shuffle the pool once — positions stay stable across items so the user
  // builds spatial memory of where each word lives.
  const lang = exercise.speechLang ?? 'sk-SK';
  const mascotMessage = lang === 'sk-SK'
    ? 'Which word(s) did you hear?'
    : 'Pick the Slovak word(s) for what you hear!';

  const shuffledPool = useMemo(() => shuffle([...exercise.wordPool]), []);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>('listening');
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const current = exercise.items[currentIdx];
  const total = exercise.items.length;

  // Auto-play sentence when item changes
  useEffect(() => {
    setHasPlayed(false);
    const t = setTimeout(() => {
      speak(current.sentence, lang);
      setHasPlayed(true);
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  const handleReplay = () => {
    speak(current.sentence, lang);
    setHasPlayed(true);
  };

  const toggleWord = (word: string) => {
    if (phase !== 'listening') return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const handleCheck = () => {
    const targets = new Set(current.targetWords);
    const correct =
      selected.size === targets.size &&
      [...selected].every((w) => targets.has(w));
    setIsCorrect(correct);
    setPhase('feedback');
    onAnswer?.(correct);
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= total) {
      onDone();
      return;
    }
    setCurrentIdx(nextIdx);
    setSelected(new Set());
    setPhase('listening');
    setIsCorrect(false);
  };

  const canCheck = hasPlayed && selected.size > 0 && phase === 'listening';

  const getTileStyle = (word: string): string => {
    const base =
      'border-2 rounded-2xl px-2 py-0 text-base font-bold text-center transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center leading-tight';

    if (phase === 'feedback') {
      const isTarget = current.targetWords.includes(word);
      const wasSelected = selected.has(word);
      if (isTarget) return `${base} border-brand-green bg-green-50 text-brand-green`;
      if (wasSelected) return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
      return `${base} border-gray-200 bg-white text-gray-400 opacity-40 pointer-events-none`;
    }

    if (selected.has(word)) {
      return `${base} border-brand-blue bg-blue-50 text-brand-blue`;
    }
    return `${base} border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
  };

  const feedbackMessage = isCorrect
    ? `You got it! "${current.targetWords.join('" & "')}"`
    : `The word${current.targetWords.length > 1 ? 's' : ''} in the sentence: "${current.targetWords.join('" & "')}"`;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <MascotSpeech message={mascotMessage} />

      {/* Play row */}
      <div className="flex items-center gap-3 flex-none">
        <button
          type="button"
          onClick={handleReplay}
          className="w-11 h-11 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0 hover:opacity-80 active:scale-90 cursor-pointer transition-all"
        >
          🔊
        </button>
        <p className="text-xs text-gray-400">
          Sentence {currentIdx + 1} of {total} · tap to replay
        </p>
      </div>

      {/* Word tiles — fill all remaining space */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-2 grid-rows-4 gap-2 h-full">
          {shuffledPool.map((word) => (
            <button
              key={word}
              type="button"
              disabled={phase === 'feedback'}
              onClick={() => toggleWord(word)}
              className={getTileStyle(word)}
            >
              {word}
            </button>
          ))}
        </div>
      </div>

      {/* Check button — only while listening */}
      {phase === 'listening' && (
        <div className="flex-none">
          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck}
            className={`w-full font-bold py-3 rounded-xl text-sm uppercase tracking-widest transition-all ${
              canCheck
                ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] shadow-md cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Check
          </button>
        </div>
      )}

      {/* Feedback banner */}
      {phase === 'feedback' && (
        <div
          className={`flex-none rounded-2xl px-4 py-3 ${
            isCorrect ? 'bg-green-50 border-2 border-brand-green' : 'bg-red-50 border-2 border-brand-red'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm mb-1 ${isCorrect ? 'text-brand-green' : 'text-brand-red'}`}>
                {isCorrect ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className={`text-xs leading-snug ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {feedbackMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`flex-none font-bold px-5 py-2 rounded-xl text-sm uppercase tracking-wide cursor-pointer transition-opacity hover:opacity-90 ${
                isCorrect ? 'bg-brand-green text-white' : 'bg-brand-red text-white'
              }`}
            >
              {currentIdx + 1 >= total ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
