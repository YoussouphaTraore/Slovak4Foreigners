interface Props {
  streak: number;
}

export function StreakDisplay({ streak }: Props) {
  return (
    <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 font-bold px-3 py-1.5 rounded-full text-xs">
      <span>🔥</span>
      <span>{streak} Day Streak</span>
    </div>
  );
}
