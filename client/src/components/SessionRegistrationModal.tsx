import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useProgressStore } from '../store/useProgressStore';
import { insertSessionRegistration } from '../lib/supabase/progressSync';

type Screen = 'guest' | 'form' | 'success';

interface Props {
  onClose: () => void;
}

export function SessionRegistrationModal({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isSessionRegistered = useProgressStore((s) => s.isSessionRegistered);
  const setIsSessionRegistered = useProgressStore((s) => s.setIsSessionRegistered);

  const initialScreen = (): Screen => {
    if (!user) return 'guest';
    if (isSessionRegistered) return 'success';
    return 'form';
  };

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [justRegistered, setJustRegistered] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name from Google metadata when user is available
  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const displayName =
      (meta.display_name as string | undefined) ??
      (meta.full_name as string | undefined) ??
      (meta.name as string | undefined) ??
      '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(displayName);
    // If we were on the guest screen and user just signed in, advance
    setScreen((prev) => {
      if (prev === 'guest') return isSessionRegistered ? 'success' : 'form';
      return prev;
    });
  }, [user, isSessionRegistered]);

  const handleSignIn = () => {
    // Store flag so HomePage can re-open modal after OAuth redirect
    try { sessionStorage.setItem('openSessionModal', 'true'); } catch { /* */ }
    signInWithGoogle();
  };

  const handleSubmit = async () => {
    if (!user) return;
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Please enter your name.'); return; }
    setError('');
    setSubmitting(true);
    const { error: submitError } = await insertSessionRegistration(
      user.id,
      trimmedName,
      user.email ?? '',
      phone.trim() || null,
    );
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
    ? 'Your registration has been recorded. We will contact you once our next Physical Session is planned.'
    : "You're already registered! We will contact you once our next Physical Session is planned.";

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
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer leading-none">✕</button>
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

        {/* ── State 2: Registration form ───────────────────────────────────── */}
        {screen === 'form' && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-extrabold text-gray-800">Join Our Physical Session</h2>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer leading-none">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Register your interest and we'll reach out when the next session is planned.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={user?.email ?? ''}
                  readOnly
                  className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+421 or your local number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-5 w-full bg-amber-400 text-white font-bold py-3 rounded-xl hover:bg-amber-500 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Registering…' : 'Register Interest'}
            </button>
          </div>
        )}

        {/* ── State 3: Success / already registered ───────────────────────── */}
        {screen === 'success' && (
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <button type="button" onClick={onClose} className="self-end text-gray-400 hover:text-gray-600 text-xl cursor-pointer leading-none -mb-2">✕</button>
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
