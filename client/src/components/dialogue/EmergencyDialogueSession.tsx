import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  Dialogue,
  DialogueNode,
  DialogueChoice,
  DialogueOutcome,
  EmergencyScenario,
  EmergencyWrongNumber,
} from '../../types/dialogue';
import { DialogueOutcomeScreen } from './DialogueOutcomeScreen';
import { useProgressStore } from '../../store/useProgressStore';

function pickScenario(scenarios: EmergencyScenario[], tried: string[]): EmergencyScenario {
  const untried = scenarios.filter((s) => !tried.includes(s.id));
  const pool = untried.length > 0 ? untried : scenarios;
  return pool[Math.floor(Math.random() * pool.length)];
}

const EMERGENCY_NUMBERS = [
  { number: '112', label: 'Integrated Emergency', emoji: '🆘' },
  { number: '155', label: 'Ambulance', emoji: '🚑' },
  { number: '158', label: 'Police', emoji: '👮' },
  { number: '150', label: 'Fire Brigade', emoji: '🚒' },
  { number: '156', label: 'City Police', emoji: '🏙️' },
];

type Step = 'number-pick' | 'wrong-number' | 'call' | 'ending' | 'done';
type MessageFrom = 'dispatcher' | 'user' | 'retry';

interface Message {
  id: string;
  from: MessageFrom;
  text: string;
  translation?: string;
}

interface Props {
  dialogue: Dialogue;
  onExit: () => void;
}

const BASE_XP = 5;
const REPLY_DELAY = 1200;

