import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { getAvatarUrl } from '../../lib/supabase/aliasUtils';
import { LeaderboardModal } from '../LeaderboardModal';

type Tab = 'home' | 'practice' | 'exclusive' | 'profile';

interface Props {
  active: Tab;
}

export function BottomNav({ active }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const alias = useAuthStore((s) => s.alias);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    '?';

  const displayLetter = displayName[0].toUpperCase();

  const avatarSrc = alias ? getAvatarUrl(alias) : '/pp/FrogySnail.png';

  const leaderboardPulse = useAuthStore((s) => s.leaderboardPulse);

  const [showAvatar, setShowAvatar] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowAvatar(false);
      return;
    }
    const t = setInterval(() => setShowAvatar((v) => !v), 4000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <>
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex z-30">
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
        <span className="text-[9px] font-semibold text-center leading-tight">Practice<br />Dialogue</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/foreigner-exclusive')}
        className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'exclusive' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <span className="text-2xl">🇸🇰</span>
        <span className="text-[9px] font-semibold text-center leading-tight">Foreigner<br />Exclusive</span>
      </button>

      <button
        type="button"
        onClick={() => { setShowLeaderboard(true); useAuthStore.getState().setLeaderboardPulse(false); }}
        className="flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
      >
        <span
          className="text-2xl inline-block"
          style={leaderboardPulse ? {
            animation: 'trophy-pulse 0.6s ease-in-out infinite',
            filter: 'drop-shadow(0 0 6px #FFD700)',
          } : undefined}
        >
          🏆
        </span>
        {leaderboardPulse && (
          <style>{`
            @keyframes trophy-pulse {
              0%, 100% { transform: scale(1); }
              50%       { transform: scale(1.45); }
            }
          `}</style>
        )}
        <span className="text-[9px] font-semibold text-center leading-tight">Leader<br />board</span>
      </button>

      {user ? (
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'profile' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className={`relative w-7 h-7 rounded-full ${active === 'profile' ? 'ring-2 ring-brand-green/40' : ''}`}>
            {/* State 1: initial letter */}
            <span
              className="absolute inset-0 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center"
              style={{ opacity: showAvatar ? 0 : 1, transition: 'opacity 0.4s' }}
            >
              {displayLetter}
            </span>
            {/* State 2: alias avatar (always mounted; fallback to FrogySnail if alias not yet loaded) */}
            <img
              src={avatarSrc}
              alt=""
              className="absolute inset-0 w-7 h-7 rounded-full object-cover"
              style={{ opacity: showAvatar ? 1 : 0, transition: 'opacity 0.4s' }}
            />
          </div>
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

    {showLeaderboard && (
      <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
    )}
  </>
  );
}
