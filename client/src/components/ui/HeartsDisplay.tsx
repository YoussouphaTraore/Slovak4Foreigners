interface Props {
  hearts: number;
  max?: number;
}

export function HeartsDisplay({ hearts, max = 3 }: Props) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`text-xl transition-all duration-300 ${i < hearts ? 'opacity-100' : 'opacity-20 grayscale'}`}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}
