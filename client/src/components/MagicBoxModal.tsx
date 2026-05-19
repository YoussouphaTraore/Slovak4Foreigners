import { useState, useMemo } from 'react';

// ── CSS animations ─────────────────────────────────────────────────────────────

const ANIMATIONS = `
@keyframes bob {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-8px); }
}
@keyframes lid-fly {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-80px) rotate(20deg); opacity: 0; }
}
@keyframes xp-burst {
  0%   { transform: translateY(0) scale(0.4); opacity: 0; }
  25%  { transform: translateY(-12px) scale(1.3); opacity: 1; }
  100% { transform: translateY(-40px) scale(1); opacity: 0; }
}
@keyframes confetti-burst {
  0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--cdx), var(--cdy)) scale(0.3) rotate(180deg); opacity: 0; }
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 16px var(--glow), 0 0 32px var(--glow); }
  50%       { box-shadow: 0 0 24px var(--glow), 0 0 48px var(--glow); }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────────

interface BoxConfig {
  boxColor: string;
  lidColor: string;
  glowColor: string;
  snailEmoji: string;
}

const BOXES: BoxConfig[] = [
  { boxColor: '#D4A017', lidColor: '#F5C842', glowColor: '#FFD70080', snailEmoji: '🐌' },
  { boxColor: '#909090', lidColor: '#C0C0C0', glowColor: '#C0C0C060', snailEmoji: '🐌' },
  { boxColor: '#A05A28', lidColor: '#CD7F32', glowColor: '#CD7F3260', snailEmoji: '🐌' },
];

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C94', '#45B7D1'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 523; // C5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch { /* browser may block AudioContext before user gesture */ }
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 26 }, (_, i) => {
      const angle = (i / 26) * 360 + Math.random() * 14;
      const dist = 45 + Math.random() * 65;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
        size: 4 + Math.random() * 5,
        round: Math.random() > 0.5,
        delay: Math.random() * 0.25,
      };
    }), [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '40%',
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : '2px',
            backgroundColor: p.color,
            '--cdx': `${p.dx}px`,
            '--cdy': `${p.dy}px`,
            animation: `confetti-burst 0.9s ${p.delay}s ease-out both`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Gift box item ─────────────────────────────────────────────────────────────

function GiftBoxItem({
  cfg,
  xp,
  isPicked,
  isAutoRevealed,
  canPick,
  onPick,
}: {
  cfg: BoxConfig;
  xp: number;
  isPicked: boolean;
  isAutoRevealed: boolean;
  canPick: boolean;
  onPick: () => void;
}) {
  const isRevealed = isPicked || isAutoRevealed;

  return (
    <div
      className="relative flex flex-col items-center select-none"
      style={{
        cursor: canPick ? 'pointer' : 'default',
        opacity: isAutoRevealed ? 0.55 : 1,
        transition: 'opacity 0.4s',
        animation: !isRevealed && canPick ? 'bob 2.4s ease-in-out infinite' : 'none',
      }}
      onClick={canPick ? onPick : undefined}
    >
      {/* Snail */}
      <div
        className="text-4xl text-center mb-1 leading-none"
        style={{
          filter: isPicked ? `drop-shadow(0 0 6px ${cfg.lidColor})` : 'none',
          transition: 'filter 0.3s',
        }}
      >
        {cfg.snailEmoji}
      </div>

      {/* Lid */}
      <div
        style={{
          width: 80,
          height: 22,
          borderRadius: '6px 6px 0 0',
          backgroundColor: cfg.lidColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 2,
          animation: isRevealed ? 'lid-fly 0.45s ease-out forwards' : 'none',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>🎀</span>
      </div>

      {/* Box body */}
      <div
        style={{
          width: 80,
          height: 76,
          borderRadius: '0 0 8px 8px',
          backgroundColor: cfg.boxColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
          ...(isPicked ? {
            '--glow': cfg.glowColor,
            animation: 'glow-pulse 1.2s ease-in-out infinite',
            outline: `2px solid ${cfg.lidColor}`,
          } as React.CSSProperties : {}),
        }}
      >
        {/* Ribbon vertical */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 8, backgroundColor: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />

        {/* XP number */}
        {isRevealed && (
          <span
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#fff',
              position: 'relative',
              zIndex: 1,
              animation: 'xp-burst 1.4s ease-out both',
            }}
          >
            +{xp}
          </span>
        )}

        {/* Confetti — only for the picked box */}
        {isPicked && <Confetti />}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function MagicBoxModal({ onClaim }: { onClaim: (xp: number) => void }) {
  const [xpAmounts] = useState<number[]>(() => shuffle([5, 10, 15]));
  const [picked, setPicked] = useState<number | null>(null);
  const [allRevealed, setAllRevealed] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showClose, setShowClose] = useState(false);

  function handlePick(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    playChime();
    setTimeout(() => { setAllRevealed(true); setShowResult(true); }, 1000);
    setTimeout(() => setShowClose(true), 2000);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col items-center justify-center px-6">
      <style>{ANIMATIONS}</style>

      {/* Title */}
      <h2
        className="text-2xl font-black text-center leading-snug mb-2"
        style={{ color: '#FFD700', textShadow: '0 0 20px #FFD70060' }}
      >
        A gift for your dedication! 🐌✨
      </h2>
      <p className="text-sm text-white/60 text-center mb-10">
        Pick a box to reveal your reward
      </p>

      {/* Boxes */}
      <div className="flex gap-7 mb-10">
        {BOXES.map((cfg, i) => (
          <GiftBoxItem
            key={i}
            cfg={cfg}
            xp={xpAmounts[i]}
            isPicked={picked === i}
            isAutoRevealed={allRevealed && picked !== i}
            canPick={picked === null}
            onPick={() => handlePick(i)}
          />
        ))}
      </div>

      {/* Result text */}
      <div className="h-8 flex items-center justify-center">
        {showResult && picked !== null && (
          <p
            className="text-xl font-bold text-white text-center"
            style={{ animation: 'fade-in-up 0.5s ease-out both' }}
          >
            You earned +{xpAmounts[picked]} XP! 🎉
          </p>
        )}
      </div>

      {/* Collect button */}
      <div className="mt-6 h-12 flex items-center justify-center">
        <button
          type="button"
          onClick={() => { if (picked !== null) onClaim(xpAmounts[picked]); }}
          style={{
            opacity: showClose ? 1 : 0,
            pointerEvents: showClose ? 'auto' : 'none',
            transition: 'opacity 0.5s ease-in',
          }}
          className="bg-brand-green text-white font-extrabold text-base px-8 py-3 rounded-2xl shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
        >
          Collect reward ✨
        </button>
      </div>
    </div>
  );
}
