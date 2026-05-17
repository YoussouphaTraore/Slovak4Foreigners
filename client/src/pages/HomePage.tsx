import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { useProgressStore, computeStrength } from '../store/useProgressStore';
import type { LessonRecord } from '../store/useProgressStore';
import { XpBadge } from '../components/ui/XpBadge';
import { StreakDisplay } from '../components/ui/StreakDisplay';
import { BottomNav } from '../components/ui/BottomNav';

type NodeState = 'completed' | 'available' | 'locked' | 'stage_locked';

const isDev = import.meta.env.DEV;

function getLessonState(
  index: number,
  completedLessons: string[],
  unlockedStages: string[]
): NodeState {
  if (isDev) return completedLessons.includes(lessons[index].id) ? 'completed' : 'available';
  const lesson = lessons[index];
  if (!unlockedStages.includes(lesson.stageId)) return 'stage_locked';
  if (completedLessons.includes(lesson.id)) return 'completed';
  if (index === 0 || completedLessons.includes(lessons[index - 1]?.id ?? '')) return 'available';
  return 'locked';
}

function groupByStage(lessonList: typeof lessons) {
  const groups: { stageId: string; stageName: string; indices: number[] }[] = [];
  lessonList.forEach((lesson, index) => {
    const existing = groups.find((g) => g.stageId === lesson.stageId);
    if (existing) existing.indices.push(index);
    else groups.push({ stageId: lesson.stageId, stageName: lesson.stageName, indices: [index] });
  });
  return groups;
}

