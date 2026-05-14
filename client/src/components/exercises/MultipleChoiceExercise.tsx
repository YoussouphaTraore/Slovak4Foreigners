import type { MultipleChoiceExercise as MCExercise } from '../../types/lesson';

interface Props {
  exercise: MCExercise;
  selected: string;
  onSelect: (choice: string) => void;
  disabled: boolean;
  showResult: boolean;
}

export function MultipleChoiceExercise({ exercise, selected, onSelect, disabled, showResult }: Props) {
  const getButtonStyle = (choice: string) => {
    const base = 'w-full border-2 rounded-2xl px-4 py-4 text-left font-medium text-base cursor-pointer transition-all duration-200';

    if (!showResult) {
      if (selected === choice) {
        return `${base} border-brand-blue bg-blue-50 text-brand-blue`;
      }
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

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xl font-semibold text-gray-800 leading-relaxed">
        {exercise.prompt}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {exercise.choices.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => !disabled && onSelect(choice)}
            disabled={disabled}
            className={getButtonStyle(choice)}
          >
            {choice}
            {showResult && choice === exercise.answer && ' ✓'}
          </button>
        ))}
      </div>
    </div>
  );
}
