import { useState, useRef, useMemo } from 'react';
import type { FillInBlankPickExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';

type Item = TExercise['items'][number];
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
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

export function FillInBlankPickExercise({ exercise, onDone, onAnswer }: Props) {
  const total = exercise.items.length;

  const [queue, setQueue] = useState<Item[]>(() => [...exercise.items]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tappedChoice, setTappedChoice] = useState<string | null>(null);

  const pendingRetry = useRef<Item[]>([]);
  const masteredAnswers = useRef<Set<string>>(new Set());

  const current = queue[currentIdx];

  // Lock choice order per item
  const shuffledChoices = useMemo(
    () => shuffle([...current.choices]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current]
  );

  // Split sentence on ___ placeholder
  const [skovBefore, slovAfter] = current.sentence.split('___');
  const [engBefore, engAfter] = current.translation.split('___');

  const handleChoice = (choice: string) => {
    if (feedback !== null) return;
    const correct = choice === current.answer;
    setTappedChoice(choice);
    setFeedback(correct ? 'correct' : 'wrong');
    onAnswer?.(correct);
    if (!correct) pendingRetry.current = [...pendingRetry.current, current];
  };

  const handleNext = () => {
    if (feedback === 'correct' && !masteredAnswers.current.has(current.answer + currentIdx)) {
      masteredAnswers.current.add(current.answer + currentIdx);
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

    setFeedback(null);
    setTappedChoice(null);
  };

  const progressPct = Math.round((masteredCount / total) * 100);

  const blankWord = tappedChoice ?? '___';
  const blankColor =
    feedback === 'correct' ? 'text-brand-green border-brand-green' :
    feedback === 'wrong'   ? 'text-brand-red border-brand-red' :
                             'text-brand-blue border-brand-blue';

  const getChoiceStyle = (choice: string): string => {
    const base =
      'border-2 rounded-2xl px-4 py-4 text-base font-bold text-center transition-all duration-200 active:scale-95 cursor-pointer';
    if (feedback !== null) {
      if (choice === current.answer)  return `${base} border-brand-green bg-green-50 text-brand-green`;
      if (choice === tappedChoice)    return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
      return `${base} border-gray-200 bg-white text-gray-400 opacity-40 pointer-events-none`;
    }
    return `${base} border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <MascotSpeech message="Complete the sentence!" />

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

      {/* Sentence card */}
      <div className="flex-none bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-5">
        {/* Slovak sentence with fillable blank */}
        <p className="text-base font-semibold text-gray-800 leading-relaxed">
          {skovBefore}
          <span className={`font-bold border-b-2 px-1 ${tappedChoice ? blankColor : 'border-gray-300 text-gray-300'}`}>
            {blankWord}
          </span>
          {slovAfter}
        </p>
        {/* English translation — blank stays as ___ */}
        <p className="text-sm italic text-gray-400 mt-2 leading-relaxed">
          {engBefore}
          <span className="not-italic font-medium text-gray-400">___</span>
          {engAfter}
        </p>
      </div>

      {/* Choice grid */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-3">
          {shuffledChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={feedback !== null}
              onClick={() => handleChoice(choice)}
              className={getChoiceStyle(choice)}
            >
              {choice}
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
                {feedback === 'correct'
                  ? `"${current.answer}" fits perfectly!`
                  : `The correct word is "${current.answer}"`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`flex-none font-bold px-5 py-2 rounded-xl text-sm uppercase tracking-wide cursor-pointer transition-opacity hover:opacity-90 ${
                feedback === 'correct' ? 'bg-brand-green text-white' : 'bg-brand-red text-white'
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
