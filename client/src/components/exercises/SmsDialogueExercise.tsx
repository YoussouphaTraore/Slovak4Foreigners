import { useState, useRef, useEffect } from 'react';
import type { SmsDialogueExercise as TExercise, SmsDialogueChoice } from '../../types/lesson';
import { cleanForSpeech } from '../../utils/speak';
import { slovakifyNumbers } from '../../utils/numberToSlovak';

interface Props {
  exercise: TExercise;
  onDone: () => void;
  onAnswer?: (correct: boolean) => void;
}

interface ChatMessage {
  from: 'snail' | 'user';
  text: string;
  english?: string;
  isWrong?: boolean;
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
  u.lang = 'sk-SK';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function shuffleTurnChoices(turns: TExercise['turns']) {
  return turns.map((t) => [...t.choices].sort(() => Math.random() - 0.5));
}

export function SmsDialogueExercise({ exercise, onDone, onAnswer }: Props) {
  const shuffled = useRef(shuffleTurnChoices(exercise.turns));

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const first = exercise.turns[0];
    if (first.snailMessage) {
      return [{ from: 'snail', text: first.snailMessage, english: first.snailMessageEnglish }];
    }
    return [];
  });

  // Speak the opening snail message on mount if autoSpeak is on
  useEffect(() => {
    const first = exercise.turns[0];
    if (exercise.autoSpeak && first.snailMessage) {
      speak(first.snailMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tracks the snail's current open question so wrong answers can repeat it
  const [currentQuestion, setCurrentQuestion] = useState<{ text: string; english?: string }>(() => ({
    text: exercise.turns[0].snailMessage ?? '',
    english: exercise.turns[0].snailMessageEnglish,
  }));

  const [currentTurn, setCurrentTurn] = useState(0);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleWrong(choice: SmsDialogueChoice) {
    setAwaitingReply(true);
    onAnswer?.(false);

    setMessages((m) => [...m, { from: 'user', text: choice.slovak, english: choice.english, isWrong: true }]);

    setTimeout(() => {
      if (exercise.autoSpeak) speak('Hmm... nerozumiem.');
      setMessages((m) => [
        ...m,
        { from: 'snail', text: 'Hmm... nerozumiem.', english: "Hmm... I don't understand." },
      ]);

      setTimeout(() => {
        if (exercise.autoSpeak) speak(currentQuestion.text);
        setMessages((m) => [
          ...m,
          { from: 'snail', text: currentQuestion.text, english: currentQuestion.english },
        ]);
        setAwaitingReply(false);
      }, 1400);
    }, 1400);
  }

  function handleCorrect(choice: SmsDialogueChoice) {
    setAwaitingReply(true);
    onAnswer?.(true);
    const turn = exercise.turns[currentTurn];

    setMessages((m) => [...m, { from: 'user', text: choice.slovak, english: choice.english }]);

    setTimeout(() => {
      if (exercise.autoSpeak) speak(turn.snailReply);
      setMessages((m) => [
        ...m,
        { from: 'snail', text: turn.snailReply, english: turn.snailReplyEnglish },
      ]);

      const next = currentTurn + 1;
      setTimeout(() => {
        if (next >= exercise.turns.length) {
          setDone(true);
          setAwaitingReply(false);
        } else {
          setCurrentQuestion({ text: turn.snailReply, english: turn.snailReplyEnglish });
          setCurrentTurn(next);
          setAwaitingReply(false);
        }
      }, 500);
    }, 1400);
  }

  function handleChoice(choice: SmsDialogueChoice) {
    if (awaitingReply) return;
    if (choice.isCorrect) {
      handleCorrect(choice);
    } else {
      handleWrong(choice);
    }
  }

  const turnChoices = shuffled.current[currentTurn];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {exercise.scenario && (
        <p className="text-xs text-center text-gray-400 italic px-4 pt-2 pb-1 flex-none">
          {exercise.scenario}
        </p>
      )}

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.from === 'snail' && (
              <img src="/snail.png" alt="" className="w-7 h-7 object-contain shrink-0 mb-0.5" />
            )}
            <button
              type="button"
              onClick={() => msg.from === 'snail' && speak(msg.text)}
              className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-snug text-left break-words
                ${msg.from === 'snail'
                  ? 'bg-gray-100 text-gray-800 rounded-bl-sm hover:bg-gray-200 cursor-pointer'
                  : msg.isWrong
                  ? 'bg-red-100 text-red-800 rounded-br-sm cursor-default'
                  : 'bg-brand-green text-white rounded-br-sm cursor-default'
                }`}
            >
              {msg.isWrong && <span className="mr-1 text-red-500">✗</span>}
              <span className="font-medium">{slovakifyNumbers(msg.text)}</span>
              {msg.english && (
                <span
                  className={`block text-xs mt-0.5 font-normal ${
                    msg.from === 'snail' ? 'text-gray-400' : msg.isWrong ? 'text-red-400' : 'text-green-100'
                  }`}
                >
                  {msg.english}
                </span>
              )}
            </button>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply choices or Continue */}
      <div className="flex-none border-t border-gray-100 px-4 py-4 space-y-2">
        {done ? (
          <button
            type="button"
            onClick={onDone}
            className="w-full py-3.5 rounded-xl bg-brand-green text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md"
          >
            Continue
          </button>
        ) : (
          <>
            <p className="text-xs text-gray-400 text-center mb-1">Choose your reply</p>
            {turnChoices.map((choice, idx) => (
              <button
                key={idx}
                type="button"
                disabled={awaitingReply}
                onClick={() => handleChoice(choice)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer active:scale-[0.98] break-words
                  ${awaitingReply
                    ? 'bg-gray-50 border-gray-200 text-gray-400'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-brand-green hover:bg-green-50'
                  }`}
              >
                <span>{slovakifyNumbers(choice.slovak)}</span>
                {choice.english && (
                  <span className="block text-xs text-gray-400 font-normal mt-0.5">{choice.english}</span>
                )}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
