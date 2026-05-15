import { useRef, useEffect, useState } from 'react';
import type { ListenAndTypeExercise as LATExercise } from '../../types/lesson';
import { cleanForSpeech } from '../../utils/speak';

type InputEl = HTMLInputElement | HTMLTextAreaElement;

interface Props {
  exercise: LATExercise;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  onInputRef?: (reg: { ref: React.RefObject<InputEl | null>; onChange: (v: string) => void } | null) => void;
}

function speak(text: string, rate = 1) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = 'sk-SK';
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

export function ListenAndTypeExercise({ exercise, value, onChange, disabled, onInputRef }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [noVoice, setNoVoice] = useState(false);

  useEffect(() => {
    onInputRef?.({ ref: textareaRef as React.RefObject<InputEl | null>, onChange });
    return () => onInputRef?.(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      if (!voices.some((v) => v.lang.startsWith('sk')) && voices.length > 0) setNoVoice(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-5xl">🎧</div>
      <p className="text-base font-semibold text-gray-600">Listen and type what you hear</p>

      {noVoice && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
          Slovak voice not available on your device. Try Chrome on desktop.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => speak(exercise.audioText, 1)}
          className="flex items-center gap-2 bg-brand-blue text-white font-bold px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <span>🔊</span> Listen
        </button>
        <button
          type="button"
          onClick={() => speak(exercise.audioText, 0.75)}
          className="flex items-center gap-2 bg-sky-100 text-brand-blue font-bold px-4 py-2.5 rounded-xl hover:bg-sky-200 active:scale-95 transition-all cursor-pointer"
        >
          🐢 Slow
        </button>
      </div>

      {exercise.hint && (
        <p className="text-xs text-gray-400 italic">{exercise.hint}</p>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type what you hear..."
        rows={2}
        className="w-full border-2 border-gray-200 rounded-xl p-3 text-base resize-none focus:outline-none focus:border-brand-blue disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
      />
    </div>
  );
}