export function EmergencyDialogueSession({ dialogue, onExit }: Props) {
  const addXP = useProgressStore((s) => s.addXP);
  const triedEmergencyScenarios = useProgressStore((s) => s.triedEmergencyScenarios);
  const markEmergencyScenarioTried = useProgressStore((s) => s.markEmergencyScenarioTried);

  // Stable on mount — intentionally not re-derived when store updates mid-session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialScenario = useMemo(() => pickScenario(dialogue.scenarios ?? [], triedEmergencyScenarios), []);

  const [step, setStep] = useState<Step>('number-pick');
  const [selectedScenario, setSelectedScenario] = useState<EmergencyScenario>(initialScenario);
  const [wrongNumberData, setWrongNumberData] = useState<{ number: string; info: EmergencyWrongNumber } | null>(null);
  const [callNodeId, setCallNodeId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<'choosing' | 'feedback' | 'auto-advancing' | 'ending'>('choosing');
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

  const waitForSpeech = useCallback((onDone: () => void): (() => void) => {
    let cancelled = false;
    const GAP = 450;
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

  const getCallNodes = useCallback((scenario: EmergencyScenario): DialogueNode[] => {
    const key = `${scenario.id.replace('scenario-', '')}-${scenario.correctNumber}`;
    return dialogue.callNodes?.[key] ?? [];
  }, [dialogue]);

  const getCurrentNode = useCallback((): DialogueNode | null => {
    if (!callNodeId) return null;
    return getCallNodes(selectedScenario).find((n) => n.id === callNodeId) ?? null;
  }, [callNodeId, selectedScenario, getCallNodes]);

  const advanceTo = useCallback((nodeId: string, scenario: EmergencyScenario) => {
    const node = getCallNodes(scenario).find((n) => n.id === nodeId);
    if (!node) return;
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, from: 'dispatcher', text: node.text, translation: node.translation },
    ]);
    setCallNodeId(nodeId);
    setSelectedId(null);
    setFeedback(null);
    setEliminatedIds(new Set());

    if (node.isEndNode) {
      const outcomeData = dialogue.outcomes[node.outcome!];
      const xp = BASE_XP + outcomeData.xpBonus;
      setSessionXp(xp);
      addXP(xp);
      setOutcome(outcomeData);
      markEmergencyScenarioTried(scenario.id);
      setPhase('ending');
    } else if (node.autoAdvance) {
      setPhase('auto-advancing');
    } else {
      setPhase('choosing');
    }
  }, [getCallNodes, dialogue, addXP, markEmergencyScenarioTried]);

  useEffect(() => {
    if (step !== 'call' || phase !== 'auto-advancing') return;
    const node = getCurrentNode();
    if (!node?.nextNode) return;
    const scenario = selectedScenario;
    return waitForSpeech(() => advanceTo(node.nextNode!, scenario));
  }, [step, phase, getCurrentNode, selectedScenario, advanceTo, waitForSpeech]);

  useEffect(() => {
    if (step !== 'call' || phase !== 'ending') return;
    return waitForSpeech(() => setStep('done'));
  }, [step, phase, waitForSpeech]);

  const startCall = useCallback((scenario: EmergencyScenario) => {
    const nodes = getCallNodes(scenario);
    if (nodes.length === 0) return;
    const first = nodes[0];
    setMessages([{ id: 'msg-init', from: 'dispatcher', text: first.text, translation: first.translation }]);
    setCallNodeId(first.id);
    setPhase(first.autoAdvance ? 'auto-advancing' : 'choosing');
    setSelectedId(null);
    setFeedback(null);
    setEliminatedIds(new Set());
    setStep('call');
  }, [getCallNodes]);

  const handleNumberPick = (number: string) => {
    if (number === selectedScenario.correctNumber) {
      startCall(selectedScenario);
    } else {
      const info = selectedScenario.wrongNumbers[number];
      setWrongNumberData({ number, info });
      setStep('wrong-number');
    }
  };

  const handleChoice = (choice: DialogueChoice) => {
    if (phase !== 'choosing') return;
    setSelectedId(choice.id);
    setPhase('feedback');

    if (choice.isCorrect) {
      setFeedback('correct');
      setUsedVocab((prev) => [...new Set([...prev, ...choice.usesVocab])]);
      setMessages((prev) => [...prev, { id: `user-${Date.now()}`, from: 'user', text: choice.text }]);
      const scenario = selectedScenario;
      setTimeout(() => { advanceTo(choice.nextNode ?? callNodeId!, scenario); }, REPLY_DELAY);
    } else {
      setFeedback('wrong');
      const node = getCurrentNode();
      const retryText = node?.wrongAnswerResponse ?? 'Nerozumiem. Môžete zopakovať?';
      const retryTranslation = node?.wrongAnswerTranslation ?? "I don't understand. Can you repeat?";
      setMessages((prev) => [...prev, { id: `user-wrong-${Date.now()}`, from: 'user', text: choice.text }]);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `retry-${Date.now()}`, from: 'retry', text: retryText, translation: retryTranslation },
        ]);
        setEliminatedIds((prev) => new Set([...prev, choice.id]));
        setSelectedId(null);
        setFeedback(null);
        setPhase('choosing');
      }, REPLY_DELAY);
    }
  };

  const handleRestart = () => {
    const next = pickScenario(dialogue.scenarios ?? [], triedEmergencyScenarios);
    setStep('number-pick');
    setSelectedScenario(next);
    setWrongNumberData(null);
    setCallNodeId(null);
    setMessages([]);
    setPhase('choosing');
    setSelectedId(null);
    setFeedback(null);
    setEliminatedIds(new Set());
    setUsedVocab([]);
    setSessionXp(0);
    setOutcome(null);
    speechSynthesis.cancel();
  };

  const currentNode = getCurrentNode();
  const visibleChoices = currentNode?.choices?.filter((c) => !eliminatedIds.has(c.id)) ?? [];

  // ── NUMBER PICK ──────────────────────────────────────────────
  if (step === 'number-pick') {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onExit} className="text-gray-500 hover:text-gray-800 text-xl cursor-pointer transition-colors">←</button>
          <h1 className="flex-1 text-base font-bold text-gray-800 text-center">Which number?</h1>
        </div>
        <div className="flex-1 px-4 py-6 pb-10">
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 mb-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-800 leading-snug">{selectedScenario.situation}</p>
            <p className="text-xs text-gray-400 mt-1 leading-snug">{selectedScenario.situationTranslation}</p>
          </div>
          <p className="text-xs text-gray-400 text-center mb-4 uppercase tracking-widest font-semibold">📞 Who do you call?</p>
          <div className="flex flex-col gap-3">
            {EMERGENCY_NUMBERS.map(({ number, label, emoji }) => (
              <button
                key={number}
                type="button"
                onClick={() => handleNumberPick(number)}
                className="flex items-center gap-4 bg-white rounded-2xl border-2 border-gray-200 px-5 py-4 shadow-sm hover:border-red-400 hover:bg-red-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="text-3xl">{emoji}</span>
                <div className="text-left">
                  <div className="text-2xl font-black text-gray-800">{number}</div>
                  <div className="text-xs text-gray-400 font-medium">{label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── WRONG NUMBER ─────────────────────────────────────────────
  if (step === 'wrong-number' && wrongNumberData) {
    const { number, info } = wrongNumberData;
    const numInfo = EMERGENCY_NUMBERS.find((n) => n.number === number);
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setStep('number-pick')} className="text-gray-500 hover:text-gray-800 text-xl cursor-pointer transition-colors">←</button>
          <h1 className="flex-1 text-base font-bold text-red-600 text-center">Wrong number</h1>
        </div>
        <div className="flex-1 px-4 py-6 space-y-4 pb-10">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{numInfo?.emoji}</span>
              <div>
                <div className="text-xl font-black text-red-700">{number}</div>
                <div className="text-xs text-red-400 font-medium">{numInfo?.label}</div>
              </div>
              <span className="ml-auto text-2xl">❌</span>
            </div>
            <div className="bg-white rounded-xl p-4 mb-3 shadow-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">They answer:</p>
              <p className="text-sm font-semibold text-gray-800">{info.response}</p>
              <p className="text-xs text-gray-400 mt-0.5 italic">{info.responseTranslation}</p>
            </div>
            {info.redirect && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3">
                <p className="text-xs text-green-600 uppercase tracking-wide font-semibold mb-1">You say:</p>
                <p className="text-sm font-semibold text-gray-800">{info.redirect}</p>
                <p className="text-xs text-gray-400 mt-0.5 italic">{info.redirectTranslation}</p>
              </div>
            )}
            {info.note && (
              <p className="text-xs text-red-400 italic">{info.note}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStep('number-pick')}
            className="w-full py-4 rounded-2xl bg-brand-green text-white font-bold text-sm uppercase tracking-wide cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Try Again →
          </button>
        </div>
      </div>
    );
  }

  // ── OUTCOME ──────────────────────────────────────────────────
  if (step === 'done' && outcome) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={onExit} className="text-gray-500 hover:text-gray-800 text-xl cursor-pointer transition-colors">←</button>
          <h1 className="flex-1 text-base font-bold text-gray-800 text-center">{dialogue.topic}</h1>
          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full text-xs">
            <span>⚡</span><span>{sessionXp} XP</span>
          </div>
        </div>
        <DialogueOutcomeScreen
          outcome={outcome}
          xpEarned={sessionXp}
          vocabUsed={usedVocab}
          onTryOtherPath={handleRestart}
          onBack={onExit}
        />
      </div>
    );
  }

  // ── CALL CONVERSATION ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={onExit} className="text-gray-500 hover:text-gray-800 text-xl cursor-pointer transition-colors">←</button>
        <h1 className="flex-1 text-base font-bold text-gray-800 text-center">{dialogue.topic}</h1>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full text-xs">
            <span>⚡</span><span>{sessionXp} XP</span>
          </div>
          <button
            type="button"
            onClick={() => { setTtsEnabled((v) => !v); speechSynthesis.cancel(); }}
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="flex justify-center">
          <span className="text-xs text-gray-400 bg-white border border-gray-200 px-3 py-1 rounded-full">
            {dialogue.character.avatar} {dialogue.character.name}
          </span>
        </div>
        {selectedScenario && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 leading-snug text-center">
            {selectedScenario.situation}
          </div>
        )}
        {messages.map((msg) => {
          if (msg.from === 'user') {
            const isWrong = feedback === 'wrong' && selectedId !== null && msg.id.startsWith('user-wrong');
            return (
              <div key={msg.id} className="flex justify-end">
                <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug rounded-tr-sm
                  ${isWrong ? 'bg-red-100 text-red-800' : 'bg-brand-green text-white'}`}>
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
                onClick={() => { const u = new SpeechSynthesisUtterance(msg.text); u.lang = 'sk-SK'; speechSynthesis.cancel(); speechSynthesis.speak(u); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { const u = new SpeechSynthesisUtterance(msg.text); u.lang = 'sk-SK'; speechSynthesis.cancel(); speechSynthesis.speak(u); } }}
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

      {phase !== 'auto-advancing' && phase !== 'ending' && visibleChoices.length > 0 && (
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
    </div>
  );
}
