interface Props {
  xp: number;
}

export function XpBadge({ xp }: Props) {
  return (
    <div className="flex items-center gap-1 bg-amber-100 text-amber-700 font-bold px-3 py-1 rounded-full text-sm">
      <span>⚡</span>
      <span>{xp} XP</span>
    </div>
  );
}
