import { useState } from 'react';
import type { WordMatchExercise as WMExercise } from '../../types/lesson';

interface Props {
  exercise: WMExercise;
  onAllMatched: () => void;
}

type Side = 'slovak' | 'english';

interface Selection {
  side: Side;
  value: string;
}

export function WordMatchExercise({ exercise, onAllMatched }: Props) {
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selection | null>(null);
  const [wrongPair, setWrongPair] = useState<{ slovak: string; english: string } | null>(null);

  const handleSelect = (side: Side, value: string) => {
    if (matched.has(value)) return;

    if (!selected) {
      setSelected({ side, value });
      return;
    }

    if (selected.side === side) {
      setSelected({ side, value });
      return;
    }

    const slovakVal = side === 'slovak' ? value : selected.value;
    const englishVal = side === 'english' ? value : selected.value;

    const isMatch = exercise.pairs.some(
      (p) => p.slovak === slovakVal && p.english === englishVal
    );

    if (isMatch) {
      const newMatched = new Set(matched);
      newMatched.add(slovakVal);
      newMatched.add(englishVal);
      setMatched(newMatched);
      setSelected(null);
      setWrongPair(null);
      if (newMatched.size === exercise.pairs.length * 2) {
        setTimeout(onAllMatched, 400);
      }
    } else {
      setWrongPair({ slovak: slovakVal, english: englishVal });
      setSelected(null);
      setTimeout(() => setWrongPair(null), 600);
    }
  };

  const getStyle = (side: Side, value: string) => {
    const base = 'border-2 rounded-xl px-3 py-3 text-sm font-medium cursor-pointer transition-all duration-200 text-left';

    if (matched.has(value)) {
      return `${base} border-brand-green bg-green-50 text-brand-green opacity-60 pointer-events-none`;
    }

    const isWrong =
      wrongPair &&
      ((side === 'slovak' && wrongPair.slovak === value) ||
        (side === 'english' && wrongPair.english === value));

    if (isWrong) {
      return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
    }

    const isActive = selected?.side === side && selected?.value === value;
    if (isActive) {
      return `${base} border-brand-blue bg-blue-50 text-brand-blue`;
    }

    return `${base} border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-semibold text-gray-500 mb-1">
        Match each Slovak phrase with its English meaning.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {exercise.pairs.map((p) => (
            <button
              key={p.slovak}
              type="button"
              onClick={() => handleSelect('slovak', p.slovak)}
              className={getStyle('slovak', p.slovak)}
            >
              {p.slovak}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {exercise.pairs.map((p) => (
            <button
              key={p.english}
              type="button"
              onClick={() => handleSelect('english', p.english)}
              className={getStyle('english', p.english)}
            >
              {p.english}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
