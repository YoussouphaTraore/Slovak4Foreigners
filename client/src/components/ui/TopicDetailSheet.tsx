import { useEffect } from 'react';
import type { LessonTopic } from '../../config/stage1Topics';

export interface TopicChildEntry {
  id: string;
  icon: string;
  title: string;
  description: string;
  xpReward: number;
  isLocked: boolean;
  isCompleted: boolean;
  isPartial: boolean;
  partialFraction: number;
}

interface Props {
  topic: LessonTopic;
  children: TopicChildEntry[];
  onClose: () => void;
  onNavigate: (lessonId: string) => void;
}

export function TopicDetailSheet({ topic, children, onClose, onNavigate }: Props) {
  const completedCount = children.filter(c => c.isCompleted).length;
  const totalCount = children.length;
  const arcCircumference = 2 * Math.PI * 28;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col max-w-lg mx-auto w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100">
          <div className="w-12 h-12 rounded-full bg-brand-green flex items-center justify-center text-2xl shrink-0">
            {completedCount === totalCount && totalCount > 0 ? '✓' : topic.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-extrabold text-gray-800">{topic.title}</h2>
            <p className="text-xs text-gray-400">
              {completedCount === totalCount && totalCount > 0
                ? 'All lessons complete!'
                : `${completedCount} of ${totalCount} complete`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Lesson list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2 pb-8">
          {children.map((entry, idx) => {
            const isInteractive = !entry.isLocked;
            return (
              <button
                key={entry.id}
                type="button"
                disabled={entry.isLocked}
                onClick={() => isInteractive && onNavigate(entry.id)}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all
                  ${entry.isCompleted
                    ? 'bg-green-50 border-2 border-green-200 hover:bg-green-100 active:scale-[0.98] cursor-pointer'
                    : entry.isLocked
                    ? 'bg-gray-50 border-2 border-gray-100 cursor-not-allowed opacity-60'
                    : 'bg-white border-2 border-brand-green/30 hover:border-brand-green hover:bg-green-50 active:scale-[0.98] cursor-pointer shadow-sm'
                  }`}
              >
                {/* Lesson icon or progress ring */}
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold
                    ${entry.isCompleted
                      ? 'bg-brand-green text-white'
                      : entry.isLocked
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-brand-green text-white'
                    }`}
                  >
                    {entry.isCompleted ? '✓' : entry.isLocked ? '🔒' : entry.icon}
                  </div>

                  {entry.isPartial && (
                    <svg
                      className="absolute pointer-events-none"
                      style={{ inset: -4, width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }}
                      viewBox="0 0 64 64"
                    >
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                      <circle
                        cx="32" cy="32" r="28"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${entry.partialFraction * arcCircumference} ${arcCircumference}`}
                        transform="rotate(-90 32 32)"
                      />
                    </svg>
                  )}
                </div>

                {/* Step number + lesson info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {idx + 1}
                    </span>
                    <p className={`text-sm font-bold leading-snug truncate ${entry.isLocked ? 'text-gray-400' : 'text-gray-800'}`}>
                      {entry.title}
                    </p>
                  </div>
                  <p className={`text-xs mt-0.5 line-clamp-1 ${entry.isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
                    {entry.description}
                  </p>
                </div>

                {/* XP + action arrow */}
                <div className="shrink-0 text-right">
                  <p className={`text-xs font-semibold ${entry.isLocked ? 'text-gray-300' : 'text-amber-500'}`}>
                    ⭐ {entry.xpReward} XP
                  </p>
                  {isInteractive && !entry.isCompleted && (
                    <span className="text-brand-green text-sm">▶</span>
                  )}
                  {entry.isCompleted && (
                    <span className="text-green-500 text-xs font-bold">Done</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
