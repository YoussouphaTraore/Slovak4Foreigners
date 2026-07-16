import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConversationSpeakingExercise as TExercise, SpeakingQuestion, SpeakingChoice, YesNoAnswer } from '../../types/conversationSpeaking';
import type { SentenceBuilderItem } from '../../types/conversationSentenceBuilder';
import { supabase } from '../../lib/supabase/client';
import { SentenceBuildSlide } from './ConversationSentenceBuilderExercise';
import { useAuthStore } from '../../store/useAuthStore';
import { DemographicsPickerModal } from '../DemographicsPickerModal';
import { applyDemographicsToStore, saveLocalDemographics } from '../../lib/demographics';
import type { Country } from '../../data/countries';

// Session-level flag — persists until page refresh, shared across all CONVERSATION_SPEAKING exercises
let sessionForcedTyping = false;

type Mode = 'speak' | 'type';
type SpeakStatus = 'idle' | 'recording' | 'transcribing' | 'correct' | 'wrong' | 'error' | 'effort_pass';

interface TokenMap {
  displayName: string;
  countrySkGenitive: string;
  countryEn: string;
  happyGender: string;
}

interface ActiveAnswer {
  sk: string;
  en: string;
  chunks: string[];
  choice?: 'yes' | 'no';
}

interface Props {
  exercise: TExercise;
  onDone: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
}

interface MatchResult {
  correct: boolean;
  wordScore: number;
  charScore: number;
  matchedWords: boolean[];
}

interface TranscriptionResponse {
  transcript?: string;
  text?: string;
}

const MAX_RECORDING_MS = 8_000;
const MIN_RECORDING_MS = 900;
const SILENCE_MS = 1_600;
const SILENCE_THRESHOLD = 0.018;
const PASS_THRESHOLD = 0.7;
const EFFORT_PASS_ATTEMPTS = 5;
const INITIAL_BARS = Array.from({ length: 18 }, () => 0.12);

const DIACRITIC_MAP: Record<string, string> = {
  'č': 'c', 'Č': 'c',
  'š': 's', 'Š': 's',
  'ž': 'z', 'Ž': 'z',
  'á': 'a', 'Á': 'a',
  'é': 'e', 'É': 'e',
  'í': 'i', 'Í': 'i',
  'ó': 'o', 'Ó': 'o',
  'ú': 'u', 'Ú': 'u',
  'ý': 'y', 'Ý': 'y',
  'ä': 'a', 'Ä': 'a',
  'ô': 'o', 'Ô': 'o',
  'ľ': 'l', 'Ľ': 'l',
  'ĺ': 'l', 'Ĺ': 'l',
  'ŕ': 'r', 'Ŕ': 'r',
  'ť': 't', 'Ť': 't',
  'ď': 'd', 'Ď': 'd',
  'ň': 'n', 'Ň': 'n',
};

