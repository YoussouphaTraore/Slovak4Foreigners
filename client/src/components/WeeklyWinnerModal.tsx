import { useState } from 'react';

const ANIMATIONS = `
@keyframes confetti-burst {
  0%   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
  100% { transform: translate(var(--cdx), var(--cdy)) scale(0.3) rotate(180deg); opacity: 0; }
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C94', '#45B7D1'];

export interface WeeklyWinnerModalProps {
  winnerAlias: string;
  winnerAvatar: string;
  winnerXp: number;
  isCurrentUser: boolean;
  onDismiss: () => void;
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * 360 + Math.random() * 9;
      const dist = 60 + Math.random() * 100;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
        size: 5 + Math.random() * 5,
        round: Math.random() > 0.5,
        delay: Math.random() * 0.35,
      };
    }),
  );

  return (
    <div
      className="pointer-events-none"
      style={{ position: 'absolute', left: '50%', top: '38%', overflow: 'visible' }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : '2px',
            backgroundColor: p.color,
            '--cdx': `${p.dx}px`,
            '--cdy': `${p.dy}px`,
            animation: `confetti-burst 1.2s ${p.delay}s ease-out both`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Sound ─────────────────────────────────────────────────────────────────────

function playCheer() {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    const notes: { freq: number; t: number; dur: number; type: OscillatorType }[] = [
      { freq: 523.25, t: 0.00, dur: 0.18, type: 'triangle' },
      { freq: 659.25, t: 0.09, dur: 0.18, type: 'triangle' },
      { freq: 783.99, t: 0.18, dur: 0.18, type: 'triangle' },
      { freq: 1046.50, t: 0.27, dur: 0.55, type: 'sine' },
      { freq: 783.99, t: 0.27, dur: 0.55, type: 'sine' },
    ];

    notes.forEach(({ freq, t, dur, type }) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(master);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0, now + t);
      g.gain.linearRampToValueAtTime(1, now + t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + dur);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.05);
    });
  } catch { /* browser may block AudioContext before user gesture */ }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function WeeklyWinnerModal({
  winnerAlias,
  winnerAvatar,
  winnerXp,
  isCurrentUser,
  onDismiss,
}: WeeklyWinnerModalProps) {
  function handleDismiss() {
    playCheer();
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center px-6">
      <style>{ANIMATIONS}</style>

      {/* Confetti — auto-fires on mount */}
      <Confetti />

      {/* Snail mascot */}
      <img
        src="/SnailSuperExcited.png"
        alt="Excited snail"
        style={{ height: 120, width: 'auto', objectFit: 'contain', marginBottom: 16 }}
      />

      {/* Winner avatar */}
      <img
        src={winnerAvatar}
        alt={winnerAlias}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid #FFD700',
          marginBottom: 10,
          boxShadow: '0 0 20px #FFD70060',
        }}
      />

      {/* Alias */}
      <p
        className="text-base font-bold text-white/80 mb-4"
        style={{ animation: 'fade-in-up 0.5s ease-out both' }}
      >
        {winnerAlias}
      </p>

      {/* Title */}
      <h2
        className="text-2xl font-black text-center leading-snug mb-3"
        style={{
          color: '#FFD700',
          textShadow: '0 0 20px #FFD70060',
          animation: 'fade-in-up 0.5s 0.1s ease-out both',
        }}
      >
        {isCurrentUser ? 'You won this week! 🏆' : 'We have a winner! 🏆'}
      </h2>

      {/* Body text */}
      <p
        className="text-sm text-white/70 text-center leading-relaxed max-w-xs mb-8"
        style={{ animation: 'fade-in-up 0.5s 0.2s ease-out both' }}
      >
        {isCurrentUser
          ? `You were #1 on the leaderboard last week with ${winnerXp.toLocaleString()} XP. The Slovak for Foreigners community sent their CONGRATS to you! 🐌`
          : `${winnerAlias} won this week's leaderboard with ${winnerXp.toLocaleString()} XP! Send your congratulations! 🐌`}
      </p>

      {/* Action button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="bg-brand-green text-white font-extrabold text-base px-10 py-3 rounded-2xl shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
        style={{ animation: 'fade-in-up 0.5s 0.3s ease-out both' }}
      >
        {isCurrentUser ? 'Collect your glory ✨' : 'Congrats! 🎉'}
      </button>
    </div>
  );
}
