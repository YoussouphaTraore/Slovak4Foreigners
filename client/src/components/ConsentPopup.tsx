import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const CONSENT_VERSION = '1.0';
const KEY_ACCEPTED = 'consentAccepted';
const KEY_VERSION = 'consentVersion';
const KEY_DATE = 'consentDate';
const KEY_LAST_SHOWN = 'lastConsentShown';
const MS_24H = 24 * 60 * 60 * 1000;
const LEGAL_PATHS = ['/terms', '/privacy'];

function shouldShow(isLoggedIn: boolean): boolean {
  try {
    const accepted = localStorage.getItem(KEY_ACCEPTED) === 'true';
    const version = localStorage.getItem(KEY_VERSION);
    if (!accepted || version !== CONSENT_VERSION) return true;
    if (isLoggedIn) return false;
    const last = Number(localStorage.getItem(KEY_LAST_SHOWN) ?? '0');
    return Date.now() - last >= MS_24H;
  } catch {
    return true;
  }
}

export function ConsentPopup() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;
    setVisible(shouldShow(!!user));
  }, [isInitialized, user]);

  if (!visible) return null;

  const isLegalPage = LEGAL_PATHS.includes(pathname);

  const handleAccept = () => {
    try {
      const now = String(Date.now());
      localStorage.setItem(KEY_ACCEPTED, 'true');
      localStorage.setItem(KEY_VERSION, CONSENT_VERSION);
      localStorage.setItem(KEY_DATE, now);
      if (!user) localStorage.setItem(KEY_LAST_SHOWN, now);
    } catch { /* */ }
    setVisible(false);
  };

  // ── Mini bar — shown on /terms and /privacy so user can read freely ──────────
  if (isLegalPage) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[200] px-4 pb-5 pointer-events-none">
        <div
          className="max-w-sm mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 px-4 py-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="flex items-start gap-3 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-5 h-5 flex-none cursor-pointer accent-green-600"
            />
            <span className="text-sm text-gray-600 leading-snug">
              I have read and agree to the Terms of Service and Privacy Policy
            </span>
          </label>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!checked}
            className={`w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
              checked
                ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Accept &amp; Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Full blocking modal — shown on all other pages ───────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70">
      <div
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center mb-5">
          <img src="/snail.png" alt="" className="w-16 h-16 object-contain mb-3" />
          <h2 className="text-xl font-extrabold text-gray-800 text-center">Before you continue</h2>
        </div>

        <p className="text-sm text-gray-500 text-center leading-relaxed mb-5">
          By using Slovak for Foreigners you agree to our{' '}
          <button
            type="button"
            onClick={() => navigate('/terms')}
            className="text-brand-green font-semibold underline cursor-pointer"
          >
            Terms of Service
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="text-brand-green font-semibold underline cursor-pointer"
          >
            Privacy Policy
          </button>
          . Please read them before continuing.
        </p>

        <label className="flex items-start gap-3 mb-5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-5 h-5 flex-none cursor-pointer accent-green-600"
          />
          <span className="text-sm text-gray-600 leading-snug">
            I have read and agree to the Terms of Service and Privacy Policy
          </span>
        </label>

        <button
          type="button"
          onClick={handleAccept}
          disabled={!checked}
          className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
            checked
              ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Accept &amp; Continue
        </button>
      </div>
    </div>
  );
}
