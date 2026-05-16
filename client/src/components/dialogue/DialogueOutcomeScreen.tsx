import type { DialogueOutcome } from '../../types/dialogue';

interface Props {
  outcome: DialogueOutcome;
  xpEarned: number;
  vocabUsed: string[];
  onTryOtherPath: () => void;
  onBack: () => void;
}

export function DialogueOutcomeScreen({ outcome, xpEarned, vocabUsed, onTryOtherPath, onBack }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 gap-6">
      {/* Result card */}
      <div className="w-full bg-white rounded-3xl border-2 border-brand-green shadow-sm px-6 py-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-800 leading-snug mb-2">{outcome.title}</h2>
        <p className="text-sm text-gray-500">{outcome.description}</p>

        {/* XP earned */}
        <div className="mt-5 inline-flex items-center gap-2 bg-amber-100 text-amber-700 font-bold px-4 py-2 rounded-full text-sm">
          <span>⚡</span>
          <span>+{xpEarned} XP earned</span>
        </div>
      </div>

      {/* Vocab used */}
      {vocabUsed.length > 0 && (
        <div className="w-full">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 text-center">
            Vocabulary you used
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {vocabUsed.map((word) => (
              <span
                key={word}
                className="bg-green-50 border border-brand-green text-brand-green text-sm font-medium px-3 py-1 rounded-full"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="w-full flex flex-col gap-3">
        <button
          type="button"
          onClick={onTryOtherPath}
          className="w-full py-4 rounded-2xl bg-brand-green text-white font-bold text-sm uppercase tracking-wide cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Try Other Path ↩
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm uppercase tracking-wide cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          Back to Practice
        </button>
      </div>
    </div>
  );
}
