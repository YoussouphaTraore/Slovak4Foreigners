import { useState, useEffect, useRef } from 'react';
import type { ForeignerSmsExercise } from '../../types/foreignerExclusive';
import { slovakifyNumbers } from '../../utils/numberToSlovak';

interface Props {
  exercise: ForeignerSmsExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

type Phase = 'chat' | 'questions';

const WA_DARK   = '#075E54';
const WA_GREEN  = '#25D366';
const WA_BG     = '#E5DDD5';
const WA_BUBBLE = '#DCF8C6';

function fakeTime(index: number): string {
  const base = 14 * 60 + 32;
  const t = base + index * 2;
  return `${Math.floor(t / 60) % 24}:${String(t % 60).padStart(2, '0')}`;
}

function resolveContactName(sender: string): string {
  if (sender === 'landlord') return 'Pán Novák';
  return sender.charAt(0).toUpperCase() + sender.slice(1);
}

export function ForeignerSmsDialogue({ exercise, onDone, onAnswer }: Props) {
  const [phase, setPhase]             = useState<Phase>('chat');
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping]   = useState(false);
  const [showButton, setShowButton]   = useState(false);
  const [qIndex, setQIndex]           = useState(0);
  const [selected, setSelected]       = useState<string | null>(null);
  const [revealed, setRevealed]       = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const msgs    = exercise.messages;

  const contactSender = msgs.find(m => m.sender !== 'you')?.sender ?? 'Contact';
  const contactName   = resolveContactName(contactSender);

  // Auto-scroll to bottom whenever a new message or typing indicator appears
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [visibleCount, showTyping]);

  // Pre-compute and schedule the full animation timeline on mount
  useEffect(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, ms: number) => ids.push(setTimeout(fn, ms));

    let t = 0;

    for (let i = 0; i < msgs.length; i++) {
      const msg  = msgs[i];
      const prev = i > 0 ? msgs[i - 1] : null;
      const isUser = msg.sender === 'you';

      if (isUser) {
        t += i === 0 ? 800 : prev?.sender !== 'you' ? 1000 : 650;
        const count = i + 1;
        at(() => setVisibleCount(count), t);
      } else {
        // Brief pause → typing indicator → message
        t += prev?.sender === 'you' ? 480 : 350;
        at(() => setShowTyping(true), t);

        const typingMs = Math.max(1100, Math.min(msg.text.length * 32, 2200));
        t += typingMs;
        const count = i + 1;
        at(() => { setShowTyping(false); setVisibleCount(count); }, t);
      }
    }

    t += 900;
    at(() => setShowButton(true), t);

    return () => ids.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Questions phase ────────────────────────────────────────────────────────
  if (phase === 'questions') {
    const currentQ = exercise.questions[qIndex];
    const isLastQ  = qIndex === exercise.questions.length - 1;

    const handleChoiceSelect = (choice: string) => {
      if (revealed) return;
      const correct = choice === currentQ.answer;
      setSelected(choice);
      setRevealed(true);
      onAnswer?.(correct);
    };

    const handleNext = () => {
      if (isLastQ) {
        onDone();
      } else {
        setQIndex(i => i + 1);
        setSelected(null);
        setRevealed(false);
      }
    };

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Progress dots */}
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
          {currentQ.choices.map((choice) => {
            const isSelected = selected === choice;
            const isCorrect  = choice === currentQ.answer;
            let cls = 'w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all cursor-pointer ';
            if (!revealed) {
              cls += 'bg-white border-gray-200 text-gray-800 hover:border-[#25D366] hover:bg-green-50';
            } else if (isCorrect) {
              cls += 'bg-green-100 border-[#25D366] text-green-800';
            } else if (isSelected) {
              cls += 'bg-red-50 border-red-400 text-red-700';
            } else {
              cls += 'bg-white border-gray-200 text-gray-400 opacity-60';
            }
            return (
              <button
                key={choice}
                type="button"
                onClick={() => handleChoiceSelect(choice)}
                className={cls}
                disabled={revealed}
              >
                {slovakifyNumbers(choice)}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="flex-none pt-3">
            <div className={`rounded-2xl px-4 py-3 mb-3 ${
              selected === currentQ.answer ? 'bg-green-100' : 'bg-red-50'
            }`}>
              <p className={`text-xs font-bold mb-1 ${
                selected === currentQ.answer ? 'text-green-700' : 'text-red-600'
              }`}>
                {selected === currentQ.answer ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p className="text-xs text-gray-600 leading-snug">
                {slovakifyNumbers(currentQ.explanation)}
              </p>
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
  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden shadow-md border border-black/5">

      {/* Header */}
      <div
        className="flex-none flex items-center gap-3 px-4 py-2.5"
        style={{ backgroundColor: WA_DARK }}
      >
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          PN
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">
            {contactName} 🏠
          </p>
          <p className="text-[11px] leading-tight" style={{ color: '#a8d5b5' }}>
            online
          </p>
        </div>

        <span className="text-white/40 text-xs tracking-wide">WhatsApp</span>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3"
        style={{ backgroundColor: WA_BG }}
      >
        <div className="flex flex-col gap-1">
          {msgs.slice(0, visibleCount).map((msg, i) => {
            const isUser   = msg.sender === 'you';
            const prev     = i > 0 ? msgs[i - 1] : null;
            const showLabel = !isUser && prev?.sender === 'you';

            return (
              <div
                key={i}
                className={`flex animate-msg-in ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {showLabel && (
                    <span
                      className="text-[10px] font-bold ml-2.5 mb-0.5"
                      style={{ color: WA_DARK }}
                    >
                      {contactName}
                    </span>
                  )}

                  <div
                    className={`relative px-3 pt-2 pb-1.5 shadow-sm ${
                      isUser
                        ? 'rounded-2xl rounded-tr-sm'
                        : 'rounded-2xl rounded-tl-sm bg-white'
                    }`}
                    style={isUser ? { backgroundColor: WA_BUBBLE } : {}}
                  >
                    <p className="text-sm leading-snug text-gray-800 break-words">
                      {slovakifyNumbers(msg.text)}
                    </p>

                    {/* Timestamp + read receipt */}
                    <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">{fakeTime(i)}</span>
                      {isUser && (
                        <span className="text-[11px]" style={{ color: '#4FC3F7' }}>✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {showTyping && (
            <div className="flex justify-start animate-msg-in">
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm flex items-center gap-[5px]">
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
        </div>
      </div>

      {/* "Answer Questions" button — slides in after all messages */}
      <div
        className="flex-none bg-white border-t border-gray-100 px-4 py-3 transition-all duration-500"
        style={{
          opacity:        showButton ? 1 : 0,
          transform:      showButton ? 'translateY(0)' : 'translateY(14px)',
          pointerEvents:  showButton ? 'auto' : 'none',
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
