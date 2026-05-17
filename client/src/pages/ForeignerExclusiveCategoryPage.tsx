import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '../store/useProgressStore';
import { foreignPoliceLessons } from '../data/foreigner-exclusive/foreign-police';
import { BottomNav } from '../components/ui/BottomNav';

function strengthDotClass(strength: number): string {
  if (strength >= 80) return 'bg-brand-green';
  if (strength >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

export function ForeignerExclusiveCategoryPage() {
  const navigate = useNavigate();
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const unlockedReferenceCards = useProgressStore((s) => s.unlockedReferenceCards);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
        <button
          type="button"
          onClick={() => navigate('/foreigner-exclusive')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer mb-3 transition-colors"
        >
          ‹ Foreigner Exclusive
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛂</span>
          <div>
            <h1 className="text-base font-extrabold text-gray-800 leading-tight">Foreign Police</h1>
            <p className="text-xs text-gray-400">Residence permits, documents & bureaucracy</p>
          </div>
        </div>
      </div>

      {/* Lesson list */}
      <div className="flex-1 px-4 py-5 pb-24 space-y-3">
        <p className="text-xs uppercase tracking-widest font-bold text-gray-400 px-1">Lessons</p>

        {foreignPoliceLessons.map((lesson, i) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const hasReferenceCard = unlockedReferenceCards.includes(lesson.unlocksReferenceCard);
          const record = lessonRecords.find((r) => r.lessonId === lesson.id);
          const isAvailable = !lesson.coming_soon;
          const isFirst = i === 0;

          return (
            <button
              key={lesson.id}
              type="button"
              disabled={!isAvailable}
              onClick={() => isAvailable && navigate(`/foreigner-exclusive/lesson/${lesson.id}`)}
              className={`w-full text-left rounded-2xl border-2 px-4 py-4 flex items-center gap-4 transition-all
                ${isAvailable
                  ? 'bg-white border-gray-200 hover:border-brand-green hover:shadow-md active:scale-[0.98] cursor-pointer'
                  : 'bg-white/60 border-gray-100 cursor-not-allowed opacity-70'
                }
                ${isFirst && !isCompleted && isAvailable ? 'border-brand-green ring-2 ring-brand-green/20' : ''}
              `}
            >
              {/* Icon + completion */}
              <div className="relative shrink-0">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
                    ${isCompleted ? 'bg-brand-green' : isAvailable ? 'bg-gray-100' : 'bg-gray-50'}
                  `}
                >
                  {isCompleted ? '✓' : lesson.coming_soon ? '🔒' : lesson.icon}
                </div>
                {record && (
                  <span
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${strengthDotClass(record.strength)}`}
                  />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-extrabold leading-tight ${isAvailable ? 'text-gray-800' : 'text-gray-400'}`}>
                    {lesson.title}
                  </p>
                  {lesson.coming_soon && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                  {hasReferenceCard && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      📋 Card saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 italic">{lesson.titleSlovak}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{lesson.description}</p>
                {isAvailable && (
                  <p className="text-xs text-gray-300 mt-1">{lesson.exercises.length} exercises · {lesson.xpReward} XP</p>
                )}
              </div>

              {isAvailable && !lesson.coming_soon && (
                <span className="text-gray-300 text-lg shrink-0">›</span>
              )}
            </button>
          );
        })}
      </div>

      <BottomNav active="exclusive" />
    </div>
  );
}
