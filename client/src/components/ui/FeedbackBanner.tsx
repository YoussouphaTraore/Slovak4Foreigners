interface Props {
  correct: boolean;
  correctAnswer?: string;
  onContinue: () => void;
}

export function FeedbackBanner({ correct, correctAnswer, onContinue }: Props) {
  return (
    <div
      className={`animate-slide-up fixed bottom-0 left-0 right-0 px-4 pt-5 pb-8 ${
        correct ? 'bg-brand-green' : 'bg-brand-red'
      }`}
    >
      <div className="max-w-lg mx-auto">
        {correct ? (
          <p className="text-white font-bold text-xl mb-4 animate-bounce-once">
            Správne! ✓
          </p>
        ) : (
          <div className="mb-4">
            <p className="text-white font-bold text-xl">Nesprávne ✗</p>
            {correctAnswer && (
              <p className="text-white/90 text-sm mt-1">
                Correct answer: <span className="font-semibold">{correctAnswer}</span>
              </p>
            )}
          </div>
        )}
        <button
          onClick={onContinue}
          className={`w-full bg-white font-bold py-3 rounded-xl text-base cursor-pointer transition-opacity hover:opacity-90 ${
            correct ? 'text-brand-green' : 'text-brand-red'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