function stripSlovakDiacritics(value: string): string {
  return value
    .replace(/[čČšŠžŽáÁéÉíÍóÓúÚýÝäÄôÔľĽĺĹŕŔťŤďĎňŇ]]/g, (char) => DIACRITIC_MAP[char] ?? char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value: string, stripDiacritics: boolean): string {
  const base = stripDiacritics ? stripSlovakDiacritics(value) : value;
  return base
    .toLowerCase()
    .replace(/[.,!?;:()””””„…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string, stripDiacritics: boolean): string[] {
  const normalized = normalizeText(value, stripDiacritics);
  return normalized ? normalized.split(' ') : [];
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

function evaluateSpeech(
  transcript: string,
  expected: string,
  banked: Set<number> = new Set(),
): { result: MatchResult; newBanked: Set<number> } {
  const expectedWords = tokenize(expected, true);
  const heardWords = tokenize(transcript, true);
  const consumed = Array.from({ length: heardWords.length }, () => false);

  const matchedWords = expectedWords.map((word, idx) => {
    if (banked.has(idx)) return true; // already credited from a previous attempt
    const heardIdx = heardWords.findIndex((heard, i) => !consumed[i] && heard === word);
    if (heardIdx >= 0) {
      consumed[heardIdx] = true;
      return true;
    }
    return false;
  });

  const matchedCount = matchedWords.filter(Boolean).length;
  const wordScore = expectedWords.length > 0 ? matchedCount / expectedWords.length : 0;
  const expectedNormalized = normalizeText(expected, true);
  const heardNormalized = normalizeText(transcript, true);
  const maxLength = Math.max(expectedNormalized.length, heardNormalized.length, 1);
  const charScore = 1 - levenshtein(expectedNormalized, heardNormalized) / maxLength;

  const newBanked = new Set(banked);
  matchedWords.forEach((matched, idx) => { if (matched) newBanked.add(idx); });

  return {
    result: {
      correct: wordScore >= PASS_THRESHOLD,
      wordScore,
      charScore: Math.max(0, charScore),
      matchedWords,
    },
    newBanked,
  };
}

function resolveTemplate(value: string, tokens: TokenMap): string {
  return value.replace(/{{\s*(displayName|countrySkGenitive|countryEn|happyGender)\s*}}/g, (_, key: keyof TokenMap) => tokens[key]);
}

function resolveAnswer(answer: YesNoAnswer | null | undefined, tokens: TokenMap, choice?: 'yes' | 'no'): ActiveAnswer | null {
  if (!answer) return null;
  return {
    sk: resolveTemplate(answer.sk, tokens),
    en: resolveTemplate(answer.en, tokens),
    chunks: answer.chunks.map((chunk) => resolveTemplate(chunk, tokens)),
    choice,
  };
}

function resolveSpeakingQuestion(question: SpeakingQuestion, tokens: TokenMap): SpeakingQuestion {
  return {
    ...question,
    marekQuestionSk: resolveTemplate(question.marekQuestionSk, tokens),
    marekQuestionEn: resolveTemplate(question.marekQuestionEn, tokens),
    correctAnswerSk: question.correctAnswerSk ? resolveTemplate(question.correctAnswerSk, tokens) : null,
    correctAnswerEn: question.correctAnswerEn ? resolveTemplate(question.correctAnswerEn, tokens) : null,
    answerChunks: question.answerChunks.map((chunk) => resolveTemplate(chunk, tokens)),
    yesAnswer: question.yesAnswer
      ? {
          sk: resolveTemplate(question.yesAnswer.sk, tokens),
          en: resolveTemplate(question.yesAnswer.en, tokens),
          chunks: question.yesAnswer.chunks.map((chunk) => resolveTemplate(chunk, tokens)),
        }
      : question.yesAnswer,
    noAnswer: question.noAnswer
      ? {
          sk: resolveTemplate(question.noAnswer.sk, tokens),
          en: resolveTemplate(question.noAnswer.en, tokens),
          chunks: question.noAnswer.chunks.map((chunk) => resolveTemplate(chunk, tokens)),
        }
      : question.noAnswer,
  };
}

function buildSentenceItem(answer: ActiveAnswer, id: string): SentenceBuilderItem {
  const words = answer.sk.split(/\s+/).filter(Boolean);
  return {
    id,
    promptEn: answer.en,
    targetSk: words,
    bankChunks: words,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function MicIcon({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
    </svg>
  );
}

function PlayIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function ConversationSpeakingExercise({ exercise, onDone, onAnswer }: Props) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [mode, setMode] = useState<Mode>(sessionForcedTyping ? 'type' : 'speak');
  const [introAccepted, setIntroAccepted] = useState(sessionForcedTyping);
  const [showNoisyModal, setShowNoisyModal] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [status, setStatus] = useState<SpeakStatus>('idle');
  const [heardText, setHeardText] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [volumeBars, setVolumeBars] = useState<number[]>(INITIAL_BARS);
  const [isQuestionPlaying, setIsQuestionPlaying] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [hasMarekFinished, setHasMarekFinished] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [yesNoChoice, setYesNoChoice] = useState<'yes' | 'no' | null>(null);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const user = useAuthStore((s) => s.user);
  const alias = useAuthStore((s) => s.alias);
  const countryEn = useAuthStore((s) => s.country);
  const countrySk = useAuthStore((s) => s.country_sk);
  const countrySkGenitiveRaw = useAuthStore((s) => s.country_sk_genitive);
  const countrySkLocative = useAuthStore((s) => s.country_sk_locative);
  const countryAdjM = useAuthStore((s) => s.country_sk_adj_masculine);
  const countryAdjF = useAuthStore((s) => s.country_sk_adj_feminine);
  const countryAdjN = useAuthStore((s) => s.country_sk_adj_neuter);
  const countryAdverb = useAuthStore((s) => s.country_sk_adverb);
  const gender = useAuthStore((s) => s.gender);

  // Reconstruct the current Country (device-local choice) to pre-fill the picker.
  const currentCountry: Country | null = countryEn ? {
    en: countryEn, sk: countrySk, gen: countrySkGenitiveRaw, loc: countrySkLocative,
    adj_m: countryAdjM, adj_f: countryAdjF, adj_n: countryAdjN, adv: countryAdverb,
  } : null;

  const handleDemographicsSave = (c: Country, g: string) => {
    applyDemographicsToStore({ country: c, gender: g });
    if (user?.id) saveLocalDemographics(user.id, c, g);
    setShowPicker(false);
  };

  const question = exercise.questions[questionIdx];

  const introSpeaker = useMemo(() => {
    const names = [...new Set(exercise.questions.map((q) => q.speakerName).filter(Boolean))];
    return names.length === 1 ? (names[0] as string) : names.length === 0 ? 'Marek' : null;
  }, [exercise.questions]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const maxTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef(0);
  const attemptCountRef = useRef(0);
  const cantSpeakClicksRef = useRef(0);
  const bankedRef = useRef<Set<number>>(new Set());

  const profileTokens = useMemo<TokenMap>(() => {
    // Alias-first: personalise speaking prompts with the alias, not a real name
    const displayName = alias || user?.email?.split('@')[0] || 'friend';
    const countrySkGenitive = (countrySkGenitiveRaw || countrySk || 'tvojej krajiny')
      .replace(/^zo\s+/i, '')
      .replace(/^z\s+/i, '');
    const happyGender = gender.toLowerCase() === 'female' ? 'šťastná' : 'šťastný';

    return {
      displayName,
      countrySkGenitive,
      countryEn: countryEn || 'your country',
      happyGender,
    };
  }, [alias, countryEn, countrySk, countrySkGenitiveRaw, gender, user]);

  const resolvedQuestion = useMemo(() => resolveSpeakingQuestion(question, profileTokens), [profileTokens, question]);
  const activeAnswer = useMemo<ActiveAnswer | null>(() => {
    if (resolvedQuestion.choices?.length) {
      const picked = resolvedQuestion.choices.find((c) => c.id === choiceId);
      if (!picked) return null;
      return { sk: picked.sk, en: picked.en, chunks: picked.chunks };
    }
    if (resolvedQuestion.isYesNo) {
      if (yesNoChoice === 'yes') return resolveAnswer(resolvedQuestion.yesAnswer, profileTokens, 'yes');
      if (yesNoChoice === 'no') return resolveAnswer(resolvedQuestion.noAnswer, profileTokens, 'no');
      return null;
    }
    if (!resolvedQuestion.correctAnswerSk || !resolvedQuestion.correctAnswerEn) return null;
    return {
      sk: resolvedQuestion.correctAnswerSk,
      en: resolvedQuestion.correctAnswerEn,
      chunks: resolvedQuestion.answerChunks,
    };
  }, [choiceId, profileTokens, resolvedQuestion, yesNoChoice]);
  const typeSentence = useMemo(
    () => activeAnswer ? buildSentenceItem(activeAnswer, resolvedQuestion.id) : null,
    [activeAnswer, resolvedQuestion.id],
  );

  const isRecording = status === 'recording';
  const isTranscribing = status === 'transcribing';
  const hasFeedback = status === 'correct' || status === 'wrong' || status === 'effort_pass';

  const stopMeter = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setVolumeBars(INITIAL_BARS);
  }, []);

  const cleanupRecording = useCallback(() => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    stopMeter();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    silenceStartRef.current = null;
  }, [stopMeter]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  }, []);

  const resetAnswerFeedback = useCallback(() => {
    setStatus('idle');
    setHeardText('');
    setMatchResult(null);
    setErrorMessage('');
  }, []);


  const goNext = useCallback(() => {
    cleanupRecording();
    if (questionIdx + 1 < exercise.questions.length) {
      setQuestionIdx((idx) => idx + 1);
      setYesNoChoice(null);
      setChoiceId(null);
      resetAnswerFeedback();
      setMode(sessionForcedTyping ? 'type' : 'speak');
    } else {
      onDone(true);
    }
  }, [cleanupRecording, exercise.questions.length, onDone, questionIdx, resetAnswerFeedback]);

  const transcribeAudio = useCallback(async (blob: Blob, expectedText: string): Promise<string> => {
    const formData = new FormData();
    formData.append('audio', blob, `conversation-speaking-${resolvedQuestion.id}.webm`);
    formData.append('language', 'sk');
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('expectedText', expectedText);

    const { data, error } = await supabase.functions.invoke<TranscriptionResponse>('transcribe-speech', {
      body: formData,
    });

    if (error) throw new Error(error.message);
    const transcript = (data?.transcript ?? data?.text ?? '').trim();
    if (!transcript) throw new Error('No speech was detected in the recording.');
    return transcript;
  }, [resolvedQuestion.id]);

  const handleRecordingStop = useCallback(async () => {
    const blob = new Blob(chunksRef.current, { type: recorderRef.current?.mimeType || 'audio/webm' });
    chunksRef.current = [];
    recorderRef.current = null;
    cleanupRecording();

    if (!activeAnswer) {
      setStatus('error');
      setErrorMessage('Choose your answer first.');
      return;
    }

    if (blob.size < 800) {
      setStatus('error');
      setErrorMessage('I could not hear enough audio. Try once more or use Type mode.');
      return;
    }

    setStatus('transcribing');
    setErrorMessage('');

    try {
      const transcript = await transcribeAudio(blob, activeAnswer.sk);
      const { result, newBanked } = evaluateSpeech(transcript, activeAnswer.sk, bankedRef.current);
      bankedRef.current = newBanked;
      setHeardText(transcript);
      setMatchResult(result);

      if (result.correct) {
        setStatus('correct');
        onAnswer?.(true);
      } else {
        attemptCountRef.current += 1;
        const newCount = attemptCountRef.current;
        setAttemptCount(newCount);
        if (newCount >= EFFORT_PASS_ATTEMPTS) {
          setStatus('effort_pass');
          window.setTimeout(() => {
            setStatus('idle');
            setMode('type');
          }, 1_800);
        } else {
          setStatus('wrong');
        }
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Could not transcribe the recording.');
    }
  }, [activeAnswer, cleanupRecording, onAnswer, transcribeAudio]);

  const startMeter = useCallback((stream: MediaStream) => {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    const source = audioContext.createMediaStreamSource(stream);
    const samples = new Uint8Array(analyser.fftSize);
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        const centered = (sample - 128) / 128;
        sum += centered * centered;
      }
      const rms = Math.sqrt(sum / samples.length);
      const now = performance.now();
      const elapsed = now - recordingStartedAtRef.current;

      setVolumeBars((prev) => [...prev.slice(1), Math.min(1, Math.max(0.08, rms * 8))]);

      if (elapsed > MIN_RECORDING_MS) {
        if (rms < SILENCE_THRESHOLD) {
          silenceStartRef.current ??= now;
          if (now - silenceStartRef.current > SILENCE_MS) stopRecording();
        } else {
          silenceStartRef.current = null;
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!activeAnswer) {
      setStatus('error');
      setErrorMessage('Choose your answer first.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicDenied(true);
      setMode('type');
      setStatus('idle');
      setErrorMessage('Recording is not available in this browser. Type mode is ready.');
      return;
    }

    resetAnswerFeedback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorderOptions = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? { mimeType: 'audio/webm;codecs=opus' }
        : MediaRecorder.isTypeSupported('audio/webm')
        ? { mimeType: 'audio/webm' }
        : undefined;
      const recorder = new MediaRecorder(stream, recorderOptions);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => { void handleRecordingStop(); };

      recordingStartedAtRef.current = performance.now();
      recorder.start();
      setStatus('recording');
      startMeter(stream);
      maxTimerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (err) {
      cleanupRecording();
      setMicDenied(true);
      setMode('type');
      setStatus('idle');
      setErrorMessage(err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Type mode is ready.'
        : 'Microphone is unavailable. Type mode is ready.');
    }
  }, [activeAnswer, cleanupRecording, handleRecordingStop, resetAnswerFeedback, startMeter, stopRecording]);

  const handleTypeComplete = useCallback((correct: boolean) => {
    onAnswer?.(correct);
    if (!correct) return;
    window.setTimeout(goNext, 1_200);
  }, [goNext, onAnswer]);

  const replayQuestion = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play();
  }, []);

  const handleYesNoChoice = useCallback((choice: 'yes' | 'no') => {
    setYesNoChoice(choice);
    resetAnswerFeedback();
    setAttemptCount(0);
    attemptCountRef.current = 0;
    bankedRef.current = new Set();
  }, [resetAnswerFeedback]);

  const handleChoiceSelect = useCallback((id: string) => {
    setChoiceId(id);
    resetAnswerFeedback();
    setAttemptCount(0);
    attemptCountRef.current = 0;
    bankedRef.current = new Set();
  }, [resetAnswerFeedback]);

  const handleIntroReady = useCallback(async () => {
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        setMicDenied(true);
      }
    }
    setIntroAccepted(true);
  }, []);

  const handleCantSpeak = useCallback(() => {
    cantSpeakClicksRef.current += 1;
    if (cantSpeakClicksRef.current >= 2) {
      setShowNoisyModal(true);
    }
    // first click is silently ignored
  }, []);

  const handleNoisyPlace = useCallback(() => {
    sessionForcedTyping = true;
    setShowNoisyModal(false);
    setMode('type');
  }, []);

  const handleBackFromModal = useCallback(() => {
    setShowNoisyModal(false);
  }, []);

  useEffect(() => {
    if (!introAccepted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetAnswerFeedback();
    setYesNoChoice(null);
    setChoiceId(null);
    setAudioPlayed(false);
    setHasMarekFinished(false);
    setAttemptCount(0);
    attemptCountRef.current = 0;
    bankedRef.current = new Set();
    const timer = window.setTimeout(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(() => setIsQuestionPlaying(false));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [questionIdx, introAccepted, resetAnswerFeedback]);

  useEffect(() => cleanupRecording, [cleanupRecording]);

  useEffect(() => {
    return () => { sessionForcedTyping = false; };
  }, []);

  const renderMatchedWords = () => {
    if (!matchResult || !activeAnswer) return null;
    const strictWords = tokenize(heardText, false);
    const lenientWords = tokenize(heardText, true);
    const banked = bankedRef.current;
    return (
      <div className="flex flex-wrap gap-1.5">
        {activeAnswer.sk.split(/\s+/).map((word, index) => {
          const strict = normalizeText(word, false);
          const lenient = normalizeText(word, true);
          const strictMatch = strictWords.includes(strict);
          const lenientMatch = lenientWords.includes(lenient);
          const isBankedFromPrev = banked.has(index) && !strictMatch;
          const color = strictMatch
            ? 'bg-green-100 text-green-700 border-green-200'
            : isBankedFromPrev
            ? 'bg-green-50 text-green-600 border-green-200'
            : lenientMatch || matchResult.matchedWords[index]
            ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-gray-100 text-gray-600 border-gray-200';
          return (
            <span key={`${word}-${index}`} className={`px-2 py-1 rounded-lg border text-xs font-bold ${color}`}>
              {word}{isBankedFromPrev ? ' ✓' : ''}
            </span>
          );
        })}
      </div>
    );
  };

  const renderYesNoPicker = () => {
    if (!resolvedQuestion.isYesNo) return null;
    const options = [
      { choice: 'yes' as const, label: 'Áno', answer: resolveAnswer(resolvedQuestion.yesAnswer, profileTokens, 'yes') },
      { choice: 'no' as const, label: 'Nie', answer: resolveAnswer(resolvedQuestion.noAnswer, profileTokens, 'no') },
    ].filter((option) => option.answer !== null);

    return (
      <div className="grid grid-cols-2 gap-2 flex-none">
        {options.map(({ choice, label, answer }) => {
          const selected = yesNoChoice === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => handleYesNoChoice(choice)}
              className={`rounded-2xl border-2 px-3 py-3 text-left transition-all active:scale-[0.98] cursor-pointer ${
                selected
                  ? 'border-brand-green bg-green-50 text-brand-green shadow-sm'
                  : yesNoNeedsChoice
                  ? 'border-brand-blue bg-blue-50 text-gray-700 animate-pulse'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50'
              }`}
            >
              <span className="block text-sm font-black">{label}</span>
              <span lang="sk" className="block text-xs font-semibold leading-snug mt-1">{answer?.sk}</span>
              <span className="block text-[11px] text-gray-600 leading-snug mt-0.5">{answer?.en}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderChoicePicker = () => {
    if (!resolvedQuestion.choices?.length) return null;
    const needsChoice = hasMarekFinished && !choiceId;
    return (
      <div className="flex flex-col gap-2 flex-none">
        {resolvedQuestion.choices.map((choice: SpeakingChoice) => {
          const selected = choiceId === choice.id;
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => handleChoiceSelect(choice.id)}
              className={`rounded-2xl border-2 px-3 py-3 text-left transition-all active:scale-[0.98] cursor-pointer ${
                selected
                  ? 'border-brand-green bg-green-50 text-brand-green shadow-sm'
                  : needsChoice
                  ? 'border-brand-blue bg-blue-50 text-gray-700 animate-pulse'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50'
              }`}
            >
              <span className="block text-sm font-black">{choice.label}</span>
              <span lang="sk" className="block text-xs font-semibold leading-snug mt-1">{choice.sk}</span>
              <span className="block text-[11px] text-gray-600 leading-snug mt-0.5">{choice.en}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const needsPickerChoice = hasMarekFinished && !activeAnswer && (resolvedQuestion.isYesNo || !!resolvedQuestion.choices?.length);
  const micShouldPulse = introAccepted && hasMarekFinished && !!activeAnswer && !isRecording && !isTranscribing && !hasFeedback;
  const yesNoNeedsChoice = hasMarekFinished && resolvedQuestion.isYesNo && !yesNoChoice;

  const micInstruction = needsPickerChoice
    ? (hasMarekFinished ? 'Choose your answer, then tap the mic.' : 'Listen to Marek first.')
    : isRecording
    ? 'Listening... tap again to stop, or pause and I will stop automatically.'
    : isTranscribing
    ? 'Checking what you said...'
    : isQuestionPlaying
    ? 'Listen to Marek first.'
    : hasMarekFinished
    ? 'Your turn. Tap the mic and read the Slovak answer aloud.'
    : 'Tap ▶ Replay Marek to hear the question.';

  if (!introAccepted) {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center px-2">
        <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-blue-500 to-blue-600 text-white px-6 py-8 flex flex-col items-center gap-5 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-4xl select-none">
            👨
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black mb-3">{introSpeaker ? `Speaking with ${introSpeaker}` : 'Speaking Exercise'}</h2>
            <p className="text-sm text-blue-100 leading-relaxed">
              In this exercise you will practice speaking in Slovak. You will be having an oral discussion with {introSpeaker ?? 'multiple speakers'}. Tap below first, then allow microphone access when your browser asks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void handleIntroReady(); }}
            className="w-full bg-white text-blue-600 font-black py-4 rounded-2xl text-base hover:bg-blue-50 active:scale-[0.98] transition-all cursor-pointer shadow-md"
          >
            I'm ready
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0 gap-4">
      <audio
        ref={audioRef}
        src={resolvedQuestion.marekAudioUrl}
        preload="auto"
        onPlay={() => { setIsQuestionPlaying(true); setAudioPlayed(true); setHasMarekFinished(false); }}
        onPause={() => setIsQuestionPlaying(false)}
        onEnded={() => { setIsQuestionPlaying(false); setHasMarekFinished(true); }}
      />

      <div className="flex-none flex items-center gap-3">
        <button
          type="button"
          onClick={replayQuestion}
          className={`flex items-center gap-2 px-3 py-2 rounded-full bg-blue-50 border border-blue-200 text-brand-blue text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all cursor-pointer${!audioPlayed && !isQuestionPlaying ? ' ring-2 ring-brand-blue ring-offset-1 animate-pulse' : ''}`}
        >
          <PlayIcon />
          {isQuestionPlaying ? 'Playing' : `Replay ${resolvedQuestion.speakerName ?? 'Marek'}`}
        </button>
        <span className="ml-auto text-xs text-gray-600 font-medium">
          {questionIdx + 1} / {exercise.questions.length}
        </span>
      </div>

      {/* Identity bar — pick/change gender + country "in the moment". Nothing is
          stored on our servers; it only shapes the Slovak in this exercise. */}
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="flex-none self-start flex items-center gap-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-100 active:scale-[0.98] cursor-pointer transition-colors"
      >
        <span aria-hidden="true">{gender.toLowerCase() === 'female' ? '♀' : gender.toLowerCase() === 'male' ? '♂' : '🙂'}</span>
        {countryEn && gender ? (
          <span className="text-gray-500">
            Answering as <b className="font-semibold text-gray-700">{gender}</b> from <b className="font-semibold text-gray-700">{countryEn}</b>
          </span>
        ) : (
          <span className="font-semibold text-brand-blue">Tap to personalise this exercise</span>
        )}
        <span className="text-gray-600 underline ml-0.5">change</span>
      </button>

      <div className="flex-none bg-white rounded-2xl border-2 border-gray-100 shadow-sm px-4 py-3">
        <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-1">{resolvedQuestion.speakerName ?? 'Marek'} asks</p>
        <p lang="sk" className="text-base font-extrabold text-gray-800 leading-snug">{resolvedQuestion.marekQuestionSk}</p>
        <p className="text-xs text-gray-600 mt-1">{resolvedQuestion.marekQuestionEn}</p>
      </div>

      {showPicker && (
        <DemographicsPickerModal
          initialCountry={currentCountry}
          initialGender={gender}
          onSave={handleDemographicsSave}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className={`flex flex-col flex-1 min-h-0 gap-4 transition-opacity duration-300 ${isQuestionPlaying ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}`}>

      {!sessionForcedTyping && (
        <div className="grid grid-cols-2 gap-2 flex-none">
          <button
            type="button"
            onClick={() => setMode('speak')}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition-all cursor-pointer ${
              mode === 'speak'
                ? 'border-brand-blue bg-blue-50 text-brand-blue'
                : 'border-gray-200 bg-white text-gray-500 hover:border-brand-blue hover:bg-blue-50'
            }`}
          >
            Speak
          </button>
          <button
            type="button"
            onClick={handleCantSpeak}
            className={`rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition-all cursor-pointer ${
              mode === 'type'
                ? 'border-brand-blue bg-blue-50 text-brand-blue'
                : 'border-gray-200 bg-white text-gray-500 hover:border-brand-blue hover:bg-blue-50'
            }`}
          >
            Can't Speak Now
          </button>
        </div>
      )}

      {renderYesNoPicker()}
      {renderChoicePicker()}

      {errorMessage && (
        <div className="flex-none rounded-2xl bg-amber-50 border-2 border-amber-200 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">{errorMessage}</p>
        </div>
      )}

      {micDenied && mode === 'type' && (
        <div className="flex-none rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700">Microphone was not available, so Type mode is ready.</p>
        </div>
      )}

      {mode === 'type' ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {typeSentence ? (
            <SentenceBuildSlide
              key={`${resolvedQuestion.id}-${activeAnswer?.choice ?? 'default'}-type`}
              sentence={typeSentence}
              sentenceNum={questionIdx + 1}
              totalSentences={exercise.questions.length}
              onComplete={handleTypeComplete}
            />
          ) : (
            <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-6 text-center">
              <p className="text-sm font-bold text-gray-500">Choose your answer to build the sentence.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-5 text-center">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-widest mb-2">Your answer</p>
            {activeAnswer ? (
              <>
                <p lang="sk" className="text-2xl font-black text-gray-900 leading-snug">{activeAnswer.sk}</p>
                <p className="text-sm text-gray-600 mt-2">{activeAnswer.en}</p>
              </>
            ) : (
              <p className="text-sm font-bold text-gray-600">Choose your answer first.</p>
            )}
          </div>

          <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? 'Stop recording' : 'Tap to record your pronunciation'}
                disabled={isTranscribing || !activeAnswer}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? 'bg-brand-red animate-pulse active:scale-95'
                    : micShouldPulse
                    ? 'bg-brand-green animate-pulse ring-4 ring-brand-green ring-offset-2 active:scale-95'
                    : 'bg-brand-green hover:opacity-90 active:scale-95'
                }`}
              >
                {isTranscribing ? (
                  <span className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <MicIcon className="w-9 h-9" />
                )}
              </button>

              <div className="h-10 flex items-end justify-center gap-1 w-full max-w-xs" aria-hidden="true">
                {volumeBars.map((level, index) => (
                  <span
                    key={index}
                    className={`w-2 rounded-full transition-all duration-100 ${isRecording ? 'bg-brand-blue' : 'bg-gray-200'}`}
                    style={{ height: `${Math.max(8, level * 38)}px` }}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-600 text-center">{micInstruction}</p>
            </div>

          {hasFeedback && matchResult && activeAnswer && (
            <div className={`rounded-2xl px-4 py-4 border-2 ${status === 'correct' || status === 'effort_pass' ? 'bg-green-50 border-brand-green' : 'bg-red-50 border-brand-red'}`}>
              <p className={`text-sm font-extrabold mb-2 ${status === 'correct' || status === 'effort_pass' ? 'text-brand-green' : 'text-brand-red'}`}>
                {status === 'correct' ? 'Well said!' : status === 'effort_pass' ? 'Great effort! Moving on...' : `Try again (${attemptCount}/${EFFORT_PASS_ATTEMPTS})`}
              </p>
              {status === 'effort_pass' ? (
                <p className="text-xs text-gray-500 mb-2">You gave it your best — switching to typing now.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-500">Words {formatPercent(matchResult.wordScore)}</span>
                    <span className="text-xs text-gray-300">/</span>
                    <span className="text-xs font-bold text-gray-500">Similarity {formatPercent(matchResult.charScore)}</span>
                  </div>
                  {/* eslint-disable-next-line react-hooks/refs */}
                  {renderMatchedWords()}
                  {status === 'wrong' && (
                    <div className="mt-3 grid gap-2 text-xs">
                      <p className="text-gray-500"><span className="font-bold">Heard:</span> {heardText || 'No transcript'}</p>
                      <p className="text-gray-500"><span className="font-bold">Expected:</span> <span lang="sk">{activeAnswer.sk}</span></p>
                    </div>
                  )}
                </>
              )}
              <div className="flex gap-2 mt-4">
                {status === 'correct' ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 bg-brand-green text-white font-bold py-3 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] cursor-pointer"
                  >
                    {questionIdx + 1 < exercise.questions.length ? 'Next' : 'Done'}
                  </button>
                ) : status === 'effort_pass' ? null : (
                  <>
                    <button
                      type="button"
                      onClick={resetAnswerFeedback}
                      className="flex-1 bg-brand-blue text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wide hover:opacity-90 active:scale-[0.98] cursor-pointer"
                    >
                      Try again
                    </button>
                    {attemptCount >= 3 && (
                      <button
                        type="button"
                        onClick={() => { setMode('type'); resetAnswerFeedback(); }}
                        className="flex-1 bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-xs uppercase tracking-wide hover:border-brand-blue hover:bg-blue-50 active:scale-[0.98] cursor-pointer"
                      >
                        Type The Answer
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      </div>

      {showNoisyModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 rounded-3xl px-4">
          <div className="bg-white rounded-3xl px-6 py-7 flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full text-center">
            <img src="/snailPerplexedListening.png" alt="" className="w-24 h-24 object-contain" />
            <p className="text-base font-extrabold text-gray-800 leading-snug">
              Speaking is the most important part of learning a language. Don't shy away.
            </p>
            <div className="flex flex-col gap-2 w-full mt-1">
              <button
                type="button"
                onClick={handleNoisyPlace}
                className="w-full bg-brand-blue text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 active:scale-[0.98] cursor-pointer"
              >
                I am in a noisy place.
              </button>
              <button
                type="button"
                onClick={handleBackFromModal}
                className="w-full bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm hover:border-gray-300 active:scale-[0.98] cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
