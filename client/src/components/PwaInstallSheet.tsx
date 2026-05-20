import { useRef } from 'react';

interface Props {
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallSheet({ onInstall, onDismiss }: Props) {
  const tapCountRef = useRef(0);

  const handleBackdropTap = () => {
    tapCountRef.current += 1;
    if (tapCountRef.current >= 2) onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40"
      onClick={handleBackdropTap}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl px-6 pt-6 pb-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <img
          src="/icons/icon-192.png"
          alt="Slovak for Foreigners"
          className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-sm"
        />
        <h2 className="text-lg font-extrabold text-gray-800 text-center mb-1">
          Install Slovak for Foreigners
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Download the App for the best experience 📲
        </p>
        <button
          type="button"
          onClick={onInstall}
          className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Install
        </button>
      </div>
    </div>
  );
}
