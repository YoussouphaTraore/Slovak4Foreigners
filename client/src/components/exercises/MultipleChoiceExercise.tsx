import { useState } from 'react';
import type { MultipleChoiceExercise as MCExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';
import { useFeedbackNextDelay } from '../../hooks/useFeedbackNextDelay';

interface Props {
  exercise: MCExercise;
  onDone: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
}

type Feedback = 'correct' | 'wrong' | null;

export function MultipleChoiceExercise({ exercise, onDone, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const nextVisible = useFeedbackNextDelay(feedback);

  const handleSelect = (choice: string) => {
    if (feedback !== null) return;
    const correct = choice === exercise.answer;
    setSelected(choice);
    setFeedback(correct ? 'correct' : 'wrong');
    onAnswer?.(correct);
  };

  const getButtonStyle = (choice: string) => {
    const base = 'w-full border-2 rounded-2xl px-4 py-4 text-left font-medium text-base cursor-pointer transition-all duration-200 active:scale-[0.98]';
    if (feedback === null) {
      return `${base} border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
    }
    if (choice === exercise.answer) {
      return `${base} border-brand-green bg-green-50 text-brand-green`;
    }
    if (choice === selected && choice !== exercise.answer) {
      return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
    }
    return `${base} border-gray-200 bg-white text-gray-400 opacity-60`;
  };

  const bannerMessage = feedback === 'correct'
    ? `"${exercise.answer}" is correct!`
    : `Not quite. The correct answer is "${exercise.answer}"`;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <MascotSpeech message="Choose the correct answer" />

      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-5">
        <p className="text-lg font-bold text-gray-800 leading-snug">
          {exercise.prompt}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {exercise.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => handleSelect(choice)}
              disabled={feedback !== null}
              className={getButtonStyle(choice)}
            >
              {choice}
              {feedback !== null && choice === exercise.answer && ' ✓'}
            </button>
          ))}
        </div>
      </div>

      {feedback !== null && (
        <div className={`flex-none rounded-2xl px-4 py-3 ${
          feedback === 'correct' ? 'bg-green-50 border-2 border-brand-green' : 'bg-red-50 border-2 border-brand-red'
        }`}>
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
              onClick={() => onDone(feedback === 'correct')}
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
