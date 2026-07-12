import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

export type SaveModalTrigger = 'soft' | 'hard_dialogue' | 'hard_lesson2' | 'regression';

// Keys written to localStorage so the store can check before showing
export const SOFT_DISMISS_KEY = 'save-modal-dismissed-soft';
export const REGRESSION_DISMISS_KEY = 'save-modal-dismissed-regression';
const DISMISS_MS = 4 * 60 * 60 * 1000; // 4 hours

function GoogleIcon() {
  return (
    <span className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-xs font-black text-blue-600 shrink-0">
      G
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}

const CONTENT: Record<SaveModalTrigger, { title: string; body?: string }> = {
  soft: {
    title: "You're making great progress!",
    body: "Sign in to make sure none of it gets lost between sessions.",
  },
  hard_dialogue: {
    title: 'Sign in to continue',
    body: 'Sign in to unlock all conversation scenarios and keep your progress safe.',
  },
  hard_lesson2: {
    title: 'Great start! 🎉',
    body: 'Create a free account to unlock the next lesson and keep your XP and streak safe forever.',
  },
  regression: {
    title: 'Welcome back, Guest Learner!',
  },
};

interface Props {
  trigger: SaveModalTrigger;
  onDismiss: () => void;
  regressionLessonTitle?: string;
}

export function SaveProgressModal({ trigger, onDismiss, regressionLessonTitle }: Props) {
  const { signInWithGoogle, isLoading } = useAuthStore();
  const [maybeLaterOpacity, setMaybeLaterOpacity] = useState(0);

  useEffect(() => {
    const isHardTrigger = trigger === 'hard_dialogue' || trigger === 'hard_lesson2';
    if (isHardTrigger) return;
    // Delay start so the transition is visible, then fade in over 6s
    const start = performance.now() + 100;
    const DURATION = 10000;
    let raf: number;
    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.min(1, Math.max(0, elapsed / DURATION));
      // Ease-in (quadratic) so it stays near-invisible for the first few seconds
      setMaybeLaterOpacity(t * t);
      if (elapsed < DURATION) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger]);

  const isHard = trigger === 'hard_dialogue' || trigger === 'hard_lesson2';
  const { title, body } = CONTENT[trigger];

  const handleDismiss = () => {
    // Snooze keys only apply to the re-firing prompts; hard gates re-show every time
    if (trigger === 'soft' || trigger === 'regression') {
      const key = trigger === 'soft' ? SOFT_DISMISS_KEY : REGRESSION_DISMISS_KEY;
      try { localStorage.setItem(key, String(Date.now() + DISMISS_MS)); } catch { /* */ }
    }
    onDismiss();
  };

  const handleGoogle = async () => {
    onDismiss();
    await signInWithGoogle();
  };

  // hard_lesson2 blocks the lesson but must not trap the user on the modal —
  // backdrop click closes it (they stay where they are, lesson stays locked)
  const handleBackdrop = () => {
    if (!isHard || trigger === 'hard_lesson2') handleDismiss();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 ${
        isHard ? 'bg-black/90' : 'bg-black/50'
      }`}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Snail image — 100 px wide, centered */}
        <div className="flex justify-center" style={{ marginBottom: 16 }}>
          <img
            src="/snail.png"
            alt=""
            style={{ width: 100, height: 'auto' }}
          />
        </div>

        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-3">
          {title}
        </h2>

        {trigger === 'regression' ? (
          <div className="text-center mb-6 space-y-2">
            <p className="text-sm text-gray-600 leading-snug">
              Your guest account has hit its limit — some of your progress couldn't be saved.
            </p>
            <p className="text-xs text-gray-400 leading-snug">
              Sign in to keep everything safe and never lose your place again.
            </p>
            {regressionLessonTitle && (
              <p className="text-xs text-gray-500 italic mt-1">
                We've reset "{regressionLessonTitle}" so you can review it.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center leading-snug mb-6">{body}</p>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full bg-white border-2 border-brand-green text-gray-800 font-bold py-3 rounded-xl text-sm cursor-pointer hover:bg-green-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 mb-3"
        >
          {isLoading ? <Spinner /> : <GoogleIcon />}
          Continue with Google
        </button>

        {!isHard && (
          <button
            type="button"
            onClick={maybeLaterOpacity > 0 ? handleDismiss : undefined}
            style={{ opacity: maybeLaterOpacity, pointerEvents: maybeLaterOpacity > 0 ? 'auto' : 'none' }}
            className="w-full text-gray-200 text-sm py-1.5 cursor-pointer"
          >
            Maybe Later
          </button>
        )}
      </div>
    </div>
  );
}
