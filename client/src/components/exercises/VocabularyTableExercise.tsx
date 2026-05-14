import { useState } from 'react';
import type { VocabularyTableExercise as TExercise } from '../../types/lesson';
import { MascotSpeech } from '../ui/MascotSpeech';

const MAX_REQUIRED = 11;

interface Props {
  exercise: TExercise;
  onDone: () => void;
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'sk-SK';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

export function VocabularyTableExercise({ exercise, onDone }: Props) {
  const [heard, setHeard] = useState<Set<string>>(new Set());

  // For small tables require all rows; for large tables cap at MAX_REQUIRED
  const required = Math.min(MAX_REQUIRED, exercise.rows.length);

  const handleTap = (label: string, slovak: string) => {
    speak(slovak);
    setHeard((prev) => {
      if (prev.has(label)) return prev;
      const next = new Set(prev);
      next.add(label);
      return next;
    });
  };

  const heardCount = heard.size;
  const ready = heardCount >= required;
  const remaining = required - heardCount;

  const [h0, h1, h2] = exercise.headers ?? ['When', 'Slovak', 'English'];

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <MascotSpeech message="Tap each row to hear it!" />

      <div className="flex items-center justify-between flex-none">
        <p className="text-xl font-extrabold text-gray-800">{exercise.title}</p>
        {!ready && (
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            {remaining} more to go
          </span>
        )}
        {ready && (
          <span className="text-xs font-semibold text-brand-green bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
            ✓ All heard!
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
        {/* Header */}
        <div className="grid grid-cols-[80px_1fr_1fr] gap-x-3 px-2 pb-1 border-b border-gray-200">
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{h0}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{h1}</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{h2}</span>
        </div>

        {exercise.rows.map((row) => {
          const tapped = heard.has(row.label);
          return (
            <button
              key={row.label}
              type="button"
              onClick={() => handleTap(row.label, row.slovak)}
              className={`grid grid-cols-[80px_1fr_1fr] gap-x-3 items-center rounded-2xl border-2 px-3 py-3.5 text-left active:scale-[0.98] transition-all cursor-pointer shadow-sm ${
                tapped
                  ? 'bg-green-50 border-brand-green'
                  : 'bg-white border-gray-100 hover:border-brand-blue hover:bg-blue-50'
              }`}
            >
              <span className={`text-xs font-medium leading-tight ${tapped ? 'text-green-600' : 'text-gray-400'}`}>
                {row.label}
              </span>
              <span className={`text-base font-bold leading-snug ${tapped ? 'text-green-800' : 'text-gray-800'}`}>
                {row.slovak}
              </span>
              <span className={`text-sm leading-snug ${tapped ? 'text-green-700' : 'text-gray-500'}`}>
                {row.english}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-none pb-1">
        <button
          type="button"
          onClick={onDone}
          disabled={!ready}
          className={`w-full font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest transition-all ${
            ready
              ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {ready ? 'Continue' : `Tap ${remaining} more`}
        </button>
      </div>
    </div>
  );
}
