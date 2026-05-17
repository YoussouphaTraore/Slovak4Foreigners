import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '../store/useProgressStore';
import { XpBadge } from '../components/ui/XpBadge';
import { StreakDisplay } from '../components/ui/StreakDisplay';
import { BottomNav } from '../components/ui/BottomNav';

interface CategoryCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  lessonCount: number;
  available: boolean;
  route?: string;
}

const CATEGORIES: CategoryCard[] = [
  {
    id: 'foreign-police',
    icon: '🛂',
    title: 'Foreign Police',
    subtitle: 'Residence permits, documents & bureaucracy',
    lessonCount: 5,
    available: true,
    route: '/foreigner-exclusive/foreign-police',
  },
  {
    id: 'healthcare',
    icon: '🏥',
    title: 'Healthcare',
    subtitle: 'Registering with a doctor, prescriptions & emergencies',
    lessonCount: 4,
    available: false,
  },
  {
    id: 'banking',
    icon: '🏦',
    title: 'Banking & Finance',
    subtitle: 'Opening accounts, taxes & Slovak banking terms',
    lessonCount: 4,
    available: false,
  },
  {
    id: 'transport',
    icon: '🚗',
    title: 'Driving & Transport',
    subtitle: 'Slovak driving licence, registration & public transport',
    lessonCount: 3,
    available: false,
  },
  {
    id: 'schools',
    icon: '🏫',
    title: 'Schools & Education',
    subtitle: 'Enrolling children, communicating with teachers',
    lessonCount: 3,
    available: false,
  },
];

export function ForeignerExclusivePage() {
  const navigate = useNavigate();
  const xp = useProgressStore((s) => s.xp);
  const streak = useProgressStore((s) => s.streak);
  const streakMultiplier = useProgressStore((s) => s.streakMultiplier);
  const isSyncing = useProgressStore((s) => s.isSyncing);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header — same structure as HomePage */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <img src="/snail.png" alt="" className="w-8 h-8 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 leading-tight">Foreigner Exclusive</h1>
            <p className="text-xs text-gray-400 leading-tight">Practical lessons built exclusively for foreigners in SK</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StreakDisplay streak={streak} />
          <XpBadge xp={xp} streakMultiplier={streakMultiplier} />
          {isSyncing && (
            <span title="Saving to cloud…" className="flex items-center gap-1 text-gray-400">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin inline-block" />
              <span className="text-[10px] font-medium">saving</span>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 pb-24 space-y-3">
        <p className="text-xs uppercase tracking-widest font-bold text-gray-400 px-1">Categories</p>

        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            disabled={!cat.available}
            onClick={() => cat.available && cat.route && navigate(cat.route)}
            className={`w-full text-left rounded-2xl border-2 px-4 py-4 flex items-center gap-4 transition-all
              ${cat.available
                ? 'bg-white border-gray-200 hover:border-brand-green hover:shadow-md active:scale-[0.98] cursor-pointer'
                : 'bg-white/60 border-gray-100 cursor-not-allowed opacity-70'
              }`}
          >
            <span className="text-3xl shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`text-sm font-extrabold leading-tight ${cat.available ? 'text-gray-800' : 'text-gray-400'}`}>
                  {cat.title}
                </p>
                {!cat.available && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 leading-snug">{cat.subtitle}</p>
              <p className="text-xs text-gray-300 mt-1">{cat.lessonCount} lessons</p>
            </div>
            {cat.available && (
              <span className="text-gray-300 text-lg shrink-0">›</span>
            )}
          </button>
        ))}
      </div>

      <BottomNav active="exclusive" />
    </div>
  );
}
