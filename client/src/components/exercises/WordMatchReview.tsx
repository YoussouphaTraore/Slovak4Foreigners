import { useState, useMemo } from 'react';
import { MascotSpeech } from '../ui/MascotSpeech';

interface Pair { slovak: string; english: string }
type Side = 'slovak' | 'english';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  pairs: Pair[];
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

export function WordMatchReview({ pairs, onDone, onAnswer }: Props) {
  const shuffledEnglish = useMemo(() => shuffle(pairs.map((p) => p.english)), []);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ side: Side; value: string } | null>(null);
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

    const isMatch = pairs.some((p) => p.slovak === slovakVal && p.english === englishVal);

    if (isMatch) {
      onAnswer?.(true);
      const next = new Set(matched);
      next.add(slovakVal);
      next.add(englishVal);
      setMatched(next);
      setSelected(null);
      setWrongPair(null);
      if (next.size === pairs.length * 2) {
        setTimeout(onDone, 500);
      }
    } else {
      onAnswer?.(false);
      setWrongPair({ slovak: slovakVal, english: englishVal });
      setSelected(null);
      setTimeout(() => setWrongPair(null), 600);
    }
  };

  const getStyle = (side: Side, value: string): string => {
    const base =
      'border-2 rounded-xl px-4 py-3 text-sm font-medium cursor-pointer transition-all duration-200 text-left w-full active:scale-95';

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
      return `${base} border-brand-blue bg-blue-100 text-brand-blue`;
    }

    if (side === 'slovak') {
      return `${base} border-blue-200 bg-blue-50 text-blue-700 hover:border-brand-blue hover:bg-blue-100`;
    }
    return `${base} border-gray-200 bg-gray-50 text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
  };

  const matchedPairs = matched.size / 2;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <MascotSpeech message="Match each Slovak word to its English meaning!" />

      {/* Progress */}
      <div className="flex-none">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Matched {matchedPairs} of {pairs.length}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-500"
            style={{ width: `${Math.round((matchedPairs / pairs.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Match grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            {pairs.map((p) => (
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
            {shuffledEnglish.map((eng) => (
              <button
                key={eng}
                type="button"
                onClick={() => handleSelect('english', eng)}
                className={getStyle('english', eng)}
              >
                {eng}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