function strengthDotClass(strength: number): string {
  if (strength >= 80) return 'bg-brand-green';
  if (strength >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

// XP costs matching the store constants
const STAGE_UNLOCK_COSTS: Record<string, number> = {
  settling: 100,
  advanced: 250,
};

export function HomePage() {
  const navigate = useNavigate();
  const store = useProgressStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { xp, streak, streakMultiplier, completedLessons, unlockedStages, snailRaceRecords, isSyncing } = store;
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const lastReviewedAt = useProgressStore((s) => s.lastReviewedAt);
  const groups = groupByStage(lessons);

  // Live clock — ticks every minute so dot colors update while the app is open
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hoursElapsed = lastReviewedAt
    ? (nowMs - new Date(lastReviewedAt).getTime()) / 3_600_000
    : null;

  // First review: no timestamp yet, user has completed enough lessons
  const needsFirstReview = !lastReviewedAt && completedLessons.length >= 3;
  // Warning zone: 7–12h since last review
  const reviewWarning = hoursElapsed !== null && hoursElapsed >= 7 && hoursElapsed < 12;
  // Overdue: 12h+ since last review (mandatory)
  const reviewOverdue = hoursElapsed !== null && hoursElapsed >= 12;
  const showReviewBanner = needsFirstReview || reviewWarning || reviewOverdue;

  const suggestedReviews = store.getSuggestedReviews();

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  }, [showReviewBanner]);

  const recordFor = (lessonId: string): LessonRecord | undefined =>
    lessonRecords.find((r) => r.lessonId === lessonId);

  // Live strength computed from the global review clock, not stored value
  const liveStrength = useCallback(
    (record: LessonRecord) => computeStrength(lastReviewedAt, record.completedAt, nowMs),
    [lastReviewedAt, nowMs],
  );

  const raceAttemptsToday = (stageId: string): number => {
    const rec = snailRaceRecords.find((r) => r.stageId === stageId);
    if (!rec || rec.lastAttemptDate !== todayStr()) return 0;
    return rec.attemptsToday;
  };

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div ref={headerRef} className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        {/* Row 1: logo + title + review badge */}
        <div className="flex items-center gap-2.5">
          <img src="/snail.png" alt="" className="w-8 h-8 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 leading-tight">Slovak for Foreigners</h1>
            <p className="text-xs text-gray-400 leading-tight">Learn Slovak. Live like a local.</p>
          </div>
          {showReviewBanner && (
            <button
              type="button"
              onClick={() => navigate('/review')}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 cursor-pointer active:scale-[0.97] transition-all ${
                reviewOverdue
                  ? 'bg-red-50 border border-red-300 hover:bg-red-100'
                  : 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="text-sm">{reviewOverdue ? '🔴' : '⚠️'}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold whitespace-nowrap ${reviewOverdue ? 'text-red-700' : 'text-amber-700'}`}>
                  {reviewOverdue ? 'Review overdue!' : 'Review due'}
                </p>
                {suggestedReviews.length > 0 && (
                  <p className={`text-xs truncate max-w-[120px] ${reviewOverdue ? 'text-red-500' : 'text-amber-500'}`}>
                    {suggestedReviews.map((r) => lessons.find((l) => l.id === r.lessonId)?.title ?? r.lessonId).join(', ')}
                  </p>
                )}
              </div>
            </button>
          )}
        </div>
        {/* Row 2: stats pills + sync indicator */}
        <div className="flex items-center gap-2 mt-2">
          <StreakDisplay streak={streak} />
          <XpBadge xp={xp} streakMultiplier={streakMultiplier} />
          {isSyncing && (
            <span
              title="Saving to cloud…"
              className="flex items-center gap-1 text-gray-400"
            >
              <span className="w-3 h-3 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin inline-block" />
              <span className="text-[10px] font-medium">saving</span>
            </span>
          )}
        </div>
      </div>

      {/* Skill path */}
      <div className="flex-1 px-6 py-8 pb-24">
        <div className="flex flex-col items-center gap-0">
          {groups.map((group, groupIndex) => {
            const allInStageCompleted = group.indices.every((i) =>
              completedLessons.includes(lessons[i].id)
            );
            const attemptsUsed = raceAttemptsToday(group.stageId);
            const attemptsLeft = 5 - attemptsUsed;

            // Next stage gate info
            const nextGroup = groups[groupIndex + 1];
            const nextStageId = nextGroup?.stageId;
            const nextStageLocked = nextStageId && !unlockedStages.includes(nextStageId);
            const nextStageCost = nextStageId ? (STAGE_UNLOCK_COSTS[nextStageId] ?? 0) : 0;
            const xpNeeded = Math.max(0, nextStageCost - xp);
            const canAffordNext = xp >= nextStageCost;
            const canUnlockNext = canAffordNext && allInStageCompleted;

            return (
              <div key={group.stageId} className="w-full flex flex-col items-center">
                {/* Connector above stage banner (except first) */}
                {groupIndex > 0 && (
                  <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />
                )}

                {/* Stage banner */}
                <div
                  className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-2 shadow-sm sticky z-10"
                  style={{ top: headerHeight }}
                >
                  <span className="text-xl">🏆</span>
                  <span className="text-sm font-bold text-gray-700">{group.stageName}</span>
                </div>

                {/* Lessons in this stage */}
                {group.indices.map((lessonIndex, posInGroup) => {
                  const lesson = lessons[lessonIndex];
                  const state = getLessonState(lessonIndex, completedLessons, unlockedStages);
                  const isLastInGroup = posInGroup === group.indices.length - 1;
                  const record = recordFor(lesson.id);

                  return (
                    <div key={lesson.id} className="flex flex-col items-center">
                      <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />

                      <div className="relative flex flex-col items-center">
                        {state === 'available' && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold text-brand-green uppercase tracking-widest">
                            START
                          </span>
                        )}
                        <div className="relative">
                          <button
                            type="button"
                            disabled={state === 'locked' || state === 'stage_locked'}
                            onClick={() => state !== 'locked' && state !== 'stage_locked' && navigate(`/lesson/${lesson.id}`)}
                            title={
                              state === 'stage_locked'
                                ? 'Unlock this stage to access'
                                : state === 'locked'
                                ? 'Complete the previous lesson to unlock'
                                : lesson.title
                            }
                            className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md transition-all duration-200 cursor-pointer
                              ${state === 'completed'
                                ? 'bg-brand-green text-white hover:opacity-90'
                                : state === 'available'
                                ? 'bg-brand-green text-white hover:opacity-90 ring-4 ring-brand-green/30 animate-pulse'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                            {state === 'completed' ? '✓' : (state === 'locked' || state === 'stage_locked') ? '🔒' : lesson.icon}
                          </button>

                          {/* Strength dot — uses live time-based strength */}
                          {record && (
                            <span
                              className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${strengthDotClass(liveStrength(record))}`}
                              title={`Strength: ${liveStrength(record)}%`}
                            />
                          )}
                        </div>

                        <div className="mt-2 text-center">
                          <p className={`text-sm font-semibold ${state === 'locked' || state === 'stage_locked' ? 'text-gray-400' : 'text-gray-700'}`}>
                            {lesson.title}
                          </p>
                          <p className={`text-xs ${state === 'locked' || state === 'stage_locked' ? 'text-gray-300' : 'text-gray-400'}`}>
                            {lesson.description}
                          </p>
                        </div>
                      </div>

                      {isLastInGroup && (
                        <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300 mt-2" />
                      )}
                    </div>
                  );
                })}

                {/* Snail Race node */}
                {(() => {
                  const raceEnabled = isDev || (allInStageCompleted && attemptsLeft > 0);
                  const raceUnlocked = isDev || allInStageCompleted;
                  return (
                    <button
                      type="button"
                      disabled={!raceEnabled}
                      onClick={() => raceEnabled && navigate(`/race/${group.stageId}`)}
                      className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 shadow-sm transition-all cursor-pointer
                        ${raceEnabled
                          ? 'bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 active:scale-[0.98]'
                          : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
                        }`}
                    >
                      <img src="/snailTurbo.png" alt="" className="w-12 h-12 object-contain shrink-0" />
                      <div className="text-left flex-1">
                        <p className={`text-sm font-extrabold leading-snug ${raceUnlocked ? 'text-amber-800' : 'text-gray-400'}`}>
                          {raceUnlocked ? '🏁' : '🔒'} Snail Race — Become the Turbo-Snail by Racing Other Snails and Earn XP
                        </p>
                        <p className={`text-xs mt-0.5 ${raceUnlocked ? 'text-amber-600' : 'text-gray-400'}`}>
                          {raceUnlocked
                            ? attemptsLeft > 0
                              ? `Answer as many as you can in 60 seconds! (${attemptsLeft}/5 today)`
                              : 'No attempts left today — come back tomorrow!'
                            : 'Complete all lessons in this stage to unlock'}
                        </p>
                      </div>
                      {raceEnabled && <span className="text-amber-400 text-lg shrink-0">▶</span>}
                    </button>
                  );
                })()}

                {/* Stage gate to NEXT stage */}
                {!isDev && nextStageId && nextStageLocked && (
                  <>
                    <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
                    <div className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">🔐</span>
                        <div>
                          <p className="text-sm font-bold text-gray-700">
                            {nextGroup.stageName}
                          </p>
                          <p className="text-xs text-gray-400">Unlock for {nextStageCost} XP</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canUnlockNext}
                        onClick={() => {
                          if (canUnlockNext) {
                            store.unlockStage(nextStageId);
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all cursor-pointer
                          ${canUnlockNext
                            ? 'bg-amber-400 text-white hover:bg-amber-500 active:scale-[0.98]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                      >
                        {!allInStageCompleted
                          ? 'Complete all lessons first'
                          : !canAffordNext
                          ? `Need ${xpNeeded} more XP`
                          : `Unlock — ${nextStageCost} XP`}
                      </button>
                      {!canUnlockNext && suggestedReviews.length > 0 && (
                        <p className="text-xs text-gray-400 text-center mt-2">
                          Review: {suggestedReviews.slice(0, 2).map((r) => {
                            const l = lessons.find((le) => le.id === r.lessonId);
                            return l?.title ?? r.lessonId;
                          }).join(' · ')}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Connector between race/gate and next stage banner */}
                {groupIndex < groups.length - 1 && (isDev || !nextStageLocked) && (
                  <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
