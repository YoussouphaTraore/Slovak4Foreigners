import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

type Tab = 'home' | 'practice' | 'profile';

interface Props {
  active: Tab;
}

export function BottomNav({ active }: Props) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email ??
    '?';

  const displayLetter = displayName[0].toUpperCase();

  return (
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
          onClick={() => navigate('/profile')}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'profile' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span
            className={`w-7 h-7 rounded-full bg-brand-green text-white text-xs font-bold flex items-center justify-center ${
              active === 'profile' ? 'ring-2 ring-brand-green/40' : ''
            }`}
          >
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
  );
}
