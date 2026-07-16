import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getBlockDialogueById } from '../data/block-dialogues';
import { useProgressStore } from '../store/useProgressStore';
import { ConversationSpeakingExercise } from '../components/exercises/ConversationSpeakingExercise';

export function BlockDialoguePage() {
  const { blockId } = useParams<{ blockId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const completeBlockDialogue = useProgressStore((s) => s.completeBlockDialogue);
  const addXP = useProgressStore((s) => s.addXP);

  const [speakingDone, setSpeakingDone] = useState(false);

  const dialogue = blockId ? getBlockDialogueById(blockId) : undefined;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeakingDone(false);
  }, [location.key]);

  if (!dialogue) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-gray-500 text-sm">Dialogue not found.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 text-brand-green font-semibold text-sm underline"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // ── Completion screen ─────────────────────────────────────────────────────

  if (speakingDone) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-6">
          <img src="/snailExcited.png" alt="" className="w-32 h-32 object-contain" />
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 mb-3">
              Block Dialogue Complete
            </span>
            <h1 className="text-2xl font-extrabold text-gray-800 leading-snug mb-2">
              {dialogue.title}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {dialogue.completionMessage}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 shadow-sm w-full max-w-xs text-center">
            <p className="text-3xl font-extrabold text-brand-green">+{dialogue.xpReward} XP</p>
            <p className="text-xs text-gray-600 mt-1">Block Dialogue reward</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── No speaking round yet ─────────────────────────────────────────────────

  if (!dialogue.speakingRound) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-600 text-xl leading-none cursor-pointer"
            >
              ←
            </button>
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
              {dialogue.contact.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-tight">{dialogue.contact.name}</p>
              <p className="text-xs text-gray-600 leading-tight truncate">{dialogue.contact.role}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-4">
          <span className="text-5xl">🎙️</span>
          <h2 className="text-xl font-extrabold text-gray-700">Speaking exercise coming soon</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            Audio for this dialogue is being recorded. Check back soon!
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Speaking exercise ─────────────────────────────────────────────────────

  function handleSpeakingDone() {
    if (!blockId || !dialogue) return;
    completeBlockDialogue(blockId);
    addXP(dialogue.xpReward);
    setSpeakingDone(true);
  }

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ←
          </button>
          <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
            {dialogue.contact.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight">{dialogue.contact.name}</p>
            <p className="text-xs text-gray-600 leading-tight truncate">{dialogue.contact.role}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 bg-purple-100 text-purple-700">
            Speaking
          </span>
        </div>
      </div>

      {/* Exercise */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-4">
        <ConversationSpeakingExercise
          exercise={dialogue.speakingRound}
          onDone={handleSpeakingDone}
        />
      </div>
    </div>
  );
}
