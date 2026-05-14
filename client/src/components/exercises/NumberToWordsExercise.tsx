import { useState } from 'react';
import type { NumberToWordsExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';

interface Props {
  exercise: TExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'sk-SK';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

export function NumberToWordsExercise({ exercise, onDone, onAnswer }: Props) {
  const [itemIndex, setItemIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const item = exercise.items[itemIndex];
  const isCorrect = selected === item.answer;
  const isLast = itemIndex === exercise.items.length - 1;

  const handleChoice = (choice: string) => {
    speak(choice);
    if (!checked) setSelected(choice);
  };

  const handleCheck = () => {
    if (!selected || checked) return;
    setChecked(true);
    onAnswer?.(isCorrect);
  };

  const handleNext = () => {
    if (isLast) {
      onDone();
    } else {
      setItemIndex((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <MascotSpeech message="Tap each option to hear it, then pick the right one!" />

      {/* Progress bar */}
      <div className="flex gap-1.5 flex-none">
        {exercise.items.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full flex-1 transition-all ${
              i < itemIndex ? 'bg-brand-green' : i === itemIndex ? 'bg-brand-blue' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Number prompt */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Which text matches this number?
        </p>
        <p className="text-8xl font-black text-gray-800 leading-none">{item.number}</p>
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-2.5 flex-none">
        {item.choices.map((choice) => {
          const isSelected = selected === choice;
          const isAnswer = choice === item.answer;

          let cls =
            'bg-white border-gray-200 text-gray-800 hover:border-brand-blue hover:bg-blue-50';
          if (isSelected && !checked)
            cls = 'bg-blue-50 border-brand-blue text-gray-800';
          if (checked && isSelected && isAnswer)
            cls = 'bg-green-50 border-brand-green text-green-800';
          if (checked && isSelected && !isAnswer)
            cls = 'bg-red-50 border-red-400 text-red-700';
          if (checked && !isSelected && isAnswer)
            cls = 'bg-green-50 border-brand-green text-green-800';

          return (
            <button
              key={choice}
              type="button"
              onClick={() => handleChoice(choice)}
              className={`w-full border-2 rounded-2xl px-4 py-3.5 text-center font-bold text-base transition-all cursor-pointer active:scale-[0.98] ${cls}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {/* Check / feedback + Next */}
      <div className="flex-none pb-1">
        {!checked ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!selected}
            className={`w-full font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest transition-all ${
              selected
                ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Check
          </button>
        ) : isCorrect ? (
          <button
            type="button"
            onClick={handleNext}
            className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md transition-all"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl px-4 py-3 text-center bg-red-50 border border-red-300">
              <p className="font-bold text-sm text-red-600">
                ✗ The answer is: {item.answer}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md transition-all"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
