import { useRef, useEffect } from 'react';
import type { TranslateExercise as TExercise } from '../../types/lesson';
import { FrogMascot } from '../ui/FrogMascot';

type InputEl = HTMLInputElement | HTMLTextAreaElement;

interface Props {
  exercise: TExercise;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  onInputRef?: (reg: { ref: React.RefObject<InputEl | null>; onChange: (v: string) => void } | null) => void;
}

export function TranslateExercise({ exercise, value, onChange, disabled, onInputRef }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    onInputRef?.({ ref: textareaRef as React.RefObject<InputEl | null>, onChange });
    return () => onInputRef?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  return (
    <div className="flex flex-col gap-4">
      {/* Owl + speech bubble showing the English prompt */}
      <div className="flex items-center gap-3">
        <div className="shrink-0"><FrogMascot size={80} /></div>
        <div className="relative bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 flex-1 shadow-sm">
          <span className="absolute -left-2.5 top-5 w-4 h-4 bg-white border-l-2 border-b-2 border-gray-200 rotate-45" />
          <p className="text-base font-semibold text-gray-800 leading-snug">{exercise.prompt}</p>
          {exercise.hint && (
            <p className="text-xs text-gray-400 mt-1">{exercise.hint}</p>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type in Slovak…"
        rows={2}
        className="w-full border-b-2 border-gray-300 bg-transparent px-1 py-2 text-base resize-none focus:outline-none focus:border-brand-blue disabled:text-gray-500 transition-colors"
      />
    </div>
  );
}
