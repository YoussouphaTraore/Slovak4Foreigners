import { useEffect } from 'react';

function playCelebrationSound() {
  try {
    const ctx = new AudioContext();
    // Ascending 4-note chime: C5 E5 G5 C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (_) {
    // AudioContext blocked or unavailable — silent fallback
  }
}

const PARTICLES: { emoji: string; style: React.CSSProperties }[] = [
  { emoji: '⭐', style: { top: '12%',  left: '10%',  animationDelay: '0ms',   animationDuration: '1.1s' } },
  { emoji: '✨', style: { top: '18%',  right: '12%', animationDelay: '80ms',  animationDuration: '0.95s' } },
  { emoji: '🎉', style: { top: '62%',  left: '7%',   animationDelay: '40ms',  animationDuration: '1.0s' } },
  { emoji: '⭐', style: { top: '58%',  right: '9%',  animationDelay: '130ms', animationDuration: '1.05s' } },
  { emoji: '✨', style: { top: '38%',  left: '4%',   animationDelay: '20ms',  animationDuration: '1.15s' } },
  { emoji: '🎊', style: { top: '32%',  right: '4%',  animationDelay: '110ms', animationDuration: '0.9s' } },
  { emoji: '⭐', style: { top: '80%',  left: '30%',  animationDelay: '60ms',  animationDuration: '1.0s' } },
  { emoji: '✨', style: { top: '78%',  right: '28%', animationDelay: '90ms',  animationDuration: '1.1s' } },
];

interface Props {
  onDone: () => void;
}

export function ExerciseCelebration({ onDone }: Props) {
  useEffect(() => {
    playCelebrationSound();
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(3px)' }}
    >
      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute text-3xl pointer-events-none animate-particle-float"
          style={p.style}
        >
          {p.emoji}
        </span>
      ))}

      {/* Card */}
      <div
        className="bg-white rounded-3xl px-10 py-7 text-center shadow-2xl animate-celebrate-pop"
      >
        <img
          src="/snailExcited.png"
          alt=""
          className="w-24 h-24 object-contain mx-auto mb-2 animate-bounce-once"
          style={{ animationDelay: '300ms' }}
        />
        <p className="text-2xl font-extrabold text-gray-800 mt-1">Good Job!</p>
        <p className="text-sm text-gray-400 mt-1">Keep going!</p>
      </div>
    </div>
  );
}
