import { useRef, useState } from 'react';

interface Props {
  isIOS?: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallSheet({ isIOS, onInstall, onDismiss }: Props) {
  const tapCountRef = useRef(0);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  const handleBackdropTap = () => {
    tapCountRef.current += 1;
    if (tapCountRef.current >= 3) onDismiss();
  };

  const handleInstall = () => {
    if (isIOS) {
      setShowIOSSteps(true);
    } else {
      onInstall();
    }
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

        {showIOSSteps ? (
          <>
            <p className="text-sm text-gray-500 text-center mb-5">
              Follow these steps to add to your Home Screen
            </p>
            <ol className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <span className="font-bold text-brand-green shrink-0">1.</span>
                <span>
                  Tap the{' '}
                  <svg className="inline w-4 h-4 text-blue-500 mb-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>{' '}
                  <strong>Share</strong> button at the bottom of Safari
                </span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <span className="font-bold text-brand-green shrink-0">2.</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <span className="font-bold text-brand-green shrink-0">3.</span>
                <span>Tap <strong>Add</strong> in the top-right corner</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 text-center mb-6">
              Download the App for the best experience 📲
            </p>
            <button
              type="button"
              onClick={handleInstall}
              className="w-full bg-brand-green text-white font-bold py-3 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Install
            </button>
          </>
        )}
      </div>
    </div>
  );
}
