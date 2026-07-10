import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SpeakTheWordExercise as TExercise } from '../../types/lesson';

type SpeakStatus = 'idle' | 'recording' | 'pass' | 'fail' | 'mic_error';

interface Props {
  exercise: TExercise;
  onDone: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
}

// ── Fuzzy matching ────────────────────────────────────────────────────────────

const DIACRITIC_MAP: Record<string, string> = {
  'č':'c','Č':'c','š':'s','Š':'s','ž':'z','Ž':'z',
  'á':'a','Á':'a','é':'e','É':'e','í':'i','Í':'i',
  'ó':'o','Ó':'o','ú':'u','Ú':'u','ý':'y','Ý':'y',
  'ä':'a','Ä':'a','ô':'o','Ô':'o',
  'ľ':'l','Ľ':'l','ĺ':'l','Ĺ':'l','ŕ':'r','Ŕ':'r',
  'ť':'t','Ť':'t','ď':'d','Ď':'d','ň':'n','Ň':'n',
};

function stripDiacritics(s: string) {
  return s.replace(/./gu, ch => DIACRITIC_MAP[ch] ?? ch)
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function norm(s: string) { return stripDiacritics(s).toLowerCase().trim(); }

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(curr[j-1]+1, prev[j]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    }
    prev.splice(0, prev.length, ...curr);
  }
  return prev[b.length];
}

function wordMatches(transcripts: string[], target: string): boolean {
  const t = norm(target);
  const tWords = t.split(/\s+/);

  return transcripts.some(transcript => {
    const trWords = norm(transcript).split(/\s+/);
    if (tWords.length === 1) {
      return trWords.some(w => w === t || lev(w, t) <= 1);
    }
    // Phrase: all key words (length > 2) must appear in transcript
    const keyWords = tWords.filter(w => w.length > 2);
    if (keyWords.length === 0) {
      // All very short words — full phrase comparison
      return lev(trWords.join(' '), t) <= Math.max(1, Math.floor(t.length * 0.3));
    }
    return keyWords.every(kw => trWords.some(w => w === kw || lev(w, kw) <= 1));
  });
}

// ── Web Speech API ─────────────────────────────────────────────────────────────

type WSR = typeof window extends { SpeechRecognition: infer R } ? R : never;

function getSpeechRecognition(): (new () => WSR) | null {
  return (
    (window as unknown as { SpeechRecognition?: new () => WSR }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => WSR }).webkitSpeechRecognition ??
    null
  );
}

const MAX_ATTEMPTS = 2;
const SAFETY_TIMEOUT_MS = 3_000;

