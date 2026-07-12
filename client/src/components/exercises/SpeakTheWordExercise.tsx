import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SpeakTheWordExercise as TExercise } from '../../types/lesson';
import { slovakifyNumbers } from '../../utils/numberToSlovak';

// Graded, no-fail design: every spoken attempt gets a pronunciation score
// (0–100%) from the recognizer transcript. 80+ = native celebration,
// 60–79 = good pass, below 60 = encouraging retry — and the second attempt
// always passes ("Great effort!"). Silence gets a gentle retry then a neutral
// skip. This exercise never emits strikes and has no red fail state.
type SpeakStatus =
  | 'idle' | 'recording' | 'mic_error'
  | 'pass_native' | 'pass_good' | 'effort_pass'
  | 'retry_close' | 'retry_unclear'
  | 'silent_retry' | 'silent_skip';

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

// Phonetic folding on top of diacritic stripping: y/i are identical sounds in
// Slovak, w≈v for foreign spellings, and doubled letters collapse. Both the
// target and the transcript go through the same fold, so comparisons stay fair.
function norm(s: string) {
  return stripDiacritics(s).toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/(.)\1+/g, '$1');
}

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

function similarity(a: string, b: string): number {
  return 1 - lev(a, b) / Math.max(a.length, b.length, 1);
}

// Edit budget scales with target length (~75% of the word must be right at any
// length). Very short words demand a matching first letter so "to" can't pass
// for "sto". `lenient` (second attempt) grants one extra edit on longer words.
function wordPass(w: string, t: string, lenient: boolean): boolean {
  const d = lev(w, t);
  if (t.length <= 3) return d === 0 || (d === 1 && w[0] === t[0]);
  let budget = t.length <= 6 ? 1 : t.length <= 10 ? 2 : 3;
  if (lenient && t.length >= 7) budget += 1;
  return d <= budget;
}

