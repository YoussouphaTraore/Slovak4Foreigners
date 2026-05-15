interface Props {
  xp: number;
  streakMultiplier?: number;
}

export function XpBadge({ xp, streakMultiplier = 1.0 }: Props) {
  return (
    <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 font-bold px-3 py-1.5 rounded-full text-xs">
      <span>⚡</span>
      <span>{xp} XP</span>
      {streakMultiplier > 1.0 && (
        <span className="text-orange-500">
          {streakMultiplier % 1 === 0 ? streakMultiplier.toFixed(0) : streakMultiplier.toFixed(1)}×
        </span>
      )}
    </div>
  );
}
