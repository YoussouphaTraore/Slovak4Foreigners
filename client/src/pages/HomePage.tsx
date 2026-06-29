import { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateOptions } from 'react-router-dom';
import { lessons } from '../data/lessons';
import { useProgressStore } from '../store/useProgressStore';
import { BottomNav } from '../components/ui/BottomNav';
import { SessionRegistrationModal } from '../components/SessionRegistrationModal';
import { stage1Blocks, getBlockLessonIds } from '../config/stageBlocks';
import { topicById } from '../config/stage1Topics';
import type { LessonTopic } from '../config/stage1Topics';
import { getBlockDialogueById } from '../data/block-dialogues';
import { getLessonState } from '../utils/lessonState';

const isDev = import.meta.env.DEV;


const SCROLL_KEY = 'home_scroll';

export function HomePage() {
  const navigate = useNavigate();

  // Save scroll before leaving; restore on return
  const go = useCallback((to: string, opts?: NavigateOptions) => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    navigate(to, opts);
  }, [navigate]);

  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (!saved) return;
    sessionStorage.removeItem(SCROLL_KEY);
    const y = parseInt(saved, 10);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, []);

  const store = useProgressStore();
  const headerRef = useRef<HTMLDivElement>(null);
  const endSentinelRef = useRef<HTMLDivElement>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const {
    xp, streak, streakMultiplier, completedLessons,
    isSyncing, passedBlocks, passedTopics, completedBlockDialogues,
  } = store;
  const practiceDaysThisWeek = useProgressStore((s) => s.practiceDaysThisWeek);
  const reviewTargetIds = useProgressStore((s) => s.reviewTargetIds);
  const isSessionRegistered = useProgressStore((s) => s.isSessionRegistered);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // reviewTargetIds = all currently-due lesson IDs (pre-computed by decayLessonStrengths)
  const reviewCount = reviewTargetIds.length;
  const reviewDisplayCount = Math.min(reviewCount, 3);
  const reviewBannerLabel = reviewCount >= 3 ? 'Keep these fresh' : 'Quick warm-up';
  const showReviewBanner = isDev
    ? completedLessons.length > 0
    : reviewCount > 0;

  const finalStage1BlockId = stage1Blocks[stage1Blocks.length - 1]?.blockId;

  // All non-coming_soon Stage 1 lessons complete + final Stage 1 block race passed
  const allAvailableLessonsComplete =
    !isDev &&
    lessons
      .filter((l) => l.stageId !== 'topic-comprehension' && !l.coming_soon)
      .every((l) => completedLessons.includes(l.id)) &&
    !!finalStage1BlockId &&
    passedBlocks.includes(finalStage1BlockId);

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

  // Topic node for multi-lesson topics — tapping opens the detail sheet
  function renderTopicNode(topic: LessonTopic, showBottomConnector: boolean, isTopicGateLocked = false) {
    const lessonIndices = topic.lessonIds
      .map(id => lessons.findIndex(l => l.id === id))
      .filter(i => i >= 0);
    if (lessonIndices.length === 0) return null;

    const firstState = getLessonState(lessonIndices[0], completedLessons, passedBlocks, passedTopics);
    const isLocked = isTopicGateLocked || firstState === 'locked' || firstState === 'block_locked' || firstState === 'topic_locked';
    const completedCount = topic.lessonIds.filter(id => completedLessons.includes(id)).length;
    const totalCount = topic.lessonIds.length;
    const isComplete = completedCount === totalCount;
    const hasProgress = completedCount > 0 && !isComplete;

    // Progress ring data
    const tcLessonId = `tc-${topic.id.replace('topic-', '')}`;
    const hasTC = lessons.some(l => l.id === tcLessonId);
    const tcComplete = completedLessons.includes(tcLessonId);
    const racePassed = passedTopics.includes(topic.id);

    const R = 44;
    const CIRC = 2 * Math.PI * R;
    const LESSON_SEG = CIRC * (hasTC ? 0.65 : 0.80);
    const COMP_SEG   = CIRC * (hasTC ? 0.18 : 0);
    const RACE_SEG   = CIRC * (hasTC ? 0.17 : 0.20);

    const lessonFill = totalCount > 0 ? (completedCount / totalCount) * LESSON_SEG : 0;
    const compFill   = tcComplete ? COMP_SEG : 0;
    const raceFill   = racePassed ? RACE_SEG : 0;

    const compStartAngle = -90 + (LESSON_SEG / CIRC * 360);
    const raceStartAngle = -90 + ((LESSON_SEG + COMP_SEG) / CIRC * 360);

    return (
      <div key={topic.id} className="flex flex-col items-center">
        <div className="w-0.5 h-8 border-l-2 border-dashed border-gray-300" />

        <div className="relative flex flex-col items-center">
          {!isLocked && !isComplete && (
            <span className={`absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full text-xs font-bold uppercase tracking-widest ${hasProgress ? 'text-amber-500' : 'text-brand-green'}`}>
              {hasProgress ? 'CONTINUE' : 'START'}
            </span>
          )}

          <div className="relative">
            <button
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && go(`/topic/${topic.id}`)}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-md transition-all duration-200 cursor-pointer
                ${isComplete
                  ? 'bg-brand-green text-white hover:opacity-90'
                  : isLocked
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-green text-white hover:opacity-90'
                }`}
            >
              {isLocked ? '🔒' : topic.icon}
            </button>

            {/* Progress ring */}
            {!isLocked && (
              <svg
                className="absolute pointer-events-none"
                style={{ inset: -7, width: 'calc(100% + 14px)', height: 'calc(100% + 14px)' }}
                viewBox="0 0 94 94"
              >
                {/* Background track */}
                <circle cx="47" cy="47" r={R} fill="none" stroke="#D1D5DB" strokeWidth="4" />
                {/* Lesson arc — green */}
                {lessonFill > 0 && (
                  <circle
                    cx="47" cy="47" r={R}
                    fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${lessonFill} ${CIRC}`}
                    transform="rotate(-90 47 47)"
                  />
                )}
                {/* Comprehension arc — blue */}
                {hasTC && compFill > 0 && (
                  <circle
                    cx="47" cy="47" r={R}
                    fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="butt"
                    strokeDasharray={`${compFill} ${CIRC}`}
                    transform={`rotate(${compStartAngle} 47 47)`}
                  />
                )}
                {/* Race arc — amber */}
                {raceFill > 0 && (
                  <circle
                    cx="47" cy="47" r={R}
                    fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="butt"
                    strokeDasharray={`${raceFill} ${CIRC}`}
                    transform={`rotate(${raceStartAngle} 47 47)`}
                  />
                )}
              </svg>
            )}

            {!isLocked && (
              <span className={`absolute -bottom-1 -right-1 min-w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center text-[9px] font-extrabold px-1
                ${isComplete ? 'bg-brand-green border-white text-white' : 'bg-white border-brand-green text-brand-green'}`}
              >
                {completedCount}/{totalCount}
              </span>
            )}
          </div>

          <div className="mt-3 text-center">
            <p className={`text-sm font-semibold ${isLocked ? 'text-gray-400' : 'text-gray-700'}`}>
              {topic.title}
            </p>
            <p className={`text-xs ${isLocked ? 'text-gray-300' : 'text-gray-400'}`}>
              {isTopicGateLocked ? 'Pass the Topic Race to unlock' : `${totalCount} ${totalCount === 1 ? 'lesson' : 'lessons'}`}
            </p>
          </div>
        </div>

        {showBottomConnector && (
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
            <p className="text-xs text-gray-400 leading-tight">
              {practiceDaysThisWeek.length > 0
                ? `This week: ${practiceDaysThisWeek.length} practice ${practiceDaysThisWeek.length === 1 ? 'day' : 'days'}`
                : 'Learn Slovak. Live like a local.'}
            </p>
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
              onClick={() => go('/review')}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-100 active:scale-[0.97] transition-all"
            >
              <span className="text-sm leading-none">🐌</span>
              {reviewCount > 0 && (
                <span className="text-xs font-extrabold tabular-nums text-emerald-700">
                  {reviewDisplayCount}
                </span>
              )}
              <span className="text-[8px] font-bold text-emerald-800">{reviewBannerLabel}</span>
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
          {stage1Blocks.map((block, blockIdx) => {
            const blockLessonIds = getBlockLessonIds(block);
            const completableLessonIds = blockLessonIds.filter((id) => {
              const l = lessons.find((le) => le.id === id);
              return l && !l.coming_soon;
            });
            const blockTopics = (block.topicIds ?? [])
              .map(id => topicById[id])
              .filter(Boolean) as LessonTopic[];
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

                {/* Topic nodes in this block */}
                {blockTopics.map((topic, topicIdx) => {
                  const isLast = topicIdx === blockTopics.length - 1;
                  const prevTopicId = topicIdx > 0 ? blockTopics[topicIdx - 1].id : null;
                  const isTopicGateLocked = !isDev && prevTopicId !== null && !passedTopics.includes(prevTopicId);
                  return renderTopicNode(topic, isLast, isTopicGateLocked);
                })}

                {/* Block Dialogue node */}
                {blockDialogue && (
                  <button
                    type="button"
                    disabled={!dialogueEnabled && !dialogueCompleted}
                    onClick={() => {
                      if (!dialogueEnabled && !dialogueCompleted && !isDev) return;
                      go(`/block-dialogue/${block.blockId}`);
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
                  onClick={() => raceEnabled && go(`/race/survival/${block.blockId}`)}
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

                {/* Connector between blocks */}
                {blockIdx < stage1Blocks.length - 1 && (
                  <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-300" />
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
