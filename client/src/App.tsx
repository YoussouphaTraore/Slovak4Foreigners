import { useEffect, useRef, useState } from 'react';
import { MemoryRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { XpCelebrationPage } from './pages/XpCelebrationPage';
import { SnailRacePage } from './pages/SnailRacePage';
import { PracticeDialoguePage } from './pages/PracticeDialoguePage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { ReviewSessionPage } from './pages/ReviewSessionPage';
import { AdminPage } from './pages/AdminPage';
import { ForeignerExclusivePage } from './pages/ForeignerExclusivePage';
import { ForeignerExclusiveCategoryPage } from './pages/ForeignerExclusiveCategoryPage';
import { ForeignerExclusiveLessonPage } from './pages/ForeignerExclusiveLessonPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { BlockDialoguePage } from './pages/BlockDialoguePage';
import { TopicPage } from './pages/TopicPage';
import { TopicRacePage } from './pages/TopicRacePage';
import { DialogueSession } from './components/dialogue/DialogueSession';
import { EmergencyDialogueSession } from './components/dialogue/EmergencyDialogueSession';
import { SaveProgressModal, SOFT_DISMISS_KEY, REGRESSION_DISMISS_KEY } from './components/auth/SaveProgressModal';
import { ConsentPopup } from './components/ConsentPopup';
import { DesktopBanner } from './components/DesktopBlock';
import { dialogues } from './data/dialogues';
import { useProgressStore } from './store/useProgressStore';
import { useAuthStore } from './store/useAuthStore';
import { checkSessionRegistration, loadWeeklyXp, loadIsAdmin, checkWeeklyWinner, markWinnerSeen, loadProfileOnboarding } from './lib/supabase/progressSync';
import { loadAlias } from './lib/supabase/aliasUtils';
import { AliasPickerModal } from './components/AliasPickerModal';
import { OnboardingModal } from './components/OnboardingModal';
import { startSession, heartbeat, endSession } from './lib/supabase/sessionTracking';
import { runMagicBoxCheck, claimMagicBox } from './lib/supabase/magicBox';
import { MagicBoxModal } from './components/MagicBoxModal';
import { WeeklyWinnerModal } from './components/WeeklyWinnerModal';
import { PwaInstallSheet } from './components/PwaInstallSheet';
import {
  setDeferredPrompt, clearDeferredPrompt,
  markInstalled, markShown, shouldAutoShow, shouldShowIOSPrompt, isIOS, triggerInstall,
} from './lib/pwaInstall';

function DialogueSessionRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialogue = dialogues.find((d) => d.id === id);
  if (!dialogue) return <Navigate to="/practice/dialogue" replace />;

  const handleExit = () => {
    navigate('/practice/dialogue');
  };

  if (dialogue.emergencyMode) {
    return <EmergencyDialogueSession dialogue={dialogue} onExit={handleExit} />;
  }
  return <DialogueSession dialogue={dialogue} onExit={handleExit} />;
}

