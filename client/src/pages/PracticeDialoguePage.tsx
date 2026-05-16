import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dialogues } from '../data/dialogues';
import { useProgressStore } from '../store/useProgressStore';
import { useAuthStore } from '../store/useAuthStore';
import { SaveProgressModal } from '../components/auth/SaveProgressModal';
import { BottomNav } from '../components/ui/BottomNav';

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — Survival',
  2: 'Tier 2 — Settling In',
  3: 'Tier 3 — Advanced',
};

export function PracticeDialoguePage() {
  const navigate = useNavigate();
  const { unlockedStages } = useProgressStore();
  const user = useAuthStore((s) => s.user);
  const [showAuthGate, setShowAuthGate] = useState(false);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-lg font-bold text-gray-800">Practice Dialogue</h1>
        <p className="text-xs text-gray-400 mt-0.5">Real conversations with Slovak characters</p>
      </div>

      {/* Dialogue cards */}
      <div className="flex-1 px-4 py-6 pb-28 space-y-4">
        {dialogues.map((dialogue, index) => {
          const isStageLocked = !unlockedStages.includes(dialogue.stageRequired);
          const isAuthLocked = !user && index >= 2;
          const isLocked = isStageLocked;

          const handleStart = () => {
            if (isStageLocked) return;
            if (isAuthLocked) { setShowAuthGate(true); return; }
            navigate(`/practice/dialogue/${dialogue.id}`);
          };

          return (
            <div
              key={dialogue.id}
              className={`bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm transition-opacity ${isLocked ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="text-5xl leading-none">{dialogue.character.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-base font-bold text-gray-800">{dialogue.topic}</h2>
                    {dialogue.emergencyMode ? (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                        🚨 Emergency Training
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        {TIER_LABELS[dialogue.tier] ?? `Tier ${dialogue.tier}`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-snug">{dialogue.description}</p>
                </div>
              </div>

              <button
                type="button"
                disabled={isLocked}
                onClick={handleStart}
                className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all cursor-pointer
                  ${isLocked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98]'
                  }`}
              >
                {isLocked ? `🔒 Unlock ${dialogue.stageRequired} stage first` : 'Start Conversation →'}
              </button>
            </div>
          );
        })}
      </div>

      <BottomNav active="practice" />

      {showAuthGate && (
        <SaveProgressModal
          trigger="hard_dialogue"
          onDismiss={() => setShowAuthGate(false)}
        />
      )}
    </div>
  );
}
