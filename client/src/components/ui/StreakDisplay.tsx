interface Props {
  streak: number;
}

export function StreakDisplay({ streak }: Props) {
  return (
    <div className="flex items-center gap-1 bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full text-sm">
      <span>🔥</span>
      <span>{streak}</span>
    </div>
  );
}
