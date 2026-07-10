import { useState, useRef, useMemo } from 'react';
import type { ConversationSentenceBuilderExercise as TExercise, SentenceBuilderItem } from '../../types/conversationSentenceBuilder';

interface Props {
  exercise: TExercise;
  onDone: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Per-sentence slide ────────────────────────────────────────────────────────

interface SlideProps {
  sentence: SentenceBuilderItem;
  sentenceNum: number;
  totalSentences: number;
  onComplete: (correct: boolean) => void;
}

export function SentenceBuildSlide({ sentence, sentenceNum, totalSentences, onComplete }: SlideProps) {
  const shuffledBank = useMemo(
    () => shuffle([...sentence.bankChunks]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [placed, setPlaced] = useState<string[]>([]);
  const [bank, setBank] = useState<string[]>(shuffledBank);
  const [wrongSlots, setWrongSlots] = useState<boolean[] | null>(null);
  const [done, setDone] = useState(false);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const dragState  = useRef<{ index: number; startX: number; startY: number } | null>(null);
  const targetRef  = useRef<number | null>(null);   // avoids stale closure in handlePointerUp
  const rectsRef   = useRef<DOMRect[]>([]);          // tile positions captured at drag start
  const tileRefs   = useRef<(HTMLButtonElement | null)[]>([]);

  const [dragIndex,  setDragIndex]  = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [targetIdx,  setTargetIdx]  = useState<number | null>(null);

  const SLOTS = sentence.targetSk.length;
  const allFilled = placed.length === SLOTS;
  const REMOVE_THRESHOLD = 55;

  // ── Bank tap ────────────────────────────────────────────────────────────────

  const handleBankTap = (chunk: string) => {
    if (placed.length >= SLOTS || done) return;
    setPlaced((prev) => [...prev, chunk]);
    setBank((prev) => {
      const idx = prev.indexOf(chunk);
      return idx < 0 ? prev : [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    setWrongSlots(null);
  };

  // ── Drop-target calculation (uses original rects, no circular dependency) ──

  const computeTarget = (pointerX: number): number => {
    const fromIdx = dragState.current!.index;
    let best = fromIdx;
    let bestDist = Infinity;
    for (let i = 0; i < rectsRef.current.length; i++) {
      if (i === fromIdx) continue;
      const rect = rectsRef.current[i];
      if (!rect) continue;
      const center = rect.left + rect.width / 2;
      const dist = Math.abs(pointerX - center);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  };

  // ── Shift amount for non-dragging tiles ────────────────────────────────────
  // Tiles between fromIdx and targetIdx shift to make room for the dragged tile.

  const getShift = (i: number): number => {
    if (dragIndex === null || targetIdx === null || targetIdx === dragIndex || i === dragIndex) return 0;
    const from = dragIndex;
    const dragWidth = (rectsRef.current[from]?.width ?? 60) + 8; // +gap-2
    if (targetIdx < from && i >= targetIdx && i < from) return  dragWidth;
    if (targetIdx > from && i >  from && i <= targetIdx) return -dragWidth;
    return 0;
  };

  // ── Pointer handlers ────────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    rectsRef.current = tileRefs.current.map((el) => el?.getBoundingClientRect() ?? new DOMRect());
    dragState.current = { index, startX: e.clientX, startY: e.clientY };
    targetRef.current = index;
    setDragIndex(index);
    setDragOffset({ x: 0, y: 0 });
    setTargetIdx(index);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setDragOffset({ x: dx, y: dy });

    // Show reorder preview only when gesture is primarily horizontal
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      const t = computeTarget(e.clientX);
      targetRef.current = t;
      setTargetIdx(t);
    } else {
      targetRef.current = dragState.current.index;
      setTargetIdx(dragState.current.index);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current) return;
    const { index } = dragState.current;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const ti = targetRef.current;

    if (dy > REMOVE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
      // Drag down → remove tile, return to bank
      const chunk = placed[index];
      setPlaced((prev) => prev.filter((_, i) => i !== index));
      setBank((prev) => [...prev, chunk]);
      setWrongSlots(null);
    } else if (ti !== null && ti !== index) {
      // Horizontal drag → swap with target
      setPlaced((prev) => {
        const next = [...prev];
        [next[index], next[ti]] = [next[ti], next[index]];
        return next;
      });
      setWrongSlots(null);
    }

    dragState.current  = null;
    targetRef.current  = null;
    setDragIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setTargetIdx(null);
  };

  const handlePointerCancel = () => {
    dragState.current = null;
    targetRef.current = null;
    setDragIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setTargetIdx(null);
  };

  // ── Verify ──────────────────────────────────────────────────────────────────

  const handleVerify = () => {
    const result = placed.map((chunk, i) => chunk !== sentence.targetSk[i]);
    setWrongSlots(result);
    const correct = result.every((w) => !w);
    onComplete(correct);
    if (correct) setDone(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Counter + error hint */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium">
          Sentence {sentenceNum} of {totalSentences}
        </span>
        {wrongSlots !== null && !done && (
          <span className="text-xs text-brand-red font-semibold">Fix the highlighted words</span>
        )}
      </div>

      {/* English prompt */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm px-5 py-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Say it in Slovak</p>
        <p className="text-base font-bold text-gray-800 leading-snug">{sentence.promptEn}</p>
      </div>

      {/* Placed row — filled tiles + empty slot indicators */}
      <div className="min-h-[56px] flex flex-wrap gap-2 items-center p-3 bg-white/60 rounded-2xl border-2 border-dashed border-gray-300">
        {/* eslint-disable-next-line react-hooks/refs */}
        {placed.map((chunk, i) => {
          const isDragging  = dragIndex === i;
          const isWrong     = wrongSlots?.[i] === true;
          const isGood      = wrongSlots !== null && wrongSlots[i] === false;
          const shift       = getShift(i);

          return (
            <button
              key={`placed-${i}`}
              ref={(el) => { tileRefs.current[i] = el; }}
              type="button"
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              style={{
                transform: isDragging
                  ? `translate(${dragOffset.x}px,${dragOffset.y}px)`
                  : `translateX(${shift}px)`,
                transition: isDragging ? 'none' : 'transform 150ms ease',
                zIndex:     isDragging ? 10 : undefined,
                position:   isDragging ? 'relative' : undefined,
              }}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 touch-none select-none ${
                isDragging
                  ? 'cursor-grabbing shadow-xl scale-105 border-brand-blue bg-blue-100 text-brand-blue'
                  : isWrong
                  ? 'cursor-grab border-brand-red bg-red-50 text-brand-red animate-shake'
                  : isGood
                  ? 'cursor-grab border-brand-green bg-green-50 text-brand-green'
                  : 'cursor-grab border-brand-blue bg-blue-50 text-brand-blue'
              }`}
            >
              {chunk}
            </button>
          );
        })}

        {/* Empty slot indicators */}
        {Array.from({ length: SLOTS - placed.length }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9 w-14 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60" />
        ))}
      </div>

      {/* Bank tiles */}
      <div className="flex flex-wrap gap-2">
        {bank.map((chunk, i) => (
          <button
            key={`bank-${i}-${chunk}`}
            type="button"
            onClick={() => handleBankTap(chunk)}
            disabled={placed.length >= SLOTS || done}
            className="px-3 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {chunk}
          </button>
        ))}
      </div>

      {/* Check / success */}
      {done ? (
        <div className="flex items-center gap-2 bg-green-50 border-2 border-brand-green rounded-2xl px-4 py-3">
          <span className="text-brand-green font-bold text-sm">✓ Correct!</span>
        </div>
      ) : allFilled ? (
        <button
          type="button"
          onClick={handleVerify}
          className="w-full bg-brand-blue text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] shadow-md cursor-pointer transition-all"
        >
          Check
        </button>
      ) : null}
    </div>
  );
}

// ── Top-level exercise ────────────────────────────────────────────────────────

export function ConversationSentenceBuilderExercise({ exercise, onDone, onAnswer }: Props) {
  const [sentenceIdx, setSentenceIdx] = useState(0);

  if (exercise.sentences.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-full rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-6">
            <p className="text-sm font-semibold text-amber-700">Sentence practice coming soon</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-600">
              This topic comprehension lesson is available, but its sentence builder has not been added yet.
            </p>
          </div>
        </div>
        <div className="flex-none pb-1">
          <button
            type="button"
            onClick={() => onDone(true)}
            className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] shadow-md cursor-pointer transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const handleComplete = (correct: boolean) => {
    onAnswer?.(correct);
    if (!correct) return;
    if (sentenceIdx + 1 < exercise.sentences.length) {
      setTimeout(() => setSentenceIdx((i) => i + 1), 1200);
    } else {
      setTimeout(() => onDone(true), 1200);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <SentenceBuildSlide
          key={sentenceIdx}
          sentence={exercise.sentences[sentenceIdx]}
          sentenceNum={sentenceIdx + 1}
          totalSentences={exercise.sentences.length}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
