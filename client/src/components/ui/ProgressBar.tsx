interface Props {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="flex-1 h-4 bg-white/60 rounded-full overflow-hidden border border-white/80">
      <div
        className="h-full bg-brand-green rounded-full transition-all duration-500 shadow-sm"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
