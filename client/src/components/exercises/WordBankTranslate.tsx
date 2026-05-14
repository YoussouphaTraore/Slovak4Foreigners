import { useState } from 'react';
import type { TranslateExercise } from '../../types/lesson';
import { FrogMascot } from '../ui/FrogMascot';

interface Props {
  exercise: TranslateExercise;
  onChange: (answer: string) => void;
  disabled: boolean;
}

interface Token {
  id: number;
  word: string;
  inAnswer: boolean;
}

const DISTRACTORS = [
  'apple', 'morning', 'house', 'are', 'was', 'their', 'when',
  'good', 'how', 'going', 'today', 'very', 'much', 'only', 'also',
  'make', 'time', 'some', 'just', 'from', 'over', 'come', 'see',
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTokens(answer: string): Token[] {
  const answerWords = answer.trim().split(/\s+/).map((w) => w.replace(/[.,!?;:]$/g, ''));
  const lowerSet = new Set(answerWords.map((w) => w.toLowerCase()));
  const distractors = shuffle(DISTRACTORS.filter((w) => !lowerSet.has(w))).slice(0, 3);
  return shuffle([...answerWords, ...distractors]).map((word, id) => ({ id, word, inAnswer: false }));
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'sk-SK';
  window.speechSynthesis.speak(u);
}

export function WordBankTranslate({ exercise, onChange, disabled }: Props) {
  const [tokens, setTokens] = useState<Token[]>(() => buildTokens(exercise.answer));
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);

  const select = (id: number) => {
    if (disabled) return;
    const nextTokens = tokens.map((t) => (t.id === id ? { ...t, inAnswer: true } : t));
    const nextOrder = [...selectedOrder, id];
    setTokens(nextTokens);
    setSelectedOrder(nextOrder);
    onChange(nextOrder.map((sid) => nextTokens.find((t) => t.id === sid)!.word).join(' '));
  };

  const deselect = (id: number) => {
    if (disabled) return;
    const nextTokens = tokens.map((t) => (t.id === id ? { ...t, inAnswer: false } : t));
    const nextOrder = selectedOrder.filter((sid) => sid !== id);
    setTokens(nextTokens);
    setSelectedOrder(nextOrder);
    onChange(nextOrder.map((sid) => nextTokens.find((t) => t.id === sid)!.word).join(' '));
  };

  const selected = selectedOrder.map((id) => tokens.find((t) => t.id === id)!);
  const bank = tokens.filter((t) => !t.inAnswer);

  return (
    <div className="flex flex-col gap-5">
      {/* Owl + speech bubble */}
      <div className="flex items-center gap-3">
        <div className="shrink-0"><FrogMascot size={90} /></div>
        <div className="relative bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 flex-1 shadow-sm">
          {/* Bubble tail */}
          <span className="absolute -left-2.5 top-5 w-4 h-4 bg-white border-l-2 border-b-2 border-gray-200 rotate-45" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => speak(exercise.prompt)}
              className="w-9 h-9 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0 hover:opacity-80 active:scale-90 cursor-pointer transition-all"
            >
              🔊
            </button>
            <p className="text-base font-semibold text-gray-800 leading-snug">
              {exercise.prompt}
            </p>
          </div>
          {exercise.hint && (
            <p className="text-xs text-gray-400 mt-1 ml-11">{exercise.hint}</p>
          )}
        </div>
      </div>

      {/* Answer slots */}
      <div className="min-h-[60px] border-b-2 border-gray-300 pb-2 flex flex-wrap gap-2 items-end">
        {selected.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => deselect(t.id)}
            disabled={disabled}
            className="bg-white border-2 border-gray-300 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-800 hover:border-brand-red hover:bg-red-50 cursor-pointer active:scale-95 transition-all shadow-sm disabled:cursor-not-allowed"
          >
            {t.word}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-dashed border-gray-300" />

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 justify-center">
        {bank.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => select(t.id)}
            disabled={disabled}
            className="bg-white border-2 border-gray-200 border-b-4 border-b-gray-300 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 hover:border-brand-blue hover:bg-blue-50 cursor-pointer active:scale-95 active:border-b-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.word}
          </button>
        ))}
      </div>
    </div>
  );
}
