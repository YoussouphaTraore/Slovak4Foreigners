import { useState, useEffect, useMemo, useRef } from 'react';
import type { UnscrambleExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';

type Item = TExercise['items'][number];

interface Tile { id: number; char: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTiles(word: string): Tile[] {
  const base = word.split('').map((char, i) => ({ id: i, char }));
  if (base.length <= 1) return base;
  let result: Tile[];
  let attempts = 0;
  do {
    result = shuffle([...base]);
    attempts++;
  } while (result.map((t) => t.char).join('') === word && attempts < 20);
  return result;
}

// Dynamic tile size based on word length
function tileSize(len: number) {
  if (len <= 5) return { btn: 'w-12 h-12 text-xl', gap: 'gap-2' };
  if (len <= 7) return { btn: 'w-10 h-11 text-lg', gap: 'gap-1.5' };
  return { btn: 'w-9 h-10 text-base', gap: 'gap-1' };
}

interface Props {
  exercise: TExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

export function UnscrambleExercise({ exercise, onDone, onAnswer }: Props) {
  const total = exercise.items.length;

  const [queue, setQueue] = useState<Item[]>(() => [...exercise.items]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [scrambleKey, setScrambleKey] = useState(0);

  const [answer, setAnswer] = useState<number[]>([]); // ordered tile IDs
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [isCorrect, setIsCorrect] = useState(false);

  const pendingRetry = useRef<Item[]>([]);
  const masteredWords = useRef<Set<string>>(new Set());

  const current = queue[currentIdx];
  const wordLen = current.word.length;
  const { btn, gap } = tileSize(wordLen);

  // Re-scramble on each advance (scrambleKey changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allTiles = useMemo(() => makeTiles(current.word), [current, scrambleKey]);

  const placedSet = new Set(answer);
  const availableTiles = allTiles.filter((t) => !placedSet.has(t.id));
  const answerTiles = answer.map((id) => allTiles.find((t) => t.id === id)!);

  // Auto-check when all letters are placed
  useEffect(() => {
    if (phase !== 'answering' || answer.length !== wordLen) return;
    const userWord = answerTiles.map((t) => t.char).join('');
    const correct = userWord === current.word;
    setIsCorrect(correct);
    setPhase('feedback');
    onAnswer?.(correct);
    if (!correct) pendingRetry.current = [...pendingRetry.current, current];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer.length, phase]);

  const addTile = (id: number) => {
    if (phase !== 'answering') return;
    setAnswer((prev) => [...prev, id]);
  };

  // Tap a placed tile → remove it and everything after it
  const removeFrom = (idx: number) => {
    if (phase !== 'answering') return;
    setAnswer((prev) => prev.slice(0, idx));
  };

  const handleNext = () => {
    if (isCorrect && !masteredWords.current.has(current.word)) {
      masteredWords.current.add(current.word);
      setMasteredCount((c) => c + 1);
    }

    const nextIdx = currentIdx + 1;
    if (nextIdx < queue.length) {
      setCurrentIdx(nextIdx);
    } else if (pendingRetry.current.length > 0) {
      setQueue([...pendingRetry.current]);
      pendingRetry.current = [];
      setCurrentIdx(0);
    } else {
      onDone();
      return;
    }

    setAnswer([]);
    setPhase('answering');
    setIsCorrect(false);
    setScrambleKey((k) => k + 1);
  };

  const progressPct = Math.round((masteredCount / total) * 100);

  // Slot styling
  const slotStyle = (i: number): string => {
    const tile = answerTiles[i];
    const base = `${btn} rounded-xl border-2 flex items-center justify-center font-bold transition-all duration-150`;
    if (!tile) return `${base} border-dashed border-gray-300 bg-white text-transparent`;
    if (phase === 'feedback') {
      return isCorrect
        ? `${base} border-brand-green bg-green-50 text-brand-green`
        : `${base} border-brand-red bg-red-50 text-brand-red`;
    }
    return `${base} border-brand-blue bg-blue-50 text-brand-blue cursor-pointer hover:bg-blue-100 active:scale-95`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <MascotSpeech message="Unscramble the letters!" />

      {/* Progress */}
      <div className="flex-none">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Mastered {masteredCount} of {total}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Context clue card */}
      <div className="flex-none bg-white rounded-2xl border-2 border-gray-100 shadow-sm px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Context</p>
        <p className="text-base font-semibold text-gray-800 leading-snug">{current.context}</p>
      </div>

      {/* Answer slots */}
      <div className={`flex-none flex justify-center ${gap}`}>
        {Array.from({ length: wordLen }).map((_, i) => (
          <button
            key={i}
            type="button"
            disabled={!answerTiles[i] || phase === 'feedback'}
            onClick={() => removeFrom(i)}
            className={slotStyle(i)}
          >
            {answerTiles[i]?.char ?? ''}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex-none flex items-center gap-2 px-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-300">tap to place</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Available scrambled tiles */}
      <div className={`flex-none flex justify-center flex-wrap ${gap}`}>
        {availableTiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={phase === 'feedback'}
            onClick={() => addTile(tile.id)}
            className={`${btn} rounded-xl border-2 border-gray-300 bg-white text-gray-800 font-bold hover:border-brand-blue hover:bg-blue-50 transition-all active:scale-95 cursor-pointer disabled:opacity-30`}
          >
            {tile.char}
          </button>
        ))}
      </div>

      <div className="flex-1" />

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
                {isCorrect
                  ? `"${current.word}" — well done!`
                  : `The word was "${current.word}" — try again!`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`flex-none font-bold px-5 py-2 rounded-xl text-sm uppercase tracking-wide cursor-pointer transition-opacity hover:opacity-90 ${
                isCorrect ? 'bg-brand-green text-white' : 'bg-brand-red text-white'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
