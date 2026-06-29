import { useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { topicById } from '../config/stage1Topics';
import { useProgressStore, computeStrength } from '../store/useProgressStore';
import type { LessonRecord } from '../store/useProgressStore';
import { getLessonState } from '../utils/lessonState';
import { BottomNav } from '../components/ui/BottomNav';

const isDev = import.meta.env.DEV;

function strengthDotClass(strength: number): string {
  if (strength >= 80) return 'bg-brand-green';
  if (strength >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

export function TopicPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const topic = topicId ? topicById[topicId] : null;

  const {
    completedLessons,
    passedBlocks,
    passedTopics,
    partialLessonProgress,
  } = useProgressStore();
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const store = useProgressStore();
  const comprehensionLessonId = topicId ? 'tc-' + topicId.replace('topic-', '') : null;
  const comprehensionLesson = comprehensionLessonId ? lessons.find(l => l.id === comprehensionLessonId) : null;
  const comprehensionComplete = comprehensionLessonId ? completedLessons.includes(comprehensionLessonId) : false;
  const hasComprehensionExercise = Boolean(comprehensionLesson);

  const recordFor = useCallback(
    (lessonId: string): LessonRecord | undefined =>
      lessonRecords.find((r) => r.lessonId === lessonId),
    [lessonRecords],
  );

  if (!topic) return <Navigate to="/" replace />;

  const topicLessons = topic.lessonIds
    .map(id => ({ id, lesson: lessons.find(l => l.id === id), index: lessons.findIndex(l => l.id === id) }))
    .filter((e): e is { id: string; lesson: typeof lessons[0]; index: number } => !!e.lesson && e.index >= 0);

  const completedCount = topic.lessonIds.filter(id => completedLessons.includes(id)).length;
  const totalCount = topic.lessonIds.length;
  const arcCircumference = 2 * Math.PI * 44;

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer shrink-0"
            aria-label="Back"
          >
            ←
          </button>
          <div className={`w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-xl shrink-0`}>
            {completedCount === totalCount && totalCount > 0 ? '✓' : topic.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 leading-tight">{topic.title}</h1>
            <p className="text-xs text-gray-400 leading-tight">
              {completedCount === totalCount && totalCount > 0
                ? 'All lessons complete!'
                : `${completedCount} of ${totalCount} complete`}
            </p>
          </div>
        </div>
      </div>

      {/* Lesson tree */}
      <div className="flex-1 px-6 py-6 pb-28">
        <div className="flex flex-col items-center">
          {topicLessons.map(({ lesson, index: lessonIndex }, pos) => {
            const state = getLessonState(lessonIndex, completedLessons, passedBlocks, passedTopics);
            const record = recordFor(lesson.id);
            const isLocked = state === 'locked' || state === 'block_locked';
            const isPartial =
              !isLocked &&
              state !== 'completed' &&
              partialLessonProgress?.lessonId === lesson.id;
            const partialFraction = isPartial
              ? Math.min(1, partialLessonProgress!.resumeFromIndex / Math.max(1, lesson.exercises.length))
              : 0;

            return (
              <div key={lesson.id} className="flex flex-col items-center w-full">
                {/* Connector above (skip the very first node) */}
                {pos > 0 && (
                  <div className="w-0.5 h-10 border-l-2 border-dashed border-gray-300" />
                )}

                <div className="relative flex flex-col items-center">
                  {state === 'available' && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold text-brand-green uppercase tracking-widest">
                      {isPartial ? 'RESUME' : 'START'}
                    </span>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => !isLocked && navigate(`/lesson/${lesson.id}`, { state: { topicId } })}
                      title={
                        state === 'block_locked'
                          ? 'Complete the Block Race to unlock'
                          : state === 'locked'
                          ? 'Complete the previous lesson to unlock'
                          : lesson.title
                      }
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md transition-all duration-200 cursor-pointer
                        ${state === 'completed'
                          ? 'bg-brand-green text-white hover:opacity-90'
                          : isPartial
                          ? 'bg-brand-green text-white hover:opacity-90'
                          : state === 'available'
                          ? 'bg-brand-green text-white hover:opacity-90 ring-4 ring-brand-green/30 animate-pulse'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {state === 'completed' ? '✓' : isLocked ? '🔒' : lesson.icon}
                    </button>

                    {isPartial && (
                      <svg
                        className="absolute pointer-events-none"
                        style={{ inset: -8, width: 'calc(100% + 16px)', height: 'calc(100% + 16px)' }}
                        viewBox="0 0 96 96"
                      >
                        <circle cx="48" cy="48" r="44" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                        <circle
                          cx="48" cy="48" r="44"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${partialFraction * arcCircumference} ${arcCircumference}`}
                          transform="rotate(-90 48 48)"
                        />
                      </svg>
                    )}

                    {record && !isLocked && (
                      <span
                        className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${strengthDotClass(computeStrength(record, Date.now()))}`}
                        title={`Strength: ${computeStrength(record, Date.now())}%`}
                      />
                    )}

                    {record?.mastered && !isLocked && (
                      <span
                        className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-[8px]"
                        title="Mastered"
                      >⭐</span>
                    )}
                  </div>

                  <div className="mt-2 text-center">
                    <p className={`text-sm font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
                      {lesson.title}
                    </p>
                    <p className={`text-xs ${isLocked ? 'text-gray-300' : 'text-gray-400'} line-clamp-1`}>
                      {lesson.description}
                    </p>
                    <p className={`text-xs mt-0.5 text-right ${isLocked ? 'text-gray-300' : 'text-amber-500'} font-semibold`}>
                      ⭐ {lesson.xpReward} XP
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Comprehension node — unlocked when all lessons complete */}
          {hasComprehensionExercise && (() => {
            const allComplete = completedCount === totalCount && totalCount > 0;
            const isComingSoon = !!comprehensionLesson?.coming_soon;
            const comprehensionUnlocked = !isComingSoon && (isDev || allComplete);
            const comprehensionEnabled = comprehensionUnlocked;

            return (
              <>
                <div className="w-0.5 h-10 border-l-2 border-dashed border-gray-300" />
                <div className="relative flex flex-col items-center">
                  {comprehensionUnlocked && !comprehensionComplete && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold text-blue-600 uppercase tracking-widest whitespace-nowrap">
                      QUIZ
                    </span>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!comprehensionEnabled}
                      onClick={() => comprehensionEnabled && comprehensionLessonId && navigate(`/lesson/${comprehensionLessonId}`, { state: { topicId } })}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md transition-all duration-200
                        ${comprehensionComplete
                          ? 'bg-blue-500 text-white hover:opacity-90 cursor-pointer'
                          : comprehensionEnabled
                          ? 'bg-blue-500 text-white hover:opacity-90 ring-4 ring-blue-300/50 animate-pulse cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      title={
                        comprehensionComplete
                          ? 'Comprehension done! Tap to redo'
                          : isComingSoon
                          ? 'Coming soon'
                          : comprehensionEnabled
                          ? 'Answer questions about what you learned'
                          : 'Complete all lessons to unlock'
                      }
                    >
                      {comprehensionComplete ? '✓' : comprehensionEnabled ? '🎧' : '🔒'}
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-semibold ${comprehensionEnabled || comprehensionComplete ? 'text-gray-700' : 'text-gray-400'}`}>
                      {comprehensionComplete ? 'Quiz Done!' : 'Comprehension'}
                    </p>
                    <p className={`text-xs ${comprehensionEnabled || comprehensionComplete ? 'text-blue-500' : 'text-gray-300'}`}>
                      {comprehensionComplete
                        ? '+25 XP earned'
                        : isComingSoon
                        ? 'Coming soon'
                        : comprehensionEnabled
                        ? 'Listen & answer questions'
                        : 'Complete all lessons first'}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Topic Race node — unlocked after comprehension (or all lessons if no comprehension) */}
          {(() => {
            const allComplete = completedCount === totalCount && totalCount > 0;
            const racePassed = topicId ? (isDev || store.hasPassedTopic(topicId)) : false;
            const raceAttemptsLeft = store.getTopicRaceAttemptsLeft();
            const comprehensionGatePassed = !hasComprehensionExercise || comprehensionComplete;
            const raceUnlocked = isDev || (allComplete && comprehensionGatePassed);
            const raceEnabled = raceUnlocked && (isDev || raceAttemptsLeft > 0);

            return (
              <>
                <div className="w-0.5 h-10 border-l-2 border-dashed border-gray-300" />
                <div className="flex flex-col items-center">
                  {raceUnlocked && !racePassed && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold text-amber-600 uppercase tracking-widest whitespace-nowrap">
                      RACE
                    </span>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!raceEnabled}
                      onClick={() => raceEnabled && topicId && navigate(`/topic-race/${topicId}`)}
                      className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md transition-all duration-200
                        ${racePassed
                          ? 'bg-amber-400 text-white hover:opacity-90 cursor-pointer'
                          : raceEnabled
                          ? 'bg-amber-400 text-white hover:opacity-90 ring-4 ring-amber-300/50 animate-pulse cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      title={
                        racePassed
                          ? 'Topic Race passed! Tap to race again'
                          : raceEnabled
                          ? 'Topic Race — unlock the next topic!'
                          : hasComprehensionExercise && allComplete && !comprehensionComplete
                          ? 'Complete the comprehension quiz first'
                          : 'Complete all lessons to unlock the Topic Race'
                      }
                    >
                      {racePassed ? '🏆' : raceEnabled ? '🐌' : '🔒'}
                    </button>
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-semibold ${raceEnabled || racePassed ? 'text-gray-700' : 'text-gray-400'}`}>
                      {racePassed ? 'Race Passed!' : 'Topic Race'}
                    </p>
                    <p className={`text-xs ${raceEnabled || racePassed ? 'text-amber-500' : 'text-gray-300'}`}>
                      {racePassed
                        ? 'Next topic unlocked'
                        : raceEnabled
                        ? 'Unlock the next topic'
                        : hasComprehensionExercise && allComplete && !comprehensionComplete
                        ? 'Complete the quiz first'
                        : 'Complete all lessons first'}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
