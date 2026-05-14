interface Props {
  message: string;
}

export function MascotSpeech({ message }: Props) {
  return (
    <div className="flex items-center gap-3 flex-none">
      <img
        src="/snail.png"
        alt=""
        className="w-12 h-12 object-contain flex-none drop-shadow-sm"
      />
      <div className="relative bg-white rounded-2xl border-2 border-gray-100 px-3 py-2 shadow-sm flex-1">
        {/* Speech bubble tail pointing left */}
        <span
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: -11, width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '11px solid #e5e7eb' }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: -8, width: 0, height: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderRight: '10px solid white' }}
        />
        <p className="text-sm font-semibold text-gray-700">{message}</p>
      </div>
    </div>
  );
}
