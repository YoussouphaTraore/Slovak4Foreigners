import { useNavigate } from 'react-router-dom';

type Tab = 'home' | 'practice' | 'profile';

interface Props {
  active: Tab;
}

export function BottomNav({ active }: Props) {
  const navigate = useNavigate();

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
      <button
        type="button"
        className={`flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors ${active === 'profile' ? 'text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <span className="text-2xl">👤</span>
        <span className="text-xs font-semibold">Profile</span>
      </button>
    </div>
  );
}
