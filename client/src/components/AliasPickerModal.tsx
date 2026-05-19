import { useState, useMemo } from 'react';
import { BASE_ALIASES } from '../data/aliases';
import { changeAlias, getAvatarUrl } from '../lib/supabase/aliasUtils';

// ── Confetti (same pattern as WeeklyWinnerModal) ──────────────────────────────

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

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * 360 + Math.random() * 10;
      const dist = 55 + Math.random() * 90;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        dx: Math.cos(rad) * dist,
        dy: Math.sin(rad) * dist,
        size: 5 + Math.random() * 5,
        round: Math.random() > 0.5,
        delay: Math.random() * 0.3,
      };
    }), [],
  );

  return (
    <div className="pointer-events-none" style={{ position: 'absolute', left: '50%', top: '35%', overflow: 'visible' }}>
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

// ── Welcome overlay ───────────────────────────────────────────────────────────

function WelcomeOverlay({ alias, onContinue }: { alias: string; onContinue: () => void }) {
  const base = alias.replace(/_\d+$/, '');
  const avatarSrc = `/pp/${base}.png`;

  return (
    <div className="fixed inset-0 z-[90] bg-black/90 flex flex-col items-center justify-center px-6">
      <style>{ANIMATIONS}</style>
      <Confetti />

      <img
        src="/SnailSuperExcited.png"
        alt="Excited snail"
        style={{ height: 110, width: 'auto', objectFit: 'contain', marginBottom: 16 }}
      />

      <img
        src={avatarSrc}
        alt={alias}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '3px solid #FFD700',
          marginBottom: 12,
          boxShadow: '0 0 20px #FFD70060',
        }}
      />

      <h2
        className="text-2xl font-black text-center leading-snug mb-3"
        style={{
          color: '#FFD700',
          textShadow: '0 0 20px #FFD70060',
          animation: 'fade-in-up 0.5s ease-out both',
        }}
      >
        Welcome, {alias}! 🎉
      </h2>

      <p
        className="text-sm text-white/70 text-center leading-relaxed max-w-xs mb-8"
        style={{ animation: 'fade-in-up 0.5s 0.1s ease-out both' }}
      >
        This is your displayed Alias in the Slovak for Foreigners community. Other users will see you as{' '}
        <span className="font-bold text-white">{alias}</span>.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="bg-brand-green text-white font-extrabold text-base px-10 py-3 rounded-2xl shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
        style={{ animation: 'fade-in-up 0.5s 0.2s ease-out both' }}
      >
        Let's go!
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface AliasPickerModalProps {
  userId: string;
  onDone: (alias: string) => void;
}

export function AliasPickerModal({ userId, onDone }: AliasPickerModalProps) {
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [welcomeAlias, setWelcomeAlias] = useState<string | null>(null);

  async function handlePick(base: string) {
    if (picking) return;
    setPicking(base);
    setError(null);

    const result = await changeAlias(userId, base);

    if (result.success) {
      setPicking(null);
      setWelcomeAlias(result.alias);
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.');
      setPicking(null);
    }
  }

  if (welcomeAlias) {
    return (
      <WelcomeOverlay
        alias={welcomeAlias}
        onContinue={() => { playCheer(); onDone(welcomeAlias); }}
      />
    );
  }

  return (
    // No onClick on backdrop — cannot dismiss by tapping outside
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-end justify-center px-0 pb-0">
      <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header — no close button */}
        <div className="px-5 pt-6 pb-3 text-center border-b border-gray-100 flex-none">
          <h2 className="text-lg font-extrabold text-gray-800">Choose Your Alias</h2>
          <p className="text-xs text-gray-400 mt-1 leading-snug">
            To keep our Users privacy, your Alias is what other users will see
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-500 font-semibold text-center px-5 py-2 flex-none">
            {error}
          </p>
        )}

        {/* Alias grid */}
        <div className="grid grid-cols-2 gap-3 p-4 overflow-y-auto">
          {BASE_ALIASES.map((base) => {
            const isLoading = picking === base;
            const isDisabled = picking !== null && !isLoading;
            return (
              <button
                key={base}
                type="button"
                disabled={isDisabled}
                onClick={() => handlePick(base)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all cursor-pointer active:scale-[0.97]
                  ${isLoading ? 'border-brand-green bg-green-50' : 'border-gray-100 hover:border-amber-300 hover:bg-amber-50'}
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="relative w-14 h-14 flex-none">
                  <img
                    src={getAvatarUrl(base)}
                    alt={base}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                      <span className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-700 leading-tight text-center">{base}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
