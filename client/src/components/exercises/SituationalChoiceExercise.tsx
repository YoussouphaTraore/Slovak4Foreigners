import { useState, useRef, useMemo } from 'react';
import type { SituationalChoiceExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';
import { slovakifyNumbers } from '../../utils/numberToSlovak';

type Scenario = TExercise['scenarios'][number];
type Feedback = 'correct' | 'wrong' | null;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  exercise: TExercise;
  onDone: (failed: { slovak: string; english: string }[]) => void;
  onAnswer?: (correct: boolean) => void;
}

export function SituationalChoiceExercise({ exercise, onDone, onAnswer }: Props) {
  const total = exercise.scenarios.length;

  const [queue, setQueue] = useState<Scenario[]>(() => shuffle([...exercise.scenarios]));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tappedChoice, setTappedChoice] = useState<string | null>(null);

  const pendingRetry = useRef<Scenario[]>([]);
  const masteredAnswers = useRef<Set<string>>(new Set());
  const everFailed = useRef<Set<string>>(new Set());

  const current = queue[currentIdx];

  const choices = useMemo(
    () => shuffle([...current.choices]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current]
  );

  const handleChoice = (choice: string) => {
    if (feedback !== null) return;

    const correct = choice === current.answer;
    setTappedChoice(choice);
    setFeedback(correct ? 'correct' : 'wrong');
    onAnswer?.(correct);

    if (!correct) {
      pendingRetry.current = [...pendingRetry.current, current];
      everFailed.current.add(current.answer);
    }
  };

  const handleNext = () => {
    if (feedback === 'correct' && !masteredAnswers.current.has(current.answer)) {
      masteredAnswers.current.add(current.answer);
      setMasteredCount((c) => c + 1);
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
      // Deduplicate by slovak word (same word can appear across multiple scenarios)
      const seen = new Set<string>();
      const failed = exercise.scenarios
        .filter((s) => everFailed.current.has(s.answer) && !seen.has(s.answer) && seen.add(s.answer))
        .map((s) => ({ slovak: s.answer, english: s.answerMeaning }));
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
    if (choice === current.answer) {
      return `${base} border-brand-green bg-green-50 text-brand-green`;
    }
    if (choice === tappedChoice) {
      return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
    }
    return `${base} border-gray-200 bg-white text-gray-400 opacity-50`;
  };

  const progressPct = Math.round((masteredCount / total) * 100);

  const bannerMessage = feedback === 'correct'
    ? `"${current.answer}" is correct! It means "${current.answerMeaning}"`
    : `"${tappedChoice}" is not correct here. The right answer is "${current.answer}" which means "${current.answerMeaning}"`;

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
      <MascotSpeech message="What would you say in this situation?" />

      {/* Situation card */}
      <div className="flex-none bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-6">
        <p className="text-lg font-bold text-gray-800 leading-snug">
          {current.situation}
        </p>
        {current.instruction && (
          <p className="text-sm italic text-gray-400 mt-2">
            {current.instruction}
          </p>
        )}
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
              {slovakifyNumbers(choice)}
              {feedback !== null && choice === current.answer && ' ✓'}
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
              className={`flex-none font-bold px-5 py-2 rounded-xl text-sm uppercase tracking-wide cursor-pointer transition-opacity hover:opacity-90 ${
                feedback === 'correct'
                  ? 'bg-brand-green text-white'
                  : 'bg-brand-red text-white'
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
