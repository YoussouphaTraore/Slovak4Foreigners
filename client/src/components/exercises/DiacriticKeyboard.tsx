import { useState, useRef, useEffect, useCallback } from 'react';

type TextInputEl = HTMLInputElement | HTMLTextAreaElement;

interface Props {
  targetRef: React.RefObject<TextInputEl | null>;
  onChange: (newValue: string) => void;
}

const ACCENTS: Record<string, string[]> = {
  a: ['á', 'ä'],
  c: ['č'],
  d: ['ď', 'dž', 'dz'],
  e: ['é'],
  i: ['í'],
  l: ['ľ', 'ĺ'],
  n: ['ň'],
  o: ['ó', 'ô'],
  r: ['ŕ'],
  s: ['š'],
  t: ['ť'],
  u: ['ú'],
  y: ['ý'],
  z: ['ž'],
};

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

interface PopupState {
  variants: string[];
  cx: number;
  top: number;
}

const HOLD_DELAY = 380;

export function DiacriticKeyboard({ targetRef, onChange }: Props) {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const popupRef = useRef<PopupState | null>(null);
  const highlightedRef = useRef<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  popupRef.current = popup;
  highlightedRef.current = highlighted;

  const insertChar = useCallback((char: string) => {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newVal = el.value.slice(0, start) + char + el.value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    });
  }, [targetRef, onChange]);

  const handleBackspace = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (start !== end) {
      const nv = el.value.slice(0, start) + el.value.slice(end);
      onChange(nv);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start, start); });
    } else if (start > 0) {
      const nv = el.value.slice(0, start - 1) + el.value.slice(start);
      onChange(nv);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start - 1, start - 1); });
    }
  }, [targetRef, onChange]);

  const clearHold = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  };

  const closePopup = useCallback(() => {
    setPopup(null);
    setHighlighted(null);
    didLongPress.current = false;
  }, []);

  const updateHighlight = useCallback((x: number, y: number) => {
    if (!popupRef.current) return;
    const el = document.elementFromPoint(x, y);
    const v = el?.closest('[data-variant]')?.getAttribute('data-variant') ?? null;
    if (v !== highlightedRef.current) setHighlighted(v);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const onMove = (e: PointerEvent) => updateHighlight(e.clientX, e.clientY);
    const onUp = (e: PointerEvent) => {
      const v = highlightedRef.current
        ?? document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-variant]')?.getAttribute('data-variant')
        ?? null;
      if (v) insertChar(v);
      closePopup();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [popup, updateHighlight, insertChar, closePopup]);

  const onKeyDown = (char: string, e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    clearHold();
    didLongPress.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    const variants = ACCENTS[char];
    if (!variants?.length) return;
    holdTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPopup({ variants, cx: rect.left + rect.width / 2, top: rect.top });
      setHighlighted(null);
    }, HOLD_DELAY);
  };

  const onKeyUp = (char: string) => {
    clearHold();
    if (popup) return;
    if (!didLongPress.current) insertChar(char);
  };

  const btn =
    'relative flex items-center justify-center rounded-md font-semibold select-none cursor-pointer active:scale-90 transition-transform duration-75 touch-none bg-white shadow-sm border border-gray-200 text-gray-800';

  return (
    <>
      {popup && (
        <div
          className="fixed z-50 flex gap-1 bg-white rounded-2xl shadow-2xl border border-gray-200 px-2 py-2"
          style={{
            left: Math.max(8, Math.min(popup.cx - (popup.variants.length * 48) / 2, window.innerWidth - popup.variants.length * 48 - 8)),
            top: popup.top - 64,
          }}
        >
          <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45" aria-hidden />
          {popup.variants.map((v) => (
            <button
              key={v}
              data-variant={v}
              type="button"
              className={`w-10 h-10 rounded-xl text-base font-bold cursor-pointer transition-colors ${
                highlighted === v ? 'bg-brand-blue text-white' : 'text-gray-800 hover:bg-blue-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      <div className="bg-gray-100 rounded-xl px-1.5 pt-1.5 pb-2">
        <div className="flex flex-col gap-0.5">
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-0.5 justify-center">
              {row.map((char) => (
                <button
                  key={char}
                  type="button"
                  onPointerDown={(e) => onKeyDown(char, e)}
                  onPointerUp={() => onKeyUp(char)}
                  onPointerCancel={closePopup}
                  className={`${btn} flex-1 max-w-[38px] h-9 text-sm`}
                >
                  {char.toUpperCase()}
                  {ACCENTS[char] && (
                    <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-brand-blue opacity-70" />
                  )}
                </button>
              ))}
            </div>
          ))}

          <div className="flex gap-0.5 justify-center mt-0.5">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); insertChar(' '); }}
              className={`${btn} h-9 flex-1 text-xs text-gray-400 tracking-widest`}
            >
              SPACE
            </button>
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); handleBackspace(); }}
              className={`${btn} h-9 w-14 text-base`}
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
