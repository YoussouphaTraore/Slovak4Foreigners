import type { ReferenceCard } from '../../types/foreignerExclusive';

interface Props {
  card: ReferenceCard;
  onDone: () => void;
}

export function ReferenceCardScreen({ card, onDone }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#E8F4DC]">
      {/* Sticky header */}
      <div className="flex-none bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green mb-0.5">Reference Card Unlocked</p>
          <h1 className="text-base font-extrabold text-gray-800 leading-tight">{card.title}</h1>
          <p className="text-xs text-gray-400">{card.titleSlovak}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-32">

          {/* Unlock message */}
          <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm text-center">
            <p className="text-sm text-gray-700 leading-snug">{card.unlockedMessage}</p>
          </div>

          {/* Document checklist */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2 px-1">What to bring</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {card.checklist.map((item, i) => (
                <div
                  key={i}
                  className={`px-4 py-3.5 ${i < card.checklist.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-brand-green mt-0.5 shrink-0 text-sm">✓</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{item.item}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.slovak}</p>
                      {item.warning && (
                        <div className="flex items-start gap-1 mt-1.5">
                          <span className="text-amber-500 text-xs shrink-0">⚠️</span>
                          <p className="text-xs text-amber-700 leading-snug">{item.warning}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key facts */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2 px-1">Key facts</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {card.keyFacts.map((fact, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 px-4 py-3 ${i < card.keyFacts.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <span className="text-blue-400 text-xs mt-0.5 shrink-0">ℹ</span>
                  <p className="text-sm text-gray-700 leading-snug">{fact}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key phrase */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2 px-1">Key phrase</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
              <p className="text-base font-bold text-gray-800 leading-snug mb-1">{card.keyPhrase.slovak}</p>
              <p className="text-sm text-gray-400 italic">{card.keyPhrase.english}</p>
            </div>
          </div>

          {/* Where to apply */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2 px-1">Where to apply</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0">🌐</span>
                <p className="text-sm text-gray-700 leading-snug">{card.whereToApply}</p>
              </div>
            </div>
          </div>

          {/* Free help */}
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2 px-1">Free help</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <span className="text-lg shrink-0">🤝</span>
                <p className="text-sm text-gray-700 leading-snug">{card.freeHelp}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky bottom button */}
      <div className="flex-none bg-white border-t border-gray-100 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={onDone}
            className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all text-sm uppercase tracking-widest"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    </div>
  );
}
