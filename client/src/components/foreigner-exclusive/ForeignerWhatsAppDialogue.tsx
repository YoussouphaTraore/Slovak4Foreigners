import { useState, useEffect, useRef } from 'react';
import type { WhatsAppDialogueExercise, WhatsAppNode, WhatsAppChoice } from '../../types/foreignerExclusive';
import { slovakifyNumbers } from '../../utils/numberToSlovak';

interface Props {
  exercise: WhatsAppDialogueExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

type Phase = 'chat' | 'outcome' | 'questions';

interface HistoryEntry {
  key: string;
  speaker: 'user' | 'landlord' | 'error';
  text: string;
  time: string;
}

const WA_DARK  = '#075E54';
const WA_GREEN = '#25D366';
const WA_BG    = '#E5DDD5';
const WA_BUBBLE = '#DCF8C6';

function fakeTime(index: number): string {
  const base = 14 * 60 + 32;
  const t = base + index * 2;
  return `${Math.floor(t / 60) % 24}:${String(t % 60).padStart(2, '0')}`;
}

export function ForeignerWhatsAppDialogue({ exercise, onDone, onAnswer }: Props) {
  const [phase, setPhase]               = useState<Phase>('chat');
  const [currentNodeId, setCurrentNodeId] = useState(exercise.nodes[0].id);
  const [chatHistory, setChatHistory]   = useState<HistoryEntry[]>([]);
  const [disabledIds, setDisabledIds]   = useState<Set<string>>(new Set());
  const [showTyping, setShowTyping]     = useState(false);
  const [showChoices, setShowChoices]   = useState(false);
  const [isLocked, setIsLocked]         = useState(false);
  const [outcomeId, setOutcomeId]       = useState<string | null>(null);
  const [showButton, setShowButton]     = useState(false);
  const [qIndex, setQIndex]             = useState(0);
  const [selected, setSelected]         = useState<string | null>(null);
  const [revealed, setRevealed]         = useState(false);

  const chatRef    = useRef<HTMLDivElement>(null);
  const timersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const msgCount   = useRef(0);

  const nextTime = () => fakeTime(msgCount.current++);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  // Auto-scroll to latest message
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chatHistory, showTyping, showButton]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  const findNode = (id: string): WhatsAppNode =>
    exercise.nodes.find(n => n.id === id)!;

  // Process a landlord-speaker node: show typing → show message → show choices or end
  const processLandlordNode = (nodeId: string) => {
    const node = findNode(nodeId);
    clearTimers();
    setCurrentNodeId(nodeId);
    setDisabledIds(new Set());
    setShowChoices(false);

    const typingMs = Math.max(1000, Math.min((node.text?.length ?? 30) * 28, 2100));

    later(() => setShowTyping(true), 400);
    later(() => {
      setShowTyping(false);
      setChatHistory(h => [...h, {
        key:     `landlord-${nodeId}-${msgCount.current}`,
        speaker: 'landlord',
        text:    node.text ?? '',
        time:    nextTime(),
      }]);

      if (node.isEndNode) {
        later(() => {
          setOutcomeId(node.outcome ?? null);
          setPhase('outcome');
          later(() => setShowButton(true), 900);
        }, 1400);
      } else if (node.autoAdvance && node.nextNode) {
        // Landlord sends another message automatically — no user choice
        later(() => processLandlordNode(node.nextNode!), 1200);
      } else {
        later(() => {
          setShowChoices(true);
          setIsLocked(false);
        }, 600);
      }
    }, 400 + typingMs);
  };

