import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

type Tab = 'home' | 'practice' | 'profile';

interface Props {
  active: Tab;
}

export function BottomNav({ active }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [showProfile, setShowProfile] = useState(false);

  const displayName =
    user?.user_metadata?.display_name ??
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email ??
    '?';

  const displayLetter = displayName[0].toUpperCase();

  const handleSignOut = async () => {
    setShowProfile(false);
    await signOut();
  };

  return (
    <>
      {/* Profile panel backdrop */}
      {showProfile && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfile(false)}
        />
      )}

      {/* Profile panel */}
      {showProfile && user && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-brand-green text-white text-sm font-bold flex items-center justify-center shrink-0">
                {displayLetter}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full bg-brand-green text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all mb-2"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="w-full text-gray-400 text-sm py-1.5 cursor-pointer hover:text-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Nav bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex z-30">
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'home' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/practice/dialogue')}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'practice' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-2xl">💬</span>
          <span className="text-xs font-semibold">Practice Dialogue</span>
        </button>
        {user ? (
          <button
            type="button"
            onClick={() => setShowProfile((v) => !v)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'profile' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className={`w-7 h-7 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center ${showProfile ? 'ring-2 ring-brand-green/40' : ''}`}>
              {displayLetter}
            </span>
            <span className="text-xs font-semibold">Profile</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'profile' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <span className="text-2xl">👤</span>
            <span className="text-xs font-semibold">Sign in</span>
          </button>
        )}
      </div>
    </>
  );
}
