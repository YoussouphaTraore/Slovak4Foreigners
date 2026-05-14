import { useNavigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { useProgressStore } from '../store/useProgressStore';
import { XpBadge } from '../components/ui/XpBadge';
import { StreakDisplay } from '../components/ui/StreakDisplay';

type NodeState = 'completed' | 'available' | 'locked';

function getLessonState(index: number, completedLessons: string[]): NodeState {
  const lesson = lessons[index];
  if (completedLessons.includes(lesson.id)) return 'completed';
  if (index === 0 || completedLessons.includes(lessons[index - 1].id)) return 'available';
  return 'locked';
}

function groupByStage(lessonList: typeof lessons) {
  const groups: { stageId: string; stageName: string; indices: number[] }[] = [];
  lessonList.forEach((lesson, index) => {
    const existing = groups.find((g) => g.stageId === lesson.stageId);
    if (existing) {
      existing.indices.push(index);
    } else {
      groups.push({ stageId: lesson.stageId, stageName: lesson.stageName, indices: [index] });
    }
  });
  return groups;
}

export function HomePage() {
  const navigate = useNavigate();
  const { xp, streak, completedLessons } = useProgressStore();
  const groups = groupByStage(lessons);

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-800 leading-tight flex items-center gap-2">
              <img src="/snail.png" alt="" className="w-8 h-8 object-contain" />
              Slovak for Foreigners
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Live in Slovakia. Speak like a local.</p>
          </div>
          <div className="flex items-center gap-2">
            <StreakDisplay streak={streak} />
            <XpBadge xp={xp} />
          </div>
        </div>
      </div>

      {/* Skill path */}
      <div className="flex-1 px-6 py-8 pb-24">
        <div className="flex flex-col items-center gap-0">
          {groups.map((group, groupIndex) => (
            <div key={group.stageId} className="w-full flex flex-col items-center">
              {/* Connector above stage banner (except first) */}
              {groupIndex > 0 && (
                <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />
              )}

              {/* Stage banner */}
              <div className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-2 shadow-sm">
                <span className="text-xl">🏆</span>
                <span className="text-sm font-bold text-gray-700">{group.stageName}</span>
              </div>

              {/* Lessons in this stage */}
              {group.indices.map((lessonIndex, posInGroup) => {
                const lesson = lessons[lessonIndex];
                const state = getLessonState(lessonIndex, completedLessons);
                const isLastInGroup = posInGroup === group.indices.length - 1;

                return (
                  <div key={lesson.id} className="flex flex-col items-center">
                    {/* Connector above node */}
                    <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />

                    {/* Node */}
                    <div className="relative flex flex-col items-center">
                      {state === 'available' && (
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold text-brand-green uppercase tracking-widest">
                          START
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={state === 'locked'}
                        onClick={() => state !== 'locked' && navigate(`/lesson/${lesson.id}`)}
                        title={state === 'locked' ? 'Complete the previous lesson to unlock' : lesson.title}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md transition-all duration-200 cursor-pointer
                          ${state === 'completed'
                            ? 'bg-brand-green text-white hover:opacity-90'
                            : state === 'available'
                            ? 'bg-brand-green text-white hover:opacity-90 ring-4 ring-brand-green/30 animate-pulse'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                      >
                        {state === 'completed' ? '✓' : state === 'locked' ? '🔒' : lesson.icon}
                      </button>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-semibold ${state === 'locked' ? 'text-gray-400' : 'text-gray-700'}`}>
                          {lesson.title}
                        </p>
                        <p className={`text-xs ${state === 'locked' ? 'text-gray-300' : 'text-gray-400'}`}>
                          {lesson.description}
                        </p>
                      </div>
                    </div>

                    {/* Connector below last node in a stage */}
                    {isLastInGroup && (
                      <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300 mt-2" />
                    )}
                  </div>
                );
              })}

              {/* Snail Race bridge — sits after every stage's last lesson */}
              <button
                type="button"
                onClick={() => navigate('/race')}
                className="w-full flex items-center gap-4 bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-4 shadow-sm hover:bg-amber-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                <img src="/snailTurbo.png" alt="" className="w-12 h-12 object-contain shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-sm font-extrabold text-amber-800">Snail Race 🏁</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Are you a Snail or Are You The Snail On Turbo? Answer as many as you can in 60 seconds!
                  </p>
                </div>
                <span className="text-amber-400 text-lg shrink-0">▶</span>
              </button>

              {/* Connector between this stage's race card and the next stage banner */}
              {groupIndex < groups.length - 1 && (
                <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex">
        <button
          type="button"
          className="flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors text-brand-green"
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/race')}
          className="flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
        >
          <span className="text-2xl">🐌</span>
          <span className="text-xs font-semibold">Race</span>
        </button>
        <button
          type="button"
          className="flex-1 flex flex-col items-center py-3 gap-0.5 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
        >
          <span className="text-2xl">👤</span>
          <span className="text-xs font-semibold">Profile</span>
        </button>
      </div>
    </div>
  );
}