// Pronunciation score 0..1 — the best similarity between any recognizer
// alternative and the target. Short targets (≤3 chars) require a matching
// first letter to score above 0.5, so "to" can't earn a pass for "sto".
function scoreTarget(transcripts: string[], target: string, lenient: boolean): number {
  const t = norm(target);
  const tWords = t.split(/\s+/).filter(Boolean);
  const tJoined = tWords.join('');
  let best = 0;

  const guarded = (candidate: string, ref: string): number => {
    let s = similarity(candidate, ref);
    if (ref.length <= 3 && candidate[0] !== ref[0]) s = Math.min(s, 0.5);
    return s;
  };

  for (const raw of transcripts) {
    // Recognizers often return digits ("155") for spoken numbers — expand them
    // to Slovak words before comparing.
    const tr = norm(slovakifyNumbers(raw));
    const trWords = tr.split(/\s+/).filter(Boolean);
    if (trWords.length === 0) continue;
    const trJoined = trWords.join('');

    // Space-insensitive whole-utterance comparison: handles digit expansion
    // ("stopäťdesiatpäť" vs "sto päťdesiatpäť") and recognizer spacing quirks.
    best = Math.max(best, guarded(trJoined, tJoined));

    if (tWords.length === 1) {
      for (const w of trWords) best = Math.max(best, guarded(w, t));
    } else {
      // Phrase: score = fraction of key words (>2 chars) said recognisably.
      const keyWords = tWords.filter(w => w.length > 2);
      if (keyWords.length > 0) {
        const hits = keyWords.filter(kw => trWords.some(w => wordPass(w, kw, lenient))).length;
        best = Math.max(best, hits / keyWords.length);
      }
    }
  }
  return best;
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
// Last-resort cutoff. Must leave room for: user reaction time (~1–2s) +
// speaking + the recognizer's own processing (~1–2s after speech ends).
// The old 3s value aborted recognition mid-transcription on real phones,
// producing false "we couldn't hear you" results.
const SAFETY_TIMEOUT_MS = 6_500;

export function SpeakTheWordExercise({ exercise, onDone, onAnswer }: Props) {
  const words = exercise.words;

  const [activeIdx, setActiveIdx] = useState(0);
  const [status, setStatus] = useState<SpeakStatus>('idle');
  const [attempts, setAttempts] = useState(0);
  // Last attempt's pronunciation score (0–100), shown as a chip; null = no scored attempt yet
  const [lastScore, setLastScore] = useState<number | null>(null);
  // Word index → level icon earned: 🌟 native, 💪 good, 👍 effort, 🔃 silent skip
  const [badges, setBadges] = useState<Map<number, string>>(new Map());
  const [showModal, setShowModal] = useState(false);
  const [micPermission, setMicPermission] = useState<'unknown' | 'denied' | 'blocked'>('unknown');

  // Refs kept in sync before paint — avoids stale closures in speech callbacks
  const activeIdxRef = useRef(0);
  const attemptsRef = useRef(0);
  const statusRef = useRef<SpeakStatus>('idle');
  // words accessed via ref so it never needs to be in a dep array
  const wordsRef = useRef(words);

  useLayoutEffect(() => {
    wordsRef.current = words;
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

  // Always reports success upward — this exercise never generates strikes.
  const advance = useCallback(() => {
    if (doneRef.current) return;
    onAnswer?.(true);
    const next = activeIdxRef.current + 1;
    if (next >= words.length) {
      doneRef.current = true;
      setStatus('idle');
      window.setTimeout(() => onDone(true), 300);
    } else {
      setActiveIdx(next);
      setAttempts(0);
      setLastScore(null);
      setStatus('idle');
    }
  }, [words.length, onAnswer, onDone]);

  const handleTranscripts = useCallback((transcripts: string[], session: number) => {
    if (session !== sessionRef.current) return;
    hasResultRef.current = true;
    clearSafety();
    stopRecognition();

    // Second attempt gets a slightly looser edit budget on longer words
    const score = scoreTarget(
      transcripts,
      wordsRef.current[activeIdxRef.current].slovak,
      attemptsRef.current >= 1
    );
    setLastScore(Math.round(score * 100));
    const next = attemptsRef.current + 1;
    setAttempts(next);

    if (score >= 0.6) {
      // Earned pass — 80+ gets the native celebration, 60–79 a solid "great job"
      const icon = score >= 0.8 ? '🌟' : '💪';
      setBadges(prev => new Map(prev).set(activeIdxRef.current, icon));
      setStatus(score >= 0.8 ? 'pass_native' : 'pass_good');
      window.setTimeout(() => advance(), 2_300);
    } else if (next >= MAX_ATTEMPTS) {
      // No-fail floor: they spoke twice — that's what counts. Pass with 👍.
      setBadges(prev => new Map(prev).set(activeIdxRef.current, '👍'));
      setStatus('effort_pass');
      window.setTimeout(() => advance(), 2_500);
    } else {
      // Encouraging retry, banded by how close they were
      setStatus(score >= 0.3 ? 'retry_close' : 'retry_unclear');
      window.setTimeout(() => setStatus('idle'), 2_500);
    }
  }, [advance, stopRecognition]);

  // Recognizer produced no transcript: silence or a recognizer failure.
  // Gentle retry, then a neutral skip — never a fail, never an error screen.
  const handleNoSpeech = useCallback((session: number) => {
    if (session !== sessionRef.current) return;
    if (hasResultRef.current) return;
    hasResultRef.current = true;
    clearSafety();
    stopRecognition();
    setLastScore(null);
    const next = attemptsRef.current + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setBadges(prev => new Map(prev).set(activeIdxRef.current, '🔃'));
      setStatus('silent_skip');
      window.setTimeout(() => advance(), 2_200);
    } else {
      setStatus('silent_retry');
      window.setTimeout(() => setStatus('idle'), 2_200);
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
    // Interim results arrive WHILE the user speaks — they double as proof of
    // speech and as scoreable text when the final result never lands (slow
    // service, cutoff, flaky connection).
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    hasResultRef.current = false;
    const session = ++sessionRef.current;
    let interimText = '';

    // Called when recognition ends without a final result: score whatever
    // interim text we heard rather than falsely claiming silence.
    const finishWithoutFinal = () => {
      if (interimText.trim()) handleTranscripts([interimText], session);
      else handleNoSpeech(session);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const finals: string[] = [];
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          for (let j = 0; j < res.length; j++) finals.push(res[j].transcript);
        } else {
          interim += res[0]?.transcript ?? '';
        }
      }
      if (interim.trim()) interimText = interim;
      if (finals.length > 0) handleTranscripts(finals, session);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
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
        // no-speech, aborted, network, audio-capture, service errors — score
        // any interim speech we caught; only true silence takes the gentle
        // "couldn't hear you" path. Never an error screen.
        finishWithoutFinal();
      }
    };

    rec.onend = () => {
      if (!hasResultRef.current) finishWithoutFinal();
    };

    recognitionRef.current = recognition;
    rec.start();
    setMicPermission('unknown');
    setStatus('recording');

    // Longer phrases get more speaking time before the safety cutoff
    const nWords = wordsRef.current[activeIdxRef.current].slovak.split(/\s+/).length;
    const timeoutMs = Math.min(SAFETY_TIMEOUT_MS + 700 * (nWords - 1), 12_000);
    safetyTimerRef.current = window.setTimeout(() => {
      if (!hasResultRef.current) { stopRecognition(); finishWithoutFinal(); }
    }, timeoutMs);
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
  // Amber "keep going" states — never rendered as failure
  const isRetry = status === 'retry_close' || status === 'retry_unclear' || status === 'silent_retry';
  const isSettled = status === 'pass_native' || status === 'pass_good' || status === 'effort_pass' || status === 'silent_skip';
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const prompt =
    isRecording                ? 'Listening...' :
    status === 'pass_native'   ? '🌟 Like a native!' :
    status === 'pass_good'     ? '💪 Great job — that\'s good Slovak!' :
    status === 'effort_pass'   ? '👍 Great effort! Moving on!' :
    status === 'retry_close'   ? '🤏 Close enough — let\'s try it again!' :
    status === 'retry_unclear' ? '🤔 Hmm, that wasn\'t clear. One more time!' :
    status === 'silent_retry'  ? '👂 We couldn\'t hear you — speak up a little!' :
    status === 'silent_skip'   ? '🔃 No sound came through — moving on!' :
    status === 'mic_error'     ? 'Mic not available — tap "Can\'t speak?"' :
    micPermission === 'blocked' ? 'Microphone blocked — enable it in browser settings if you are using the browser or App settings if you have downloaded as app.' :
    micPermission === 'denied'  ? 'Tap the mic to allow microphone access.' :
    'Tap the mic and say the highlighted word!';

  const scoreColor =
    lastScore === null ? '' :
    lastScore >= 60 ? 'bg-green-100 text-green-700 border-green-300' :
    lastScore >= 30 ? 'bg-amber-100 text-amber-700 border-amber-300' :
    'bg-gray-100 text-gray-500 border-gray-300';

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

      {/* Pronunciation score chip — makes retrying feel like chasing a high score */}
      {lastScore !== null && (
        <div className="flex justify-center flex-none">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${scoreColor}`}>
            Your pronunciation: {lastScore}%
          </span>
        </div>
      )}

      {/* 6 tiles — 2 columns × 3 rows */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {words.map((word, idx) => {
          const isActive = idx === activeIdx;
          const isPassing = isActive && isSettled;
          const isRetrying = isActive && isRetry;
          const isPassed = badges.has(idx);
          const marker = badges.has(idx) ? ` ${badges.get(idx)}` : '';
          // Transient icon on the active tile while a retry message is showing
          const retryIcon =
            status === 'retry_close'   ? ' 🤏' :
            status === 'retry_unclear' ? ' 🤔' :
            status === 'silent_retry'  ? ' 👂' : '';

          return (
            <div
              key={idx}
              className={[
                'flex flex-col items-center justify-center rounded-2xl border-2 py-3 px-2 text-center transition-all duration-200 select-none',
                isPassing
                  ? 'border-green-400 bg-green-50'
                  : isPassed
                  ? 'border-green-300 bg-green-50/50'
                  : isRetrying
                  ? 'border-amber-400 bg-amber-50'
                  : isActive
                  ? 'border-brand-blue bg-white shadow-md'
                  : 'border-gray-200 bg-white opacity-60',
                isActive && status === 'idle' ? 'animate-pulse' : '',
              ].filter(Boolean).join(' ')}
            >
              <span className={[
                'text-base font-bold',
                isPassing || isPassed ? 'text-green-700' :
                isRetrying ? 'text-amber-600' :
                isActive ? 'text-brand-blue' :
                'text-gray-700',
              ].join(' ')}>
                {word.slovak}
                {isPassing && marker}
                {isPassed && !isActive && marker}
                {isRetrying && retryIcon}
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
          disabled={isSettled || isRetry || micPermission === 'blocked'}
          className={[
            'w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer',
            isRecording
              ? 'bg-red-500 animate-pulse'
              : isSettled
              ? 'bg-green-400 cursor-not-allowed'
              : isRetry
              ? 'bg-amber-400 cursor-not-allowed'
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
