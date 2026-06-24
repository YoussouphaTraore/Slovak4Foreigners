import { useState, useRef, useMemo } from 'react';
import type { ConversationWordRecognitionExercise as TExercise } from '../../types/conversationComprehension';

interface Props {
  exercise: TExercise;
  onDone: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ConversationWordRecognitionExercise({ exercise, onDone, onAnswer }: Props) {
  const allWords = useMemo(
    () => shuffle([...exercise.correctWords, ...exercise.distractorWords]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const correctSet = useMemo(() => new Set(exercise.correctWords), [exercise.correctWords]);
  const threshold = Math.ceil(exercise.correctWords.length * (exercise.passThresholdPercent / 100));

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const resolvedRef = useRef(false);
  const penalizedRef = useRef<Set<string>>(new Set());
  const answeredCorrectRef = useRef<Set<string>>(new Set());

  const handleToggle = (word: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.has(word)) next.add(word);
      else next.delete(word);
      return next;
    });

    const isSelecting = !selected.has(word);
    if (isSelecting) {
      if (correctSet.has(word)) {
        if (!answeredCorrectRef.current.has(word)) {
          answeredCorrectRef.current.add(word);
          onAnswer?.(true);
        }
      } else {
        if (!penalizedRef.current.has(word)) {
          penalizedRef.current.add(word);
          onAnswer?.(false);
        }
      }
    }
  };

  const correctSelectedCount = [...selected].filter((w) => correctSet.has(w)).length;
  const wordProgress = exercise.correctWords.length > 0
    ? correctSelectedCount / exercise.correctWords.length
    : 0;
  const wordProgressColor =
    wordProgress <= 0.25 ? 'bg-red-400'
    : wordProgress <= 0.50 ? 'bg-orange-400'
    : wordProgress <= 0.75 ? 'bg-yellow-400'
    : 'bg-brand-green';
  const hasPassed = correctSelectedCount >= threshold;

  const handleContinue = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onDone(true);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Instruction */}
      <p className="flex-none text-sm font-semibold text-gray-700">{exercise.instruction}</p>

      {/* Word grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-wrap gap-2 pb-2">
          {allWords.map((word) => {
            const isSelected = selected.has(word);
            const isCorrect = correctSet.has(word);
            const tileStyle = !isSelected
              ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              : isCorrect
              ? 'border-brand-blue bg-blue-50 text-brand-blue'
              : 'border-brand-red bg-red-50 text-brand-red';
            return (
              <button
                key={word}
                type="button"
                onClick={() => handleToggle(word)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all duration-150 active:scale-95 cursor-pointer ${tileStyle}`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      {/* Word recognition progress bar */}
      <div className="flex-none">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500">Words found</span>
          <span className="text-xs font-bold text-gray-700 tabular-nums">
            {correctSelectedCount} / {exercise.correctWords.length}
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${wordProgressColor}`}
            style={{ width: `${wordProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Continue — unlocks at pass threshold */}
      {hasPassed && (
        <div className="flex-none pb-1">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] shadow-md cursor-pointer transition-all"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
