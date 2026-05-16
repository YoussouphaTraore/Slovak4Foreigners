import { useNavigate } from 'react-router-dom';

function GoogleIcon() {
  return (
    <span className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-xs font-black text-blue-600 shrink-0">
      G
    </span>
  );
}

type TriggerType = 'unlock' | 'streak' | 'dialogue';

export const SAVE_MODAL_DISMISS_KEY = 'save-modal-dismissed-until';

const MESSAGES: Record<TriggerType, { emoji: string; headline: string; body: string }> = {
  unlock: {
    emoji: '🔓',
    headline: 'Save before you lose it!',
    body: 'You just unlocked a new stage. Create a free account so your progress is never lost.',
  },
  streak: {
    emoji: '🔥',
    headline: '3-day streak!',
    body: "You're on a roll! Create a free account to protect your streak across devices.",
  },
  dialogue: {
    emoji: '💬',
    headline: 'Great conversation!',
    body: 'Create a free account to save your dialogue progress and continue from any device.',
  },
};

interface Props {
  trigger: TriggerType;
  onDismiss: () => void;
}

export function SaveProgressModal({ trigger, onDismiss }: Props) {
  const navigate = useNavigate();
  const { emoji, headline, body } = MESSAGES[trigger];

  const handleMaybeLater = () => {
    localStorage.setItem(SAVE_MODAL_DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
        <div className="text-center mb-4">
          <span className="text-5xl">{emoji}</span>
        </div>
        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-2">{headline}</h2>
        <p className="text-sm text-gray-500 text-center leading-snug mb-6">{body}</p>
        <button
          type="button"
          onClick={() => { onDismiss(); navigate('/auth'); }}
          className="w-full bg-white border-2 border-brand-green text-gray-800 font-bold py-3 rounded-xl text-sm mb-3 cursor-pointer hover:bg-green-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={handleMaybeLater}
          className="w-full text-gray-400 text-sm py-1.5 cursor-pointer hover:text-gray-600 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
