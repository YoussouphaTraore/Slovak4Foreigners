import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useProgressStore } from '../store/useProgressStore';
import { insertSessionRegistration } from '../lib/supabase/progressSync';
import { getAvatarUrl } from '../lib/supabase/aliasUtils';

type Screen = 'guest' | 'confirm' | 'success';

interface Props {
  onClose: () => void;
}

export function SessionRegistrationModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const alias = useAuthStore((s) => s.alias);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isSessionRegistered = useProgressStore((s) => s.isSessionRegistered);
  const setIsSessionRegistered = useProgressStore((s) => s.setIsSessionRegistered);

  const initialScreen = (): Screen => {
    if (!user) return 'guest';
    if (isSessionRegistered) return 'success';
    return 'confirm';
  };

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [justRegistered, setJustRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Advance past the guest screen once the user signs in (e.g. after the OAuth
  // redirect reopens this modal).
  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScreen((prev) => (prev === 'guest' ? (isSessionRegistered ? 'success' : 'confirm') : prev));
  }, [user, isSessionRegistered]);

  const handleSignIn = () => {
    // Remember to reopen this modal after the OAuth redirect + onboarding
    try { sessionStorage.setItem('openSessionModal', 'true'); } catch { /* */ }
    signInWithGoogle();
  };

  const handleRegister = async () => {
    if (!user) return;
    setError('');
    setSubmitting(true);
    const { error: submitError } = await insertSessionRegistration(user.id);
    setSubmitting(false);
    if (submitError) {
      setError('Something went wrong. Please try again.');
      return;
    }
    setIsSessionRegistered(true);
    setJustRegistered(true);
    setScreen('success');
  };

  const successMessage = justRegistered
    ? 'Your registration has been recorded. We will contact you by email once our next Physical Session is planned.'
    : "You're already registered! We will contact you by email once our next Physical Session is planned.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── State 1: Guest ───────────────────────────────────────────────── */}
        {screen === 'guest' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-lg font-extrabold text-gray-800">Join Our Physical Session</h2>
              <button type="button" onClick={onClose} className="text-gray-600 hover:text-gray-600 text-xl cursor-pointer leading-none">✕</button>
            </div>
            <div className="flex flex-col items-center gap-5 py-2 text-center">
              <img src="/snailReading.png" alt="" className="w-20 h-20 object-contain" />
              <p className="text-sm text-gray-600 leading-relaxed">
                Sign in to register your interest in our upcoming Slovak practice sessions.
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-3 font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
              >
                <span className="text-base">🔑</span>
                Continue with Google
              </button>
            </div>
          </div>
        )}

        {/* ── State 2: One-tap confirmation (no form, no data collection) ───── */}
        {screen === 'confirm' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-extrabold text-gray-800">Join Our Physical Session</h2>
              <button type="button" onClick={onClose} className="text-gray-600 hover:text-gray-600 text-xl cursor-pointer leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Register your interest and we'll email you when the next session is planned.
            </p>

            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-5">
              <img
                src={alias ? getAvatarUrl(alias) : '/pp/FrogySnail.png'}
                alt=""
                className="w-11 h-11 rounded-full object-cover flex-none"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{alias || 'Your account'}</p>
                <p className="text-xs text-gray-600 truncate">{user?.email ?? ''}</p>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <button
              type="button"
              onClick={handleRegister}
              disabled={submitting}
              className="w-full bg-amber-400 text-white font-bold py-3 rounded-xl hover:bg-amber-500 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Registering…' : 'Register Interest'}
            </button>
          </div>
        )}

        {/* ── State 3: Success / already registered ───────────────────────── */}
        {screen === 'success' && (
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <button type="button" onClick={onClose} className="self-end text-gray-600 hover:text-gray-600 text-xl cursor-pointer leading-none -mb-2">✕</button>
            <img src="/snailExcited.png" alt="" className="w-24 h-24 object-contain" />
            <h2 className="text-lg font-extrabold text-gray-800">
              {justRegistered ? 'You\'re all set! 🎉' : 'Already registered! 🎉'}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">{successMessage}</p>
            <button
              type="button"
              onClick={onClose}
              className="bg-brand-green text-white font-bold py-3 px-10 rounded-xl hover:opacity-90 active:scale-[0.98] cursor-pointer transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