  // Bootstrap: show choices immediately for user-speaker first node
  useEffect(() => {
    const first = exercise.nodes[0];
    if (first.speaker === 'user') {
      setShowChoices(true);
    } else {
      processLandlordNode(first.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoice = (choice: WhatsAppChoice) => {
    if (isLocked) return;
    setIsLocked(true);
    setShowChoices(false);
    clearTimers();

    // User's chosen message appears as a bubble
    setChatHistory(h => [...h, {
      key:     `user-${choice.id}`,
      speaker: 'user',
      text:    choice.text,
      time:    nextTime(),
    }]);

    onAnswer?.(choice.isCorrect);

    if (!choice.isCorrect) {
      const node = findNode(currentNodeId);
      const wrongText = node.wrongAnswerResponse ?? 'Prepáčte, nerozumiem.';

      later(() => setShowTyping(true), 400);
      later(() => {
        setShowTyping(false);
        setChatHistory(h => [...h, {
          key:     `error-${choice.id}`,
          speaker: 'error',
          text:    wrongText,
          time:    nextTime(),
        }]);
      }, 400 + 950);
      later(() => {
        setDisabledIds(prev => new Set([...prev, choice.id]));
        setShowChoices(true);
        setIsLocked(false);
      }, 400 + 950 + 550);
    } else {
      // Correct — navigate to next node
      later(() => {
        if (choice.nextNode) processLandlordNode(choice.nextNode);
      }, 550);
    }
  };

  // ── Questions phase ────────────────────────────────────────────────────────
  if (phase === 'questions') {
    const currentQ = exercise.questions[qIndex];
    const isLastQ  = qIndex === exercise.questions.length - 1;

    const handleChoiceSelect = (ch: string) => {
      if (revealed) return;
      const correct = ch === currentQ.answer;
      setSelected(ch);
      setRevealed(true);
      onAnswer?.(correct);
    };

    const handleNext = () => {
      if (isLastQ) { onDone(); return; }
      setQIndex(i => i + 1);
      setSelected(null);
      setRevealed(false);
    };

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-none flex justify-center gap-1.5 mb-4">
          {exercise.questions.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i <= qIndex ? 'bg-[#25D366]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex-none mb-4">
          <p className="text-base font-bold text-gray-800 leading-snug">
            {slovakifyNumbers(currentQ.question)}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5">
          {currentQ.choices.map((ch) => {
            const isSel  = selected === ch;
            const isCorr = ch === currentQ.answer;
            let cls = 'w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all cursor-pointer ';
            if (!revealed)       cls += 'bg-white border-gray-200 text-gray-800 hover:border-[#25D366] hover:bg-green-50';
            else if (isCorr)     cls += 'bg-green-100 border-[#25D366] text-green-800';
            else if (isSel)      cls += 'bg-red-50 border-red-400 text-red-700';
            else                 cls += 'bg-white border-gray-200 text-gray-400 opacity-60';

            return (
              <button key={ch} type="button" onClick={() => handleChoiceSelect(ch)} className={cls} disabled={revealed}>
                {slovakifyNumbers(ch)}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="flex-none pt-3">
            <div className={`rounded-2xl px-4 py-3 mb-3 ${selected === currentQ.answer ? 'bg-green-100' : 'bg-red-50'}`}>
              <p className={`text-xs font-bold mb-1 ${selected === currentQ.answer ? 'text-green-700' : 'text-red-600'}`}>
                {selected === currentQ.answer ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-xs text-gray-600 leading-snug">{slovakifyNumbers(currentQ.explanation)}</p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="w-full text-white font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all text-sm uppercase tracking-widest"
              style={{ backgroundColor: WA_GREEN }}
            >
              {isLastQ ? 'Continue' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Chat phase ─────────────────────────────────────────────────────────────
  const currentNode    = findNode(currentNodeId);
  const activeChoices  = (currentNode.choices ?? []).filter(c => !disabledIds.has(c.id));
  const showPrompt     = currentNode.speaker === 'user' && !!currentNode.prompt;

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden shadow-md border border-black/5">

      {/* WhatsApp header */}
      <div className="flex-none flex items-center gap-2.5 px-3 py-2" style={{ backgroundColor: WA_DARK }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          {exercise.contact.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-[13px] leading-tight truncate">{exercise.contact.name}</p>
          <p className="text-[10px] leading-tight" style={{ color: '#a8d5b5' }}>{exercise.contact.status}</p>
        </div>
        <span className="text-white/40 text-[11px] tracking-wide">WhatsApp</span>
      </div>

      {/* Context banner — compact single strip */}
      <div className="flex-none bg-[#FFF9E6] border-b border-amber-100 px-3 py-1.5 flex items-center gap-1.5">
        <span className="text-[11px] shrink-0">📋</span>
        <p className="text-[10px] text-amber-800 leading-snug line-clamp-2">{exercise.context}</p>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2"
        style={{ backgroundColor: WA_BG }}
      >
        <div className="flex flex-col gap-1">

          {chatHistory.map((entry) => {
            const isUser  = entry.speaker === 'user';
            const isError = entry.speaker === 'error';

            if (isError) {
              return (
                <div key={entry.key} className="flex justify-start animate-msg-in">
                  <div className="max-w-[78%] px-2.5 pt-1.5 pb-1 rounded-2xl rounded-tl-sm shadow-sm bg-orange-50 border border-orange-200">
                    <p className="text-xs leading-snug text-orange-800 break-words">
                      {slovakifyNumbers(entry.text)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-[10px] text-orange-400">{entry.time}</span>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={entry.key} className={`flex animate-msg-in ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`px-2.5 pt-1.5 pb-1 shadow-sm ${
                      isUser
                        ? 'rounded-2xl rounded-tr-sm'
                        : 'bg-white rounded-2xl rounded-tl-sm'
                    }`}
                    style={isUser ? { backgroundColor: WA_BUBBLE } : {}}
                  >
                    <p className="text-xs leading-snug text-gray-800 break-words">
                      {slovakifyNumbers(entry.text)}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">{entry.time}</span>
                      {isUser && <span className="text-[11px]" style={{ color: '#4FC3F7' }}>✓✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {showTyping && (
            <div className="flex justify-start animate-msg-in">
              <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm flex items-center gap-[5px]">
                {[0, 160, 320].map((delay) => (
                  <span
                    key={delay}
                    className="w-2 h-2 rounded-full animate-typing-dot"
                    style={{ backgroundColor: '#9E9E9E', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Outcome card */}
          {phase === 'outcome' && outcomeId && exercise.outcomes[outcomeId] && (
            <div className="animate-msg-in mt-2">
              <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-[#25D366]">
                <p className="text-sm font-extrabold text-green-700 mb-1">
                  {exercise.outcomes[outcomeId].title}
                </p>
                <p className="text-xs text-gray-600 leading-snug">
                  {exercise.outcomes[outcomeId].description}
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom section — choices OR "Answer Questions" */}
      {phase === 'chat' && showChoices && activeChoices.length > 0 && (
        <div className="flex-none bg-white border-t border-gray-100 px-2.5 py-2">
          {showPrompt && (
            <p className="text-[10px] text-gray-400 italic mb-1.5 px-0.5">{currentNode.prompt}</p>
          )}
          <div className="space-y-1.5">
            {activeChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice)}
                disabled={isLocked}
                className="w-full text-left px-3 py-2 rounded-xl border-2 border-gray-200 bg-white text-xs text-gray-800 font-medium hover:border-[#25D366] hover:bg-green-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-default leading-snug"
              >
                {slovakifyNumbers(choice.text)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "Answer Questions" slides up after outcome */}
      <div
        className="flex-none bg-white border-t border-gray-100 px-4 py-3 transition-all duration-500"
        style={{
          opacity:       showButton ? 1 : 0,
          transform:     showButton ? 'translateY(0)' : 'translateY(14px)',
          pointerEvents: showButton ? 'auto' : 'none',
          display:       phase === 'outcome' ? 'block' : 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setPhase('questions')}
          className="w-full text-white font-bold py-3 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          style={{ backgroundColor: WA_GREEN }}
        >
          Answer Questions →
        </button>
      </div>

    </div>
  );
}
