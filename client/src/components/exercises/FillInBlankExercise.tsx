import { useRef, useEffect } from 'react';
import type { FillInBlankExercise as FIBExercise } from '../../types/lesson';

type InputEl = HTMLInputElement | HTMLTextAreaElement;

interface Props {
  exercise: FIBExercise;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  onInputRef?: (reg: { ref: React.RefObject<InputEl | null>; onChange: (v: string) => void } | null) => void;
}

export function FillInBlankExercise({ exercise, value, onChange, disabled, onInputRef }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onInputRef?.({ ref: inputRef as React.RefObject<InputEl | null>, onChange });
    return () => onInputRef?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const [before, after] = exercise.sentence.split('___');

  return (
    <div className="flex flex-col gap-4">
      {exercise.hint && (
        <p className="text-sm text-gray-500 italic text-center">{exercise.hint}</p>
      )}
      <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-1 text-xl font-semibold text-gray-800 justify-center">
          <span>{before}</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder="___"
            className="border-b-2 border-brand-blue bg-transparent text-brand-blue text-center focus:outline-none disabled:text-gray-500 w-28 mx-1"
            style={{ minWidth: `${Math.max(value.length, 6) * 12}px`, maxWidth: '160px' }}
          />
          <span>{after}</span>
        </div>
      </div>
    </div>
  );
}
