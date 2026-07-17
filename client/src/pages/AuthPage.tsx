import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

function GoogleIcon() {
  return (
    <span className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-xs font-black text-blue-600 shrink-0">
      G
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { signInWithGoogle, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    // On success the browser navigates away, so this only ever renders when
    // sign-in couldn't start at all — in practice, blocked cookies/site data
    // stopping the PKCE verifier from being stored. (Not pop-ups: this is a
    // full-page redirect.)
    const { error: err } = await signInWithGoogle();
    if (err) setError("Google sign-in couldn't be started. This usually means cookies or site data are blocked for this site — allow them and try again.");
  };

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-lg px-8 py-10 flex flex-col items-center">

        <img src="/snail.png" alt="" className="w-16 h-16 object-contain mb-4" />
        <h1 className="text-xl font-extrabold text-gray-800 text-center leading-tight mb-1">
          Slovak for Foreigners
        </h1>
        <p className="text-sm text-gray-600 text-center mb-8">
          Save your progress. Keep your streak.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full bg-white border-2 border-brand-green text-gray-800 font-bold py-3.5 rounded-xl text-sm cursor-pointer hover:bg-green-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 mb-4"
        >
          {isLoading ? <Spinner /> : <GoogleIcon />}
          Continue with Google
        </button>

        {error && (
          <p role="alert" className="w-full text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 leading-snug">
            {error}
          </p>
        )}

        <div className="text-center mb-4">
          <p className="text-base font-bold text-gray-800 mb-1">
            Don't lose what you've learned.
          </p>
          <p className="text-[13px] text-gray-600 leading-relaxed">
            Thousands of learners use this app daily —{' '}
            sign in so your progress is always saved.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-sm text-gray-600 hover:text-gray-600 cursor-pointer transition-colors"
        >
          Maybe later
        </button>

      </div>
    </div>
  );
}
