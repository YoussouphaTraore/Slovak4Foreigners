import { useState, useRef, useMemo } from 'react';
import type { PickTranslationExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';
import { slovakifyNumbers } from '../../utils/numberToSlovak';
import { useFeedbackNextDelay } from '../../hooks/useFeedbackNextDelay';

interface Word { id: number; slovak: string; english: string }
type Feedback = 'correct' | 'wrong' | null;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChoices(current: Word, all: Word[]): string[] {
  const distractors = shuffle(all.filter((w) => w.id !== current.id))
    .slice(0, 3)
    .map((w) => w.english);
  return shuffle([current.english, ...distractors]);
}

interface Props {
  exercise: TExercise;
  onDone: (failed: { slovak: string; english: string }[]) => void;
  onAnswer?: (correct: boolean) => void;
}

export function PickTranslationExercise({ exercise, onDone, onAnswer }: Props) {
  const allWords: Word[] = useMemo(
    () => exercise.words.map((w, i) => ({ ...w, id: i })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const total = allWords.length;

  const [queue, setQueue] = useState<Word[]>(() => shuffle([...allWords]));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tappedChoice, setTappedChoice] = useState<string | null>(null);
  const nextVisible = useFeedbackNextDelay(feedback);

  const pendingRetry = useRef<Word[]>([]);
  const pendingMasterId = useRef<number | null>(null);
  const everFailed = useRef<Set<number>>(new Set());

  const currentWord = queue[currentIdx];

  const choices = useMemo(
    () => buildChoices(currentWord, allWords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentWord]
  );

  const masteredCount = masteredIds.size;

  const handleChoice = (choice: string) => {
    if (feedback !== null) return;

    const correct = choice === currentWord.english;
    setTappedChoice(choice);
    setFeedback(correct ? 'correct' : 'wrong');
    onAnswer?.(correct);

    if (!correct) {
      pendingRetry.current = [...pendingRetry.current, currentWord];
      pendingMasterId.current = null;
      everFailed.current.add(currentWord.id);
    } else {
      pendingMasterId.current = currentWord.id;
    }
  };

  const handleNext = () => {
    if (pendingMasterId.current !== null) {
      const id = pendingMasterId.current;
      setMasteredIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      pendingMasterId.current = null;
    }

    const nextIdx = currentIdx + 1;

    if (nextIdx < queue.length) {
      setCurrentIdx(nextIdx);
    } else if (pendingRetry.current.length > 0) {
      const retryQueue = shuffle([...pendingRetry.current]);
      pendingRetry.current = [];
      setQueue(retryQueue);
      setCurrentIdx(0);
    } else {
      const failed = allWords
        .filter((w) => everFailed.current.has(w.id))
        .map((w) => ({ slovak: w.slovak, english: w.english }));
      onDone(failed);
      return;
    }

    setFeedback(null);
    setTappedChoice(null);
  };

  const getChoiceStyle = (choice: string): string => {
    const base =
      'w-full border-2 rounded-2xl px-4 py-4 text-left font-medium text-base cursor-pointer transition-all duration-200 active:scale-95 break-words';

    if (feedback === null) {
      return `${base} border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
    }
    if (choice === currentWord.english) {
      return `${base} border-brand-green bg-green-50 text-brand-green`;
    }
    if (choice === tappedChoice) {
      return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
    }
    return `${base} border-gray-200 bg-white text-gray-400 opacity-50`;
  };

  const progressPct = Math.round((masteredCount / total) * 100);

  const bannerMessage = feedback === 'correct'
    ? `"${currentWord.english}" is the correct answer — "${currentWord.slovak}" means "${currentWord.english}"`
    : `"${tappedChoice}" is not correct. "${currentWord.slovak}" means "${currentWord.english}"`;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Progress header */}
      <div className="flex-none">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Mastered {masteredCount} of {total}</span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Mascot instruction */}
      <MascotSpeech message="Pick the correct translation!" />

      {/* Word card */}
      <div className="flex-none flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-gray-100 shadow-sm py-6 px-4">
        {(() => {
          const display = slovakifyNumbers(currentWord.slovak);
          const size = display.length > 35 ? 'text-xl' : display.length > 18 ? 'text-2xl' : 'text-4xl';
          return (
            <p className={`${size} font-bold text-gray-800 text-center leading-snug break-all`}>
              {display}
            </p>
          );
        })()}
      </div>

      {/* Choice grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={feedback !== null}
              onClick={() => handleChoice(choice)}
              className={getChoiceStyle(choice)}
            >
              {choice}
              {feedback !== null && choice === currentWord.english && ' ✓'}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback !== null && (
        <div
          className={`flex-none rounded-2xl px-4 py-3 ${
            feedback === 'correct' ? 'bg-green-50 border-2 border-brand-green' : 'bg-red-50 border-2 border-brand-red'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm mb-1 ${feedback === 'correct' ? 'text-brand-green' : 'text-brand-red'}`}>
                {feedback === 'correct' ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className={`text-xs leading-snug ${feedback === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                {bannerMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`flex-none font-bold px-5 py-2 rounded-xl text-sm uppercase tracking-wide cursor-pointer transition-opacity duration-300 hover:opacity-90 ${
                feedback === 'correct' ? 'bg-brand-green text-white' : 'bg-brand-red text-white'
              } ${nextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
