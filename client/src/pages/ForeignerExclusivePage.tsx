import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgressStore, computeStrength } from '../store/useProgressStore';
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

const isDev = import.meta.env.DEV;

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
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const lastReviewedAt = useProgressStore((s) => s.lastReviewedAt);
  const completedLessons = useProgressStore((s) => s.completedLessons);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hoursElapsed = lastReviewedAt
    ? (nowMs - new Date(lastReviewedAt).getTime()) / 3_600_000
    : null;

  const needsFirstReview = !lastReviewedAt && completedLessons.length >= 3;
  const reviewWarning = hoursElapsed !== null && hoursElapsed >= 9 && hoursElapsed < 12;
  const reviewOverdue = hoursElapsed !== null && hoursElapsed >= 12;
  const hasLessonsNeedingReview = lessonRecords.some(
    (r) => computeStrength(lastReviewedAt, r.completedAt, nowMs) < 100
  );
  const showReviewBanner = isDev || (hasLessonsNeedingReview && (needsFirstReview || reviewWarning || reviewOverdue));
  const reviewCount = lessonRecords.filter(
    (r) => computeStrength(lastReviewedAt, r.completedAt, nowMs) < 100
  ).length;

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        {/* Row 1: logo + title */}
        <div className="flex items-center gap-2.5">
          <img src="/snail.png" alt="" className="w-8 h-8 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 leading-tight">Foreigner Exclusive</h1>
            <p className="text-xs text-gray-400 leading-tight">Practical lessons built exclusively for foreigners in SK</p>
          </div>
          {isSyncing && (
            <span title="Saving to cloud…" className="flex items-center gap-1 text-gray-400 shrink-0">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin inline-block" />
            </span>
          )}
        </div>

        {/* Row 2: stats widget + review + join session */}
        <div className="mt-2 flex items-stretch gap-3">
          {/* Stats widget */}
          <div className="flex items-stretch bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-1 px-2.5 py-0.5">
              <span className="text-sm leading-none">🔥</span>
              <span className="text-xs font-extrabold text-gray-800 tabular-nums">{streak}</span>
              <span className="text-[8px] font-bold text-gray-600">Streak</span>
            </div>
            <div className="w-px bg-amber-200 self-stretch" />
            <div className="flex items-center gap-1 px-2.5 py-0.5">
              <span className="text-sm leading-none">⚡</span>
              <span className="text-xs font-extrabold text-gray-800 tabular-nums">
                {xp}{streakMultiplier > 1 && <span className="text-orange-500 text-[8px]">{streakMultiplier % 1 === 0 ? streakMultiplier.toFixed(0) : streakMultiplier.toFixed(1)}×</span>}
              </span>
              <span className="text-[8px] font-bold text-gray-600">XP</span>
            </div>
          </div>

          {/* Review widget */}
          {showReviewBanner && (
            <button
              type="button"
              onClick={() => navigate('/review')}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 active:scale-[0.97] transition-all animate-pulse"
            >
              <span className="text-sm leading-none">{reviewOverdue ? '🔴' : '⚠️'}</span>
              {reviewCount > 0 && (
                <span className={`text-xs font-extrabold tabular-nums ${reviewOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                  {reviewCount}+
                </span>
              )}
              <span className="text-[8px] font-bold text-amber-800">Review</span>
            </button>
          )}

          {/* Join a Physical Session */}
          {showReviewBanner ? (
            <button
              type="button"
              title="Join Our Physical Sessions"
              className="ml-auto flex items-center justify-center bg-amber-50 border border-amber-200 rounded-xl p-1 cursor-pointer hover:bg-amber-100 active:scale-[0.97] transition-all"
            >
              <span className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center text-sm">👥</span>
            </button>
          ) : (
            <button
              type="button"
              className="ml-auto flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl pl-1.5 pr-3 py-0.5 cursor-pointer hover:bg-amber-100 active:scale-[0.98] transition-all"
            >
              <span className="w-6 h-6 rounded-md bg-amber-400 flex items-center justify-center text-sm shrink-0">👥</span>
              <div className="text-left">
                <p className="text-[8px] font-bold text-amber-800 leading-tight">Join Our Physical Sessions</p>
                <p className="text-[7px] text-amber-600 leading-tight">Register →</p>
              </div>
            </button>
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
