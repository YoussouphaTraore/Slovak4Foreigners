import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getBlockDialogueById } from '../data/block-dialogues';
import { useProgressStore } from '../store/useProgressStore';
import type {
  BlockDialogueChoice,
  BlockDialogueContact,
  BlockDialogueExchange,
  BlockDialogueSpeaker,
} from '../types/blockDialogue';

type Phase = 'choosing' | 'feedback' | 'complete';
type RetryPhase = 'idle' | 'waiting' | 'confusion' | 'repeating';
type ResolvedExchangeSpeaker = (BlockDialogueContact | BlockDialogueSpeaker) & {
  isExplicitSpeaker: boolean;
};

const CONFUSION_TEXT = 'Prepáčte, nerozumiem. Môžete to skúsiť znova?';
const CONFUSION_TRANSLATION = "Sorry, I don't understand. Can you try again?";
const CONFUSION_DELAY_MS = 600;
const REPEAT_DELAY_MS = 800;

export function BlockDialoguePage() {
  const { blockId } = useParams<{ blockId: string }>();
  const location = useLocation();
  const isGuided = (location.state as { guided?: boolean } | null)?.guided === true;
  const navigate = useNavigate();
  const completeBlockDialogue = useProgressStore((s) => s.completeBlockDialogue);
  const addXP = useProgressStore((s) => s.addXP);

  const dialogue = blockId ? getBlockDialogueById(blockId) : undefined;

  const [exchangeIndex, setExchangeIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('choosing');
  const [selectedChoice, setSelectedChoice] = useState<BlockDialogueChoice | null>(null);
  const [history, setHistory] = useState<{ exchange: BlockDialogueExchange; chosen: BlockDialogueChoice }[]>([]);
  const [retryPhase, setRetryPhase] = useState<RetryPhase>('idle');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const wrongAttemptsRef = useRef(0);
  const retryTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearRetryTimers() {
    retryTimersRef.current.forEach(clearTimeout);
    retryTimersRef.current = [];
  }

  function scheduleRetrySequence() {
    clearRetryTimers();
    setRetryPhase('waiting');
    retryTimersRef.current.push(
      setTimeout(() => setRetryPhase('confusion'), CONFUSION_DELAY_MS),
      setTimeout(() => setRetryPhase('repeating'), CONFUSION_DELAY_MS + REPEAT_DELAY_MS),
    );
  }

  // Reset all dialogue state on every navigation (location.key is unique per navigation event).
  // Without this, navigating from guided → unguided reuses the component instance and
  // phase stays 'complete', jumping straight to the completion screen.
  useEffect(() => {
    setExchangeIndex(0);
    setPhase('choosing');
    setSelectedChoice(null);
    setHistory([]);
    clearRetryTimers();
    setRetryPhase('idle');
    wrongAttemptsRef.current = 0;
  }, [location.key]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, phase, retryPhase]);

  useEffect(() => () => clearRetryTimers(), []);

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

  const currentExchange = dialogue.exchanges[exchangeIndex];
  const totalExchanges = dialogue.exchanges.length;
  const getExchangeSpeaker = (exchange: BlockDialogueExchange): ResolvedExchangeSpeaker => {
    const speaker = dialogue.speakers?.[exchange.speaker];
    return {
      ...(speaker ?? dialogue.contact),
      isExplicitSpeaker: !!speaker,
    };
  };

  function handleChoose(choice: BlockDialogueChoice) {
    if (phase !== 'choosing') return;
    setSelectedChoice(choice);
    setPhase('feedback');
  }

  function advanceToNextExchange() {
    wrongAttemptsRef.current = 0;
    clearRetryTimers();
    setRetryPhase('idle');

    const nextIndex = exchangeIndex + 1;
    if (nextIndex >= totalExchanges) {
      setPhase('complete');
    } else {
      setExchangeIndex(nextIndex);
      setPhase('choosing');
    }
  }

  function handleContinue() {
    if (!selectedChoice || !currentExchange) return;

    const newHistory = [...history, { exchange: currentExchange, chosen: selectedChoice }];
    setHistory(newHistory);

    const shouldRetryClosedQuestion =
      !currentExchange.isOpenQuestion && !selectedChoice.isCorrect;

    setSelectedChoice(null);

    if (shouldRetryClosedQuestion) {
      wrongAttemptsRef.current += 1;
      if (wrongAttemptsRef.current < 2) {
        setPhase('choosing');
        scheduleRetrySequence();
        return;
      }
    }

    advanceToNextExchange();
  }

  const willRetryClosedQuestion =
    phase === 'feedback' &&
    !!selectedChoice &&
    !currentExchange.isOpenQuestion &&
    !selectedChoice.isCorrect &&
    wrongAttemptsRef.current < 1;

  function handleComplete() {
    if (!blockId || !dialogue) return;
    completeBlockDialogue(blockId);
    addXP(dialogue.xpReward);
    navigate('/');
  }

  // ── Completion screens ────────────────────────────────────────────────────

  if (phase === 'complete' && isGuided) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center gap-6">
          <span className="text-6xl">🎯</span>
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 mb-3">
              Guided mode complete
            </span>
            <h1 className="text-2xl font-extrabold text-gray-800 leading-snug mb-2">
              Ready for the real thing?
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Same conversation — this time without the translations. You've got this.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/block-dialogue/${blockId}`)}
            className="w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            Let's Go
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'complete' && !isGuided) {
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
            <p className="text-xs text-gray-400 mt-1">Block Dialogue reward</p>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            className="w-full max-w-xs bg-brand-green text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Active dialogue ───────────────────────────────────────────────────────

  const progressFraction = exchangeIndex / totalExchanges;
  const feedbackText = selectedChoice
    ? selectedChoice.isCorrect
      ? currentExchange.correctFeedback
      : currentExchange.wrongFeedback
    : '';
  const showCurrentExchange = currentExchange && (retryPhase === 'idle' || retryPhase === 'repeating');
  const showChoices = phase === 'choosing' && currentExchange && (retryPhase === 'idle' || retryPhase === 'repeating');
  const showConfusionBubble = retryPhase === 'confusion' || retryPhase === 'repeating';
  const currentSpeaker = currentExchange
    ? getExchangeSpeaker(currentExchange)
    : { ...dialogue.contact, isExplicitSpeaker: false };

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-3 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          >
            ←
          </button>
          <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-extrabold text-amber-700 shrink-0">
            {dialogue.contact.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight">{dialogue.contact.name}</p>
            <p className="text-xs text-gray-400 leading-tight truncate">{dialogue.contact.role}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${
            isGuided ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {isGuided ? 'Guided' : 'Block Dialogue'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-green rounded-full transition-all duration-300"
            style={{ width: `${progressFraction * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-right">
          {exchangeIndex + 1} / {totalExchanges}
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-2 flex flex-col gap-4">
        {/* Context bubble — shown once at top */}
        {history.length === 0 && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base shrink-0">
              ℹ️
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
              <p className="text-xs text-gray-500 italic leading-relaxed">{dialogue.context}</p>
            </div>
          </div>
        )}

        {/* History bubbles */}
        {history.map(({ exchange, chosen }, index) => {
          const speaker = getExchangeSpeaker(exchange);

          return (
            <div key={`${exchange.id}-${index}`} className="flex flex-col gap-3">
              {/* Contact says */}
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-extrabold text-amber-700 shrink-0">
                  {speaker.isExplicitSpeaker ? speaker.avatar : speaker.initials}
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[80%] shadow-sm border border-gray-100">
                  {speaker.isExplicitSpeaker && (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">
                      {speaker.name} ({speaker.initials})
                    </p>
                  )}
                  <p className="text-sm font-semibold text-gray-800">{exchange.text}</p>
                  {isGuided && (
                    <p className="text-[11px] text-gray-400 mt-0.5 italic">{exchange.translation}</p>
                  )}
                </div>
              </div>

              {/* User's chosen answer */}
              <div className="flex items-start gap-2 flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-xs shrink-0 text-white font-extrabold">
                  Y
                </div>
                <div
                  className={`rounded-2xl rounded-tr-sm px-3 py-2.5 max-w-[80%] shadow-sm ${
                    chosen.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <p className={`text-sm font-semibold ${chosen.isCorrect ? 'text-green-800' : 'text-red-700'}`}>
                    {chosen.text}
                  </p>
                  {isGuided && (
                    <p className={`text-[11px] mt-0.5 italic ${chosen.isCorrect ? 'text-green-500' : 'text-red-400'}`}>
                      {chosen.translation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Retry prompt for first wrong answer on a closed question */}
        {showConfusionBubble && (
          <div className="flex items-start gap-2 animate-msg-in">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-extrabold text-amber-700 shrink-0">
              {dialogue.contact.initials}
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[80%] shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{CONFUSION_TEXT}</p>
              {isGuided && (
                <p className="text-[11px] text-gray-400 mt-0.5 italic">{CONFUSION_TRANSLATION}</p>
              )}
            </div>
          </div>
        )}

        {/* Current exchange — contact says */}
        {showCurrentExchange && (
          <div className="flex items-start gap-2 animate-msg-in">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-extrabold text-amber-700 shrink-0">
              {currentSpeaker.isExplicitSpeaker ? currentSpeaker.avatar : currentSpeaker.initials}
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 max-w-[80%] shadow-sm border border-gray-100">
              {currentSpeaker.isExplicitSpeaker && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">
                  {currentSpeaker.name} ({currentSpeaker.initials})
                </p>
              )}
              <p className="text-sm font-semibold text-gray-800">{currentExchange.text}</p>
              {isGuided && (
                <p className="text-[11px] text-gray-400 mt-0.5 italic">{currentExchange.translation}</p>
              )}
            </div>
          </div>
        )}

        {/* Selected answer bubble (after choosing, before continuing) */}
        {phase === 'feedback' && selectedChoice && (
          <div className="flex items-start gap-2 flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center text-xs shrink-0 text-white font-extrabold">
              Y
            </div>
            <div
              className={`rounded-2xl rounded-tr-sm px-3 py-2.5 max-w-[80%] shadow-sm ${
                selectedChoice.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <p className={`text-sm font-semibold ${selectedChoice.isCorrect ? 'text-green-800' : 'text-red-700'}`}>
                {selectedChoice.text}
              </p>
              {isGuided && (
                <p className={`text-[11px] mt-0.5 italic ${selectedChoice.isCorrect ? 'text-green-500' : 'text-red-400'}`}>
                  {selectedChoice.translation}
                </p>
              )}
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Prompt text — shown above bottom panel while choosing */}
      {showChoices && (
        <div className="flex-none px-4 pb-2">
          <p className="text-xs font-semibold text-gray-500 text-center">{currentExchange.prompt}</p>
        </div>
      )}

      {/* Bottom panel — choices or feedback */}
      <div className="flex-none bg-white border-t border-gray-100 px-4 pt-3 pb-6 shadow-lg">
        {showChoices && (
          <div className="flex flex-col gap-2">
            {currentExchange.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoose(choice)}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-brand-green hover:bg-green-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                <p className="text-sm font-semibold text-gray-800">{choice.text}</p>
                {isGuided && (
                  <p className="text-[11px] text-gray-400 italic mt-0.5">{choice.translation}</p>
                )}
              </button>
            ))}
          </div>
        )}

        {phase === 'feedback' && selectedChoice && (
          <div className={`rounded-2xl px-4 py-3 ${
            selectedChoice.isCorrect
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">{selectedChoice.isCorrect ? '✅' : '❌'}</span>
              <span className={`text-sm font-bold ${selectedChoice.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {selectedChoice.isCorrect ? 'Great choice!' : 'Not quite'}
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{feedbackText}</p>
            <button
              type="button"
              onClick={handleContinue}
              className="mt-3 w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              {willRetryClosedQuestion ? 'Try Again' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
