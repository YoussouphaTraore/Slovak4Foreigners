import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { useProgressStore, computeStrength } from '../store/useProgressStore';
import type { LessonRecord } from '../store/useProgressStore';
import { BottomNav } from '../components/ui/BottomNav';
import { SessionRegistrationModal } from '../components/SessionRegistrationModal';
import { stage1Blocks, PRODUCTION_VISIBLE_STAGES } from '../config/stageBlocks';
import { getBlockDialogueById } from '../data/block-dialogues';

type NodeState = 'completed' | 'available' | 'locked' | 'stage_locked' | 'block_locked';

const isDev = import.meta.env.DEV;

function getLessonState(
  index: number,
  completedLessons: string[],
  unlockedStages: string[],
  passedBlocks: string[],
): NodeState {
  const lesson = lessons[index];

  // Shell lessons are always locked — they have no exercises
  if (lesson.coming_soon) return 'locked';

  if (isDev) return completedLessons.includes(lesson.id) ? 'completed' : 'available';

  if (!unlockedStages.includes(lesson.stageId)) return 'stage_locked';

  // Block gate — if this lesson is in block N > 1, the previous block race must be passed
  const blockIndex = stage1Blocks.findIndex((b) => b.lessonIds.includes(lesson.id));
  if (blockIndex > 0) {
    const previousBlock = stage1Blocks[blockIndex - 1];
    if (!passedBlocks.includes(previousBlock.blockId)) return 'block_locked';
  }

  if (completedLessons.includes(lesson.id)) return 'completed';

  // Sequential lock — find nearest non-shell predecessor
  let prevIndex = index - 1;
  while (prevIndex >= 0 && lessons[prevIndex].coming_soon) prevIndex--;

  if (prevIndex < 0 || completedLessons.includes(lessons[prevIndex].id)) return 'available';
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

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function strengthDotClass(strength: number): string {
  if (strength >= 80) return 'bg-brand-green';
  if (strength >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

const STAGE_UNLOCK_COSTS: Record<string, number> = {
  settling: 100,
  advanced: 250,
};

export function HomePage() {
  const navigate = useNavigate();
  const store = useProgressStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const endSentinelRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const {
    xp, streak, streakMultiplier, completedLessons, unlockedStages,
    snailRaceRecords, isSyncing, passedBlocks, completedBlockDialogues,
  } = store;
  const lessonRecords = useProgressStore((s) => s.lessonRecords);
  const lastReviewedAt = useProgressStore((s) => s.lastReviewedAt);
  const reviewTargetIds = useProgressStore((s) => s.reviewTargetIds);
  const isSessionRegistered = useProgressStore((s) => s.isSessionRegistered);
  const partialLessonProgress = useProgressStore((s) => s.partialLessonProgress);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const groups = groupByStage(lessons);

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
  const hasLessonsNeedingReview = reviewTargetIds.some((id) => {
    const r = lessonRecords.find((rec) => rec.lessonId === id);
    return r && computeStrength(lastReviewedAt, r.completedAt, nowMs) < 100;
  });
  const showReviewBanner = isDev || (hasLessonsNeedingReview && (needsFirstReview || reviewWarning || reviewOverdue));

  const reviewCount = reviewTargetIds.filter((id) => {
    const r = lessonRecords.find((rec) => rec.lessonId === id);
    return r && computeStrength(lastReviewedAt, r.completedAt, nowMs) < 100;
  }).length;

  const suggestedReviews = store.getSuggestedReviews();

  // All non-coming_soon Stage 1 lessons complete + Block 6 race passed
  const allAvailableLessonsComplete =
    !isDev &&
    lessons
      .filter((l) => l.stageId === 'survival' && !l.coming_soon)
      .every((l) => completedLessons.includes(l.id)) &&
    passedBlocks.includes('stage1-block6');

  useEffect(() => {
    if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
  }, [showReviewBanner]);

  // Show end-of-feed message when user scrolls to the bottom sentinel (prod only)
  useEffect(() => {
    if (isDev) return;
    const el = endSentinelRef.current;
    if (!el) return;
    let obs: IntersectionObserver | null = null;
    const timer = setTimeout(() => {
      obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setHasReachedEnd(true); },
        { threshold: 0.3 },
      );
      obs.observe(el);
    }, 500);
    return () => {
      clearTimeout(timer);
      obs?.disconnect();
    };
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('openSessionModal')) {
        sessionStorage.removeItem('openSessionModal');
        setShowSessionModal(true);
      }
    } catch { /* */ }
  }, []);

  const recordFor = (lessonId: string): LessonRecord | undefined =>
    lessonRecords.find((r) => r.lessonId === lessonId);

  const liveStrength = useCallback(
    (record: LessonRecord) => {
      if (!reviewTargetIds.includes(record.lessonId)) return 100;
      return computeStrength(lastReviewedAt, record.completedAt, nowMs);
    },
    [reviewTargetIds, lastReviewedAt, nowMs],
  );

  const raceAttemptsToday = (stageId: string): number => {
    const rec = snailRaceRecords.find((r) => r.stageId === stageId);
    if (!rec || rec.lastAttemptDate !== todayStr()) return 0;
    return rec.attemptsToday;
  };

  // Shared renderer for a single lesson node
  function renderLessonNode(
    lessonIndex: number,
    posInGroup: number,
    isLastInGroup: boolean,
    showBottomConnector: boolean,
  ) {
    const lesson = lessons[lessonIndex];
    const state = getLessonState(lessonIndex, completedLessons, unlockedStages, passedBlocks);
    const record = recordFor(lesson.id);
    const isLocked = state === 'locked' || state === 'stage_locked' || state === 'block_locked';
    const isPartial =
      !isLocked &&
      state !== 'completed' &&
      partialLessonProgress?.lessonId === lesson.id;
    const partialFraction = isPartial
      ? Math.min(1, partialLessonProgress!.resumeFromIndex / Math.max(1, lesson.exercises.length))
      : 0;
    const arcCircumference = 2 * Math.PI * 44;

    void posInGroup; // used by caller for context, not needed here

    return (
      <div key={lesson.id} className="flex flex-col items-center">
        <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />

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
              onClick={() => !isLocked && navigate(`/lesson/${lesson.id}`)}
              title={
                state === 'stage_locked'
                  ? 'Unlock this stage to access'
                  : state === 'block_locked'
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

            {record && (
              <span
                className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${strengthDotClass(liveStrength(record))}`}
                title={`Strength: ${liveStrength(record)}%`}
              />
            )}
          </div>

          <div className="mt-2 text-center">
            <p className={`text-sm font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
              {lesson.title}
            </p>
            <p className={`text-xs ${isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
              {lesson.description}
            </p>
          </div>
        </div>

        {(isLastInGroup || showBottomConnector) && (
          <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300 mt-2" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F4DC] flex flex-col max-w-lg mx-auto w-full">
      {/* Header */}
      <div ref={headerRef} className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <img src="/snail.png" alt="" className="w-8 h-8 object-contain shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-800 leading-tight">Slovak for Foreigners</h1>
            <p className="text-xs text-gray-400 leading-tight">Learn Slovak. Live like a local.</p>
          </div>

          {isSyncing && (
            <span title="Saving to cloud…" className="flex items-center gap-1 text-gray-400 shrink-0">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-brand-green rounded-full animate-spin inline-block" />
            </span>
          )}
        </div>

        <div className="mt-2 flex items-stretch gap-3">
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

          {showReviewBanner ? (
            <button
              type="button"
              title={isSessionRegistered ? 'Already registered!' : 'Join Our Physical Sessions'}
              onClick={() => setShowSessionModal(true)}
              className="ml-auto flex items-center justify-center bg-amber-50 border border-amber-200 rounded-xl p-1 cursor-pointer hover:bg-amber-100 active:scale-[0.97] transition-all"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${isSessionRegistered ? 'bg-brand-green' : 'bg-amber-400'}`}>
                {isSessionRegistered ? '✓' : '👥'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSessionModal(true)}
              className="ml-auto flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl pl-1.5 pr-3 py-0.5 cursor-pointer hover:bg-amber-100 active:scale-[0.98] transition-all"
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-sm shrink-0 ${isSessionRegistered ? 'bg-brand-green' : 'bg-amber-400'}`}>
                {isSessionRegistered ? '✓' : '👥'}
              </span>
              <div className="text-left">
                {isSessionRegistered ? (
                  <>
                    <p className="text-[8px] font-bold text-brand-green leading-tight">Registered!</p>
                    <p className="text-[7px] text-green-600 leading-tight">See details →</p>
                  </>
                ) : (
                  <>
                    <p className="text-[8px] font-bold text-amber-800 leading-tight">Join Our Physical Sessions</p>
                    <p className="text-[7px] text-amber-600 leading-tight">Register →</p>
                  </>
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Skill path */}
      <div className="flex-1 px-6 py-8 pb-24">
        <div className="flex flex-col items-center gap-0">
          {groups.map((group, groupIndex) => {
            const nextGroup = groups[groupIndex + 1];
            const nextStageId = nextGroup?.stageId;
            const nextStageLocked = nextStageId && !unlockedStages.includes(nextStageId);
            const nextStageCost = nextStageId ? (STAGE_UNLOCK_COSTS[nextStageId] ?? 0) : 0;
            const xpNeeded = Math.max(0, nextStageCost - xp);
            const canAffordNext = xp >= nextStageCost;
            const completableIndices = group.indices.filter((i) => !lessons[i].coming_soon);
            const allInStageCompleted =
              completableIndices.length > 0 &&
              completableIndices.every((i) => completedLessons.includes(lessons[i].id));
            const canUnlockNext = canAffordNext && allInStageCompleted;
            const isStageHiddenInProd = !isDev && !PRODUCTION_VISIBLE_STAGES.includes(group.stageId);

            // In production, hide Stage 2/3 entirely — no banner, no content, no connector
            if (isStageHiddenInProd) return null;

            return (
              <div key={group.stageId} className="w-full flex flex-col items-center">
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

                {/* ── Stage 1 (survival): render by block ── */}
                {group.stageId === 'survival' ? (
                  stage1Blocks.map((block, blockIdx) => {
                    const blockLessonIndices = group.indices.filter((i) =>
                      block.lessonIds.includes(lessons[i].id),
                    );

                    // Only count completable (non-shell) lessons for the race gate
                    const completableLessonIds = block.lessonIds.filter((id) => {
                      const l = lessons.find((le) => le.id === id);
                      return l && !l.coming_soon;
                    });
                    const allBlockLessonsCompleted =
                      completableLessonIds.length > 0
                        ? completableLessonIds.every((id) => completedLessons.includes(id))
                        : false;

                    const blockDialogue = getBlockDialogueById(block.blockId);
                    const dialogueCompleted = completedBlockDialogues.includes(block.blockId);
                    const dialogueUnlocked = isDev || allBlockLessonsCompleted;
                    const dialogueEnabled = isDev || (allBlockLessonsCompleted && !dialogueCompleted);

                    const blockRacePassed = passedBlocks.includes(block.blockId);
                    const blockAttemptsLeft = store.getBlockRaceAttemptsLeft();
                    const raceUnlocked = isDev || (allBlockLessonsCompleted && (dialogueCompleted || !blockDialogue));
                    const raceEnabled = isDev || (raceUnlocked && blockAttemptsLeft > 0);

                    return (
                      <div key={block.blockId} className="w-full flex flex-col items-center">
                        {/* Block label */}
                        <div className="w-full flex items-center gap-2 my-1">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 whitespace-nowrap">
                            {block.blockName}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {/* Lesson nodes in this block */}
                        {blockLessonIndices.map((lessonIndex, posInBlock) => {
                          const isLastInBlock = posInBlock === blockLessonIndices.length - 1;
                          return renderLessonNode(lessonIndex, posInBlock, false, isLastInBlock);
                        })}

                        {/* Block Dialogue node — shown when a dialogue exists for this block */}
                        {blockDialogue && (
                          <button
                            type="button"
                            disabled={!dialogueEnabled && !dialogueCompleted}
                            onClick={() => {
                              if (!dialogueEnabled && !dialogueCompleted && !isDev) return;
                              navigate(`/block-dialogue/${block.blockId}`, { state: { guided: true } });
                            }}
                            className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 shadow-sm transition-all mb-0
                              ${dialogueCompleted
                                ? 'bg-green-50 border-2 border-green-200 cursor-pointer hover:bg-green-100 active:scale-[0.98]'
                                : dialogueUnlocked
                                ? 'bg-blue-50 border-2 border-blue-300 hover:bg-blue-100 active:scale-[0.98] cursor-pointer animate-pulse'
                                : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
                              }`}
                          >
                            <span className="text-3xl shrink-0">{blockDialogue.contact.avatar}</span>
                            <div className="text-left flex-1">
                              <p className={`text-sm font-extrabold leading-snug ${dialogueCompleted ? 'text-green-700' : dialogueUnlocked ? 'text-blue-800' : 'text-gray-400'}`}>
                                {dialogueCompleted ? '✅' : dialogueUnlocked ? '💬' : '🔒'} {blockDialogue.title}
                              </p>
                              <p className={`text-xs mt-0.5 ${dialogueCompleted ? 'text-green-600' : dialogueUnlocked ? 'text-blue-600' : 'text-gray-400'}`}>
                                {dialogueCompleted
                                  ? `Completed · +${blockDialogue.xpReward} XP earned`
                                  : dialogueUnlocked
                                  ? `Talk to ${blockDialogue.contact.name} — ${blockDialogue.contact.role}`
                                  : 'Complete all lessons to unlock'}
                              </p>
                            </div>
                            {(dialogueEnabled || isDev) && !dialogueCompleted && (
                              <span className="text-blue-400 text-lg shrink-0">▶</span>
                            )}
                          </button>
                        )}

                        {/* Block race button */}
                        <button
                          type="button"
                          disabled={!raceEnabled}
                          onClick={() => raceEnabled && navigate(`/race/survival/${block.blockId}`)}
                          className={`w-full flex items-center gap-4 rounded-2xl px-4 py-4 shadow-sm transition-all
                            ${raceEnabled
                              ? 'bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 active:scale-[0.98] cursor-pointer'
                              : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
                            }`}
                        >
                          <img src="/snailTurbo.png" alt="" className="w-12 h-12 object-contain shrink-0" />
                          <div className="text-left flex-1">
                            <p className={`text-sm font-extrabold leading-snug ${raceUnlocked ? 'text-amber-800' : 'text-gray-400'}`}>
                              {blockRacePassed ? '✅' : raceUnlocked ? '🏁' : '🔒'} Block Race — {block.blockName}
                            </p>
                            <p className={`text-xs mt-0.5 ${raceUnlocked ? 'text-amber-600' : 'text-gray-400'}`}>
                              {blockRacePassed
                                ? `Turbo Snail achieved! Tap to race again (${blockAttemptsLeft}/5 today)`
                                : raceUnlocked
                                ? blockAttemptsLeft > 0
                                  ? `Reach Turbo Snail to unlock the next block! (${blockAttemptsLeft}/5 today)`
                                  : 'No attempts left — resets at midnight'
                                : blockDialogue && !dialogueCompleted
                                ? 'Complete the Block Dialogue first'
                                : 'Complete all lessons to unlock'}
                            </p>
                          </div>
                          {raceEnabled && <span className="text-amber-400 text-lg shrink-0">▶</span>}
                        </button>

                        {/* Connector between blocks (not after the last block) */}
                        {blockIdx < stage1Blocks.length - 1 && (
                          <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
                        )}
                      </div>
                    );
                  })
                ) : isStageHiddenInProd ? (
                  /* ── Production: stage not rebuilt yet — teaser banner only, no content ── */
                  <div className="w-full bg-white border-2 border-dashed border-gray-200 rounded-2xl px-4 py-6 text-center">
                    <p className="text-2xl mb-1">🚧</p>
                    <p className="text-sm font-semibold text-gray-500">More coming soon!</p>
                    <p className="text-xs text-gray-400 mt-1">This stage is being rebuilt with the new lesson system.</p>
                  </div>
                ) : (
                  /* ── Other stages: existing single-race rendering (dev only) ── */
                  <>
                    {group.indices.map((lessonIndex, posInGroup) => {
                      const isLastInGroup = posInGroup === group.indices.length - 1;
                      return renderLessonNode(lessonIndex, posInGroup, isLastInGroup, false);
                    })}

                    {/* Stage-level Snail Race button */}
                    {(() => {
                      const attemptsUsed = raceAttemptsToday(group.stageId);
                      const attemptsLeft = 5 - attemptsUsed;
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
                  </>
                )}

                {/* Stage gate to NEXT stage — only for stages production is actually ready to show */}
                {!isDev && nextStageId && nextStageLocked && PRODUCTION_VISIBLE_STAGES.includes(nextStageId) && (
                  <>
                    <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
                    <div className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">🔐</span>
                        <div>
                          <p className="text-sm font-bold text-gray-700">{nextGroup.stageName}</p>
                          <p className="text-xs text-gray-400">Unlock for {nextStageCost} XP</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canUnlockNext}
                        onClick={() => { if (canUnlockNext) store.unlockStage(nextStageId); }}
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

                {groupIndex < groups.length - 1 && (isDev || !nextStageLocked) && (
                  <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />
                )}
              </div>
            );
          })}

          {/* End-of-feed message — production only, fades in when sentinel enters viewport */}
          {!isDev && (
            <div ref={endSentinelRef} className="w-full flex flex-col items-center pt-10 pb-2">
              <div
                className={`text-center transition-all duration-500 ${
                  hasReachedEnd ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                }`}
              >
                <p className="text-xs text-gray-400 font-medium tracking-wide">
                  {allAvailableLessonsComplete
                    ? 'New lessons on the way soon'
                    : 'Complete the already loaded lessons on your feed first'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomNav active="home" />
      {showSessionModal && (
        <SessionRegistrationModal onClose={() => setShowSessionModal(false)} />
      )}
    </div>
  );
}