function AppRoutes() {
  const showSaveProgressModal = useProgressStore((s) => s.showSaveProgressModal);
  const dismissSaveProgressModal = useProgressStore((s) => s.dismissSaveProgressModal);
  const regressionLessonTitle = useProgressStore((s) => s.regressionLessonTitle);
  const applyGuestRegression = useProgressStore((s) => s.applyGuestRegression);
  const completedLessons = useProgressStore((s) => s.completedLessons);
  const reviewTargetIds = useProgressStore((s) => s.reviewTargetIds);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();

  function handleConsentAccepted() {
    // Only prompt guests — logged-in users already have an account
    if (userId) return;
    try {
      const val = localStorage.getItem(SOFT_DISMISS_KEY);
      if (val && Date.now() < Number(val)) return;
    } catch { /* */ }
    useProgressStore.setState({ showSaveProgressModal: 'soft' });
  }

  const regressionChecked = useRef(false);
  const autoReviewChecked = useRef(false);

  useEffect(() => {
    if (!isInitialized || regressionChecked.current) return;
    regressionChecked.current = true; // Lock — never re-run even if auth state changes later

    if (userId) return; // Already logged in on open, skip

    // Skip if user was logged in at any point this session (e.g. just signed out)
    try {
      if (sessionStorage.getItem('wasLoggedIn')) {
        sessionStorage.removeItem('wasLoggedIn');
        return;
      }
    } catch { /* */ }

    if (completedLessons.length < 3) return;

    try {
      const val = localStorage.getItem(REGRESSION_DISMISS_KEY);
      if (val && Date.now() < Number(val)) return;
    } catch { /* */ }

    applyGuestRegression();
  }, [isInitialized, userId, completedLessons.length, applyGuestRegression]);

  // Auto-trigger review when 12 hours have passed since the last review session
  useEffect(() => {
    if (!isInitialized || autoReviewChecked.current) return;
    autoReviewChecked.current = true;

    try {
      if (sessionStorage.getItem('autoReviewShown')) return;
    } catch { /* */ }

    const hasEnoughProgress = !!userId || completedLessons.length >= 3;
    if (!hasEnoughProgress) return;

    // Auto-redirect only when at least one lesson is actually due
    if (reviewTargetIds.length === 0) return;

    // Don't conflict with a regression modal that may have just been set
    const { showSaveProgressModal: modalState } = useProgressStore.getState();
    if (modalState !== null) return;

    try { sessionStorage.setItem('autoReviewShown', 'true'); } catch { /* */ }
    navigate('/review', { state: { autoTriggered: true } });
  }, [isInitialized, userId, completedLessons.length, reviewTargetIds.length, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/celebration/:lessonId" element={<XpCelebrationPage />} />
        <Route path="/race/:stageId/:blockId" element={<SnailRacePage />} />
        <Route path="/race/:stageId" element={<SnailRacePage />} />
        <Route path="/practice/dialogue" element={<PracticeDialoguePage />} />
        <Route path="/practice/dialogue/:id" element={<DialogueSessionRoute />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/review" element={<ReviewSessionPage />} />
        <Route path="/foreigner-exclusive" element={<ForeignerExclusivePage />} />
        <Route path="/foreigner-exclusive/foreign-police" element={<ForeignerExclusiveCategoryPage />} />
        <Route path="/foreigner-exclusive/lesson/:lessonId" element={<ForeignerExclusiveLessonPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/topic/:topicId" element={<TopicPage />} />
<Route path="/topic-race/:topicId" element={<TopicRacePage />} />
        <Route path="/block-dialogue/:blockId" element={<BlockDialoguePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showSaveProgressModal && (
        <SaveProgressModal
          trigger={showSaveProgressModal}
          onDismiss={dismissSaveProgressModal}
          regressionLessonTitle={regressionLessonTitle ?? undefined}
        />
      )}
      <ConsentPopup onAccepted={handleConsentAccepted} />
    </>
  );
}

function AppShell() {
  const decayLessonStrengths = useProgressStore((s) => s.decayLessonStrengths);
  const initializeFromCloud = useProgressStore((s) => s.initializeFromCloud);
  const setIsSessionRegistered = useProgressStore((s) => s.setIsSessionRegistered);
  const setWeeklyXp = useProgressStore((s) => s.setWeeklyXp);
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const userId = useAuthStore((s) => s.user?.id);
  const alias = useAuthStore((s) => s.alias);
  const setAlias = useAuthStore((s) => s.setAlias);
  const setIsAdmin = useAuthStore((s) => s.setIsAdmin);
  const setProfileData = useAuthStore((s) => s.setProfileData);

  useEffect(() => {
    decayLessonStrengths();
    initialize();
  }, [decayLessonStrengths, initialize]);

  // Sync cloud ↔ local whenever a user logs in
  useEffect(() => {
    if (userId) initializeFromCloud(userId);
  }, [userId, initializeFromCloud]);

  // Check physical session registration status on login
  useEffect(() => {
    if (!userId) return;
    checkSessionRegistration(userId).then(setIsSessionRegistered);
  }, [userId, setIsSessionRegistered]);

  // Load alias on login — show picker if user has none
  const [showAliasPicker, setShowAliasPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!userId) { setShowAliasPicker(false); setShowOnboarding(false); return; }
    loadAlias(userId).then((result) => {
      if (result === null) {
        setShowAliasPicker(true); // no alias — must pick (onboarding follows after)
      } else if (result) {
        setAlias(result); // existing alias — load profile data and check onboarding
        loadProfileOnboarding(userId).then(({ country, country_sk, country_sk_genitive, country_sk_locative, country_sk_adj_masculine, country_sk_adj_feminine, country_sk_adj_neuter, country_sk_adverb, gender }) => {
          setProfileData(country, country_sk, country_sk_genitive, country_sk_locative, country_sk_adj_masculine, country_sk_adj_feminine, country_sk_adj_neuter, country_sk_adverb, gender);
          if (!country || !gender) setShowOnboarding(true);
        });
      }
      // '' = DB error — don't show picker, alias stays empty
    });
  }, [userId, setAlias]);

  // Load weekly XP from Supabase on login (cron may have reset it)
  useEffect(() => {
    if (!userId) return;
    loadWeeklyXp(userId).then(setWeeklyXp);
  }, [userId, setWeeklyXp]);

  // Load admin flag on login; clear on sign-out
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    loadIsAdmin(userId).then(setIsAdmin);
  }, [userId, setIsAdmin]);

  // ── Magic Box state (declared early; effects follow weekly-winner section) ───
  const [showMagicBox, setShowMagicBox] = useState(false);
  const [magicBoxToast, setMagicBoxToast] = useState<string | null>(null);
  const magicBoxCheckedUser = useRef<string | null>(null);

  // ── Weekly Winner ─────────────────────────────────────────────────────────────
  const [weeklyWinner, setWeeklyWinner] = useState<{
    winnerAlias: string;
    winnerAvatar: string;
    winnerXp: number;
    isCurrentUser: boolean;
  } | null>(null);
  const weeklyWinnerChecked = useRef<string | null>(null);

  useEffect(() => {
    if (!isInitialized || !userId || !alias) return;
    if (weeklyWinnerChecked.current === userId) return;
    weeklyWinnerChecked.current = userId;
    checkWeeklyWinner(userId, alias).then((result) => {
      if (result?.show) setWeeklyWinner(result);
    }).catch(() => {});
  }, [isInitialized, userId, alias]);

  function handleWinnerDismiss() {
    markWinnerSeen();
    setWeeklyWinner(null);
    // Pulse the leaderboard nav icon for 10 seconds to draw attention
    useAuthStore.getState().setLeaderboardPulse(true);
    setTimeout(() => useAuthStore.getState().setLeaderboardPulse(false), 10_000);
    // If magic box hasn't been checked yet (was blocked by winner modal), run it now
    if (userId && !magicBoxCheckedUser.current) {
      magicBoxCheckedUser.current = userId;
      runMagicBoxCheck(userId).then((should) => { if (should) setShowMagicBox(true); }).catch(() => {});
    }
  }

  // ── Magic Box effects ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isInitialized || !userId) return;
    if (magicBoxCheckedUser.current === userId) return;
    magicBoxCheckedUser.current = userId;
    runMagicBoxCheck(userId).then((should) => { if (should) setShowMagicBox(true); }).catch(() => {});
  }, [isInitialized, userId]);

  // Re-check when app comes back to foreground (catches midnight day-change)
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState !== 'visible') return;
      if (!userId || showMagicBox) return;
      runMagicBoxCheck(userId).then((should) => { if (should) setShowMagicBox(true); }).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleFocus);
    return () => document.removeEventListener('visibilitychange', handleFocus);
  }, [userId, showMagicBox]);

  async function handleMagicBoxClaim(xp: number) {
    setShowMagicBox(false);
    if (!userId) return;
    claimMagicBox(xp).then(({ error }) => {
      if (!error) {
        useProgressStore.getState().initializeFromCloud(userId).then(() => {
          loadWeeklyXp(userId).then((n) => useProgressStore.getState().setWeeklyXp(n));
        });
      }
    });
    setMagicBoxToast(`You earned +${xp} XP from your Magic Box! 🐌`);
    setTimeout(() => setMagicBoxToast(null), 4000);
  }

  // ── PWA install prompt ────────────────────────────────────────────────────────
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [isIOSInstall, setIsIOSInstall] = useState(false);
  const installTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef    = useRef<string | null | undefined>(undefined);

  function scheduleInstall() {
    if (installTimerRef.current) clearTimeout(installTimerRef.current);
    installTimerRef.current = setTimeout(() => {
      if (shouldAutoShow()) {
        markShown();
        setIsIOSInstall(false);
        setShowInstallSheet(true);
      }
    }, 10_000);
  }

  // iOS: schedule the "Add to Home Screen" instructions sheet on mount
  useEffect(() => {
    if (!isIOS()) return;
    const timer = setTimeout(() => {
      if (shouldShowIOSPrompt()) {
        markShown();
        setIsIOSInstall(true);
        setShowInstallSheet(true);
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      scheduleInstall();
    };
    const handleInstalled = () => {
      markInstalled();
      clearDeferredPrompt();
      setShowInstallSheet(false);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      if (installTimerRef.current) clearTimeout(installTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger on new sign-in (userId: null → value)
  useEffect(() => {
    if (!isInitialized) return;
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId ?? null;
    if (prev === undefined) return; // first render
    if (!prev && userId) scheduleInstall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, userId]);

  const handleInstallTap = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') markInstalled();
    else markShown();
    setShowInstallSheet(false);
  };

  const handleInstallDismiss = () => {
    markShown();
    setShowInstallSheet(false);
    setIsIOSInstall(false);
  };

  // ── Session tracking ─────────────────────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const sessionUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isInitialized) return;
    const nextUserId = userId ?? null;
    if (sessionUserIdRef.current === nextUserId) return;
    const prevId = sessionIdRef.current;
    if (prevId) endSession(prevId).catch(() => {});
    sessionIdRef.current = null;
    sessionUserIdRef.current = nextUserId;
    startSession(nextUserId).then((id) => { if (id) sessionIdRef.current = id; }).catch(() => {});
  }, [isInitialized, userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const id = sessionIdRef.current;
      if (id) heartbeat(id).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const id = sessionIdRef.current;
        if (id) endSession(id).catch(() => {});
      }
    };
    const handleUnload = () => {
      const id = sessionIdRef.current;
      if (id) endSession(id).catch(() => {});
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#DCECCF]">
      <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-[#E8F4DC] shadow-[0_0_0_1px_rgba(114,122,106,0.12)]">
        <DesktopBanner />
        <MemoryRouter>
          <AppRoutes />
          <Analytics />
        </MemoryRouter>
      {showAliasPicker && userId && (
        <AliasPickerModal
          userId={userId}
          onDone={(newAlias) => {
            setAlias(newAlias);
            setShowAliasPicker(false);
            setShowOnboarding(true); // new users always need onboarding
          }}
        />
      )}
      {showOnboarding && userId && (
        <OnboardingModal
          userId={userId}
          onDone={() => {
            setShowOnboarding(false);
            loadProfileOnboarding(userId).then(({ country, country_sk, country_sk_genitive, country_sk_locative, country_sk_adj_masculine, country_sk_adj_feminine, country_sk_adj_neuter, country_sk_adverb, gender }) => {
              setProfileData(country, country_sk, country_sk_genitive, country_sk_locative, country_sk_adj_masculine, country_sk_adj_feminine, country_sk_adj_neuter, country_sk_adverb, gender);
            });
          }}
        />
      )}
      {weeklyWinner && (
        <WeeklyWinnerModal
          winnerAlias={weeklyWinner.winnerAlias}
          winnerAvatar={weeklyWinner.winnerAvatar}
          winnerXp={weeklyWinner.winnerXp}
          isCurrentUser={weeklyWinner.isCurrentUser}
          onDismiss={handleWinnerDismiss}
        />
      )}
      {showMagicBox && !weeklyWinner && <MagicBoxModal onClaim={handleMagicBoxClaim} />}
      {showInstallSheet && (
        <PwaInstallSheet isIOS={isIOSInstall} onInstall={handleInstallTap} onDismiss={handleInstallDismiss} />
      )}
      {magicBoxToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl whitespace-nowrap pointer-events-none">
          {magicBoxToast}
        </div>
      )}
      </div>
    </div>
  );
}

function App() {
  return <AppShell />;
}

export default App;
