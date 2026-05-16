import { useState, useEffect, useRef, useCallback } from 'react';
import type { Dialogue, DialogueNode, DialogueChoice, DialogueOutcome } from '../../types/dialogue';
import { DialogueOutcomeScreen } from './DialogueOutcomeScreen';
import { useProgressStore } from '../../store/useProgressStore';

type MessageFrom = 'barista' | 'user' | 'retry';

interface Message {
  id: string;
  from: MessageFrom;
  text: string;
  translation?: string;
}

type Phase = 'choosing' | 'feedback' | 'auto-advancing' | 'ending' | 'done';

interface Props {
  dialogue: Dialogue;
  onExit: () => void;
}

const BASE_XP = 5;
const REPLY_DELAY = 1200;

export function DialogueSession({ dialogue, onExit }: Props) {
  const addXP = useProgressStore((s) => s.addXP);

  const getNode = useCallback(
    (id: string): DialogueNode => dialogue.nodes.find((n) => n.id === id)!,
    [dialogue]
  );

  const firstNode = getNode('node-1');

  const [messages, setMessages] = useState<Message[]>([
    { id: 'msg-init', from: 'barista', text: firstNode.text, translation: firstNode.translation },
  ]);
  const [currentNodeId, setCurrentNodeId] = useState('node-1');
  const [phase, setPhase] = useState<Phase>(firstNode.autoAdvance ? 'auto-advancing' : 'choosing');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
  const [usedVocab, setUsedVocab] = useState<string[]>([]);
  const [sessionXp, setSessionXp] = useState(0);
  const [outcome, setOutcome] = useState<DialogueOutcome | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!ttsEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.from === 'user') return;
    const utterance = new SpeechSynthesisUtterance(last.text);
    utterance.lang = 'sk-SK';
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }, [messages, ttsEnabled]);

  const advanceTo = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId);
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}`, from: 'barista', text: node.text, translation: node.translation },
      ]);
      setCurrentNodeId(nodeId);
      setSelectedId(null);
      setFeedback(null);
      setEliminatedIds(new Set());

      if (node.isEndNode) {
        const outcomeData = dialogue.outcomes[node.outcome!];
        const xp = BASE_XP + outcomeData.xpBonus;
        setSessionXp(xp);
        addXP(xp);
        setOutcome(outcomeData);
        setPhase('ending');
      } else if (node.autoAdvance) {
        setPhase('auto-advancing');
      } else {
        setPhase('choosing');
      }
    },
    [dialogue, getNode, addXP]
  );

  // Poll speechSynthesis.speaking — resolves cleanly once voice is done
  const waitForSpeech = useCallback((onDone: () => void): (() => void) => {
    let cancelled = false;
    const GAP = 450;
    // Give the browser ~200 ms to start the utterance before we begin polling
    const init = setTimeout(() => {
      const poll = () => {
        if (cancelled) return;
        if (speechSynthesis.speaking) {
          setTimeout(poll, 150);
        } else {
          setTimeout(() => { if (!cancelled) onDone(); }, GAP);
        }
      };
      poll();
    }, 200);
    return () => { cancelled = true; clearTimeout(init); };
  }, []);

  // Handle autoAdvance nodes — nothing happens while voice is active
  useEffect(() => {
    if (phase !== 'auto-advancing') return;
    const node = getNode(currentNodeId);
    if (!node.nextNode) return;
    return waitForSpeech(() => advanceTo(node.nextNode!));
  }, [phase, currentNodeId, getNode, advanceTo, waitForSpeech]);

  // Wait for final barista message + TTS before showing outcome
  useEffect(() => {
    if (phase !== 'ending') return;
    return waitForSpeech(() => setPhase('done'));
  }, [phase, waitForSpeech]);

  const handleChoice = (choice: DialogueChoice) => {
    if (phase !== 'choosing') return;
    setSelectedId(choice.id);
    setPhase('feedback');

    if (choice.isCorrect) {
      setFeedback('correct');
      setUsedVocab((prev) => [...new Set([...prev, ...choice.usesVocab])]);
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, from: 'user', text: choice.text },
      ]);
      setTimeout(() => {
        advanceTo(choice.nextNode ?? currentNodeId);
      }, REPLY_DELAY);
    } else {
      setFeedback('wrong');
      const node = getNode(currentNodeId);
      const retryText = node.wrongAnswerResponse ?? dialogue.character.wrongAnswerResponse ?? 'Nerozumiem. Môžete zopakovať?';
      const retryTranslation = node.wrongAnswerTranslation ?? dialogue.character.wrongAnswerTranslation ?? "I don't understand. Can you repeat?";
      setMessages((prev) => [
        ...prev,
        { id: `user-wrong-${Date.now()}`, from: 'user', text: choice.text },
      ]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `retry-${Date.now()}`,
            from: 'retry',
            text: retryText,
            translation: retryTranslation,
          },
        ]);
        setEliminatedIds((prev) => new Set([...prev, choice.id]));
        setSelectedId(null);
        setFeedback(null);
        setPhase('choosing');
      }, REPLY_DELAY);
    }
  };

  const handleRestart = () => {
    const node = getNode('node-1');
    setMessages([{ id: `msg-restart-${Date.now()}`, from: 'barista', text: node.text, translation: node.translation }]);
    setCurrentNodeId('node-1');
    setPhase(node.autoAdvance ? 'auto-advancing' : 'choosing');
    setSelectedId(null);
    setFeedback(null);
    setEliminatedIds(new Set());
    setUsedVocab([]);
    setSessionXp(0);
    setOutcome(null);
  };

  const currentNode = getNode(currentNodeId);
  const visibleChoices = currentNode.choices?.filter((c) => !eliminatedIds.has(c.id)) ?? [];

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="text-gray-500 hover:text-gray-800 text-xl cursor-pointer transition-colors"
        >
          ←
        </button>
        <h1 className="flex-1 text-base font-bold text-gray-800 text-center">{dialogue.topic}</h1>
        <div className="flex items-center gap-1 bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full text-xs">
          <span>⚡</span>
          <span>{sessionXp} XP</span>
        </div>
      </div>

      {phase === 'done' && outcome ? (
        <DialogueOutcomeScreen
          outcome={outcome}
          xpEarned={sessionXp}
          vocabUsed={usedVocab}
          onTryOtherPath={handleRestart}
          onBack={onExit}
        />
      ) : (
        <>
          {/* Conversation area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Character intro chip + TTS toggle */}
            <div className="flex justify-center items-center gap-2">
              <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
                {dialogue.character.avatar} {dialogue.character.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTtsEnabled((v) => !v);
                  speechSynthesis.cancel();
                }}
                title={ttsEnabled ? 'Mute voice' : 'Enable voice'}
                className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm transition-colors cursor-pointer
                  ${ttsEnabled
                    ? 'bg-white border-gray-200 text-gray-500 hover:border-brand-green hover:text-brand-green'
                    : 'bg-gray-100 border-gray-200 text-gray-300'
                  }`}
              >
                {ttsEnabled ? '🔊' : '🔇'}
              </button>
            </div>

            {messages.map((msg) => {
              if (msg.from === 'user') {
                const isWrong = feedback === 'wrong' && selectedId !== null && msg.id.startsWith('user-wrong');
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div
                      className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug rounded-tr-sm
                        ${isWrong
                          ? 'bg-red-100 text-red-800'
                          : 'bg-brand-green text-white'
                        }`}
                    >
                      {isWrong && <span className="mr-1 text-red-500">✗</span>}
                      <span className="font-medium">{msg.text}</span>
                    </div>
                  </div>
                );
              }

              const isRetry = msg.from === 'retry';
              return (
                <div key={msg.id} className="flex items-end gap-2">
                  <span className="text-xl shrink-0 mb-0.5">{dialogue.character.avatar}</span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const u = new SpeechSynthesisUtterance(msg.text);
                      u.lang = 'sk-SK';
                      speechSynthesis.cancel();
                      speechSynthesis.speak(u);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        const u = new SpeechSynthesisUtterance(msg.text);
                        u.lang = 'sk-SK';
                        speechSynthesis.cancel();
                        speechSynthesis.speak(u);
                      }
                    }}
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug rounded-tl-sm cursor-pointer active:opacity-70
                      ${isRetry ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-800'}`}
                  >
                    <span className="font-medium">{msg.text}</span>
                    {msg.translation && (
                      <span className={`block text-xs mt-0.5 font-normal ${isRetry ? 'text-orange-500' : 'text-gray-400'}`}>
                        {msg.translation}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </div>

          {/* Choice buttons */}
          {phase !== 'auto-advancing' && visibleChoices.length > 0 && (
            <div className="flex-none px-4 py-4 space-y-2">
              <p className="text-xs text-gray-400 text-center mb-1">Choose your reply</p>
              {visibleChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  disabled={phase === 'feedback'}
                  onClick={() => handleChoice(choice)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer active:scale-[0.98] break-words
                    ${phase === 'feedback'
                      ? 'bg-gray-50 border-gray-200 text-gray-400'
                      : 'bg-white border-gray-200 text-gray-800 hover:border-brand-green hover:bg-green-50'
                    }`}
                >
                  <span>{choice.text}</span>
                  {choice.translation && (
                    <span className="block text-xs text-gray-400 font-normal mt-0.5">{choice.translation}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