export function SpeakTheWordExercise({ exercise, onDone, onAnswer }: Props) {
  const words = exercise.words;

  const [activeIdx, setActiveIdx] = useState(0);
  const [status, setStatus] = useState<SpeakStatus>('idle');
  const [attempts, setAttempts] = useState(0);
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown' | 'denied' | 'blocked'>('unknown');

  // Refs kept in sync before paint — avoids stale closures in speech callbacks
  const activeIdxRef = useRef(0);
  const attemptsRef = useRef(0);
  const statusRef = useRef<SpeakStatus>('idle');
  // words accessed via ref so it never needs to be in a dep array
  const wordsRef = useRef(words);
  wordsRef.current = words;

  useLayoutEffect(() => {
    activeIdxRef.current = activeIdx;
    attemptsRef.current = attempts;
    statusRef.current = status;
  });

  const recognitionRef = useRef<WSR | null>(null);
  const hasResultRef = useRef(false);
  const doneRef = useRef(false);
  const safetyTimerRef = useRef<number | null>(null);
  // Incremented each time a new recognition session starts; handlers check it to
  // ignore events from a previous (stale) session.
  const sessionRef = useRef(0);

  const clearSafety = () => {
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
  };

  const stopRecognition = useCallback(() => {
    clearSafety();
    try { (recognitionRef.current as unknown as { abort(): void } | null)?.abort(); } catch { /* no-op */ }
    recognitionRef.current = null;
  }, []);

  useEffect(() => () => { stopRecognition(); }, [stopRecognition]);

  const advance = useCallback((passed: boolean) => {
    if (doneRef.current) return;
    onAnswer?.(passed);
    const next = activeIdxRef.current + 1;
    if (next >= words.length) {
      doneRef.current = true;
      setStatus('idle');
      window.setTimeout(() => onDone(true), 300);
    } else {
      setActiveIdx(next);
      setAttempts(0);
      setStatus('idle');
    }
  }, [words.length, onAnswer, onDone]);

  const handleTranscripts = useCallback((transcripts: string[], session: number) => {
    if (session !== sessionRef.current) return;
    hasResultRef.current = true;
    clearSafety();
    stopRecognition();

    const matched = wordMatches(transcripts, wordsRef.current[activeIdxRef.current].slovak);

    if (matched) {
      setPassedSet(prev => new Set(prev).add(activeIdxRef.current));
      setStatus('pass');
      window.setTimeout(() => advance(true), 700);
    } else {
      const next = attemptsRef.current + 1;
      setAttempts(next);
      setStatus('fail');
      if (next >= MAX_ATTEMPTS) {
        window.setTimeout(() => advance(false), 1_000);
      } else {
        window.setTimeout(() => setStatus('idle'), 600);
      }
    }
  }, [advance, stopRecognition]);

  const handleNoSpeech = useCallback((session: number) => {
    if (session !== sessionRef.current) return;
    if (hasResultRef.current) return;
    hasResultRef.current = true;
    clearSafety();
    stopRecognition();
    const next = attemptsRef.current + 1;
    setAttempts(next);
    setStatus('fail');
    if (next >= MAX_ATTEMPTS) {
      window.setTimeout(() => advance(false), 1_000);
    } else {
      window.setTimeout(() => setStatus('idle'), 600);
    }
  }, [advance, stopRecognition]);

  // Manual stop: user tapped to cancel mid-recording.
  // Sets hasResultRef so the pending onerror('aborted') / onend don't penalise the attempt.
  const cancelRecording = useCallback(() => {
    clearSafety();
    hasResultRef.current = true;
    try { (recognitionRef.current as unknown as { abort(): void } | null)?.abort(); } catch { /* no-op */ }
    recognitionRef.current = null;
    setStatus('idle');
  }, []);

  const startRecording = useCallback(() => {
    // Read via ref so status state isn't in the dep array (avoids stale-closure churn)
    if (statusRef.current !== 'idle') return;

    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setStatus('mic_error');
      window.setTimeout(() => setStatus('idle'), 2_000);
      return;
    }

    const recognition = new Ctor();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = recognition as any;
    rec.lang = 'sk-SK';
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    hasResultRef.current = false;
    const session = ++sessionRef.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const transcripts: string[] = Array.from(event.results[0] as Iterable<{ transcript: string }>)
        .map((r) => r.transcript);
      handleTranscripts(transcripts, session);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        handleNoSpeech(session);
      } else if (event.error === 'not-allowed') {
        clearSafety();
        stopRecognition();
        setStatus('idle');
        if (navigator.permissions) {
          navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
            // 'denied' = permanently blocked; 'prompt' = user dismissed the dialog
            setMicPermission(result.state === 'denied' ? 'blocked' : 'denied');
          }).catch(() => setMicPermission('blocked'));
        } else {
          setMicPermission('blocked');
        }
      } else {
        clearSafety();
        stopRecognition();
        setStatus('mic_error');
        window.setTimeout(() => setStatus('idle'), 2_000);
      }
    };

    rec.onend = () => {
      if (!hasResultRef.current) handleNoSpeech(session);
    };

    recognitionRef.current = recognition;
    rec.start();
    setMicPermission('unknown');
    setStatus('recording');

    safetyTimerRef.current = window.setTimeout(() => {
      if (!hasResultRef.current) { stopRecognition(); handleNoSpeech(session); }
    }, SAFETY_TIMEOUT_MS);
  }, [handleTranscripts, handleNoSpeech, stopRecognition]);

  // When mic is amber (denied), check the real permission state first.
  // If already 'denied' at browser level → go straight to blocked (grey) without
  // calling getUserMedia, which would just flicker and immediately reject.
  // If state is 'prompt' → call getUserMedia to re-show the browser dialog.
  const requestPermission = useCallback(async () => {
    // Pre-check: if permission is already permanently denied, skip getUserMedia entirely
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (result.state === 'denied') { setMicPermission('blocked'); return; }
      } catch { /* permissions API unavailable — fall through to getUserMedia */ }
    }

    if (!navigator.mediaDevices?.getUserMedia) { setMicPermission('blocked'); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission('unknown');
      startRecording();
    } catch {
      // getUserMedia failed despite state being 'prompt' — treat as blocked
      setMicPermission('blocked');
    }
  }, [startRecording]);

  const handleCantSpeak = useCallback(() => setShowModal(true), []);
  const handleBack = useCallback(() => setShowModal(false), []);
  const handleNoisyPlace = useCallback(() => {
    stopRecognition();
    setShowModal(false);
    onDone(true);
  }, [stopRecognition, onDone]);

  const isRecording = status === 'recording';
  const isFail = status === 'fail';
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const prompt =
    isRecording             ? 'Listening...' :
    status === 'pass'       ? '✓ Well done!' :
    status === 'mic_error'  ? 'Mic not available — tap "Can\'t speak?"' :
    isFail && attempts >= MAX_ATTEMPTS ? 'Moving on...' :
    isFail                  ? 'Try again!' :
    micPermission === 'blocked' ? 'Microphone blocked — enable it in browser settings if you are using the browser or App settings if you have downloaded as app.' :
    micPermission === 'denied'  ? 'Tap the mic to allow microphone access.' :
    'Tap the mic and say the highlighted word!';

  return (
    <div className="relative flex flex-col flex-1 min-h-0 gap-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-1 flex-none">
        <img src="/snailExcited.png" alt="" className="w-12 h-12 object-contain flex-none" />
        <div className="bg-white rounded-2xl px-4 py-2 shadow-sm text-sm font-semibold text-gray-700 leading-snug">
          {prompt}
        </div>
        <span className="ml-auto text-xs text-gray-400 whitespace-nowrap flex-none">
          Word {activeIdx + 1} of {words.length}
        </span>
      </div>

      {/* 6 tiles — 2 columns × 3 rows */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {words.map((word, idx) => {
          const isActive = idx === activeIdx;
          const isPassing = isActive && status === 'pass';
          const isFailingActive = isActive && isFail;
          const isPassed = passedSet.has(idx);

          return (
            <div
              key={idx}
              className={[
                'flex flex-col items-center justify-center rounded-2xl border-2 py-3 px-2 text-center transition-all duration-200 select-none',
                isPassing
                  ? 'border-green-400 bg-green-50'
                  : isPassed
                  ? 'border-green-300 bg-green-50/50'
                  : isFailingActive
                  ? 'border-red-400 bg-red-50'
                  : isActive
                  ? 'border-brand-blue bg-white shadow-md'
                  : 'border-gray-200 bg-white opacity-60',
                isActive && status === 'idle' ? 'animate-pulse' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={[
                'text-base font-bold',
                isPassing || isPassed ? 'text-green-700' :
                isFailingActive ? 'text-red-600' :
                isActive ? 'text-brand-blue' :
                'text-gray-700',
              ].join(' ')}>
                {word.slovak}
                {isPassing && ' ✓'}
                {isPassed && !isActive && ' ✓'}
              </span>
              <span className="text-xs text-gray-400 mt-0.5">{word.english}</span>
            </div>
          );
        })}
      </div>

      {/* iOS warning banner */}
      {isIOS && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex-none text-xs text-amber-700 leading-snug">
          <span className="text-base leading-none mt-0.5">📱</span>
          <span>Speech recognition on iPhone can be unreliable. Tap <strong>"Can't speak?"</strong> below if you have trouble.</span>
        </div>
      )}

      {/* Mic + Can't speak */}
      <div className="flex flex-col items-center gap-2 flex-none pb-1">
        <button
          type="button"
          onClick={isRecording ? cancelRecording : micPermission === 'denied' ? () => { void requestPermission(); } : startRecording}
          disabled={status === 'pass' || isFail || micPermission === 'blocked'}
          className={[
            'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer',
            isRecording
              ? 'bg-red-500 animate-pulse'
              : status === 'pass'
              ? 'bg-green-400 cursor-not-allowed'
              : isFail
              ? 'bg-gray-300 cursor-not-allowed'
              : micPermission === 'blocked'
              ? 'bg-gray-400 cursor-not-allowed'
              : micPermission === 'denied'
              ? 'bg-amber-500 hover:opacity-90 animate-pulse'
              : 'bg-brand-blue hover:opacity-90',
          ].join(' ')}
        >
          {isRecording ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleCantSpeak}
          className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 cursor-pointer"
        >
          Can't speak?
        </button>
      </div>

      {/* Noisy place modal */}
      {showModal && (
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
                onClick={handleBack}
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
