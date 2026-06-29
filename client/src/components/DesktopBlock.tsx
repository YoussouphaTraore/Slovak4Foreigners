import { useState } from 'react';

export const isMobile =
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
  window.matchMedia('(max-width: 768px)').matches;

export function DesktopBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (isMobile || dismissed) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-3 flex-none">
      <span className="text-lg flex-none">📱</span>
      <p className="text-sm text-amber-800 font-medium flex-1 leading-snug">
        This app is designed for mobile. For the best experience, open{' '}
        <span className="font-bold">slovakforforeigners.eu</span> on your phone.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex-none text-xs font-bold text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
      >
        Continue anyway
      </button>
    </div>
  );
}
