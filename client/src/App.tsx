import { useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
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
import { DialogueSession } from './components/dialogue/DialogueSession';
import { EmergencyDialogueSession } from './components/dialogue/EmergencyDialogueSession';
import { SaveProgressModal, REGRESSION_DISMISS_KEY } from './components/auth/SaveProgressModal';
import { ConsentPopup } from './components/ConsentPopup';
import { DesktopBlock, isMobile } from './components/DesktopBlock';
import { dialogues } from './data/dialogues';
import { useProgressStore } from './store/useProgressStore';
import { useAuthStore } from './store/useAuthStore';
import { checkSessionRegistration, loadWeeklyXp, loadIsAdmin } from './lib/supabase/progressSync';
import { loadOrAssignAlias } from './lib/supabase/aliasUtils';
import { startSession, heartbeat, endSession } from './lib/supabase/sessionTracking';
import { runMagicBoxCheck, claimMagicBox } from './lib/supabase/magicBox';
import { MagicBoxModal } from './components/MagicBoxModal';

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
  const lastReviewedAt = useProgressStore((s) => s.lastReviewedAt);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();

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

    // Check if 12h have elapsed since the last review
    if (!lastReviewedAt) return; // First review is user-initiated via banner
    const hoursElapsed = (Date.now() - new Date(lastReviewedAt).getTime()) / 3_600_000;
    if (hoursElapsed < 12) return;

    // Don't conflict with a regression modal that may have just been set
    const { showSaveProgressModal: modalState } = useProgressStore.getState();
    if (modalState !== null) return;

    try { sessionStorage.setItem('autoReviewShown', 'true'); } catch { /* */ }
    navigate('/review', { state: { autoTriggered: true } });
  }, [isInitialized, userId, completedLessons.length, lastReviewedAt, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/celebration/:lessonId" element={<XpCelebrationPage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showSaveProgressModal && (
        <SaveProgressModal
          trigger={showSaveProgressModal}
          onDismiss={dismissSaveProgressModal}
          regressionLessonTitle={regressionLessonTitle ?? undefined}
        />
      )}
      <ConsentPopup />
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
  const setAlias = useAuthStore((s) => s.setAlias);
  const setIsAdmin = useAuthStore((s) => s.setIsAdmin);

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

  // Load or auto-assign alias on login
  useEffect(() => {
    if (!userId) return;
    loadOrAssignAlias(userId).then(setAlias);
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

  // ── Magic Box ────────────────────────────────────────────────────────────────
  const [showMagicBox, setShowMagicBox] = useState(false);
  const [magicBoxToast, setMagicBoxToast] = useState<string | null>(null);
  const magicBoxCheckedUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isInitialized || !userId) return;
    if (magicBoxCheckedUser.current === userId) return;
    magicBoxCheckedUser.current = userId;
    runMagicBoxCheck(userId).then((should) => { if (should) setShowMagicBox(true); }).catch(() => {});
  }, [isInitialized, userId]);

  // Re-check when app comes back to foreground (catches midnight day-change)
  useEffect(() => {
    const handleFocus = () => {
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
    <>
      <HashRouter>
        <AppRoutes />
        <Analytics />
      </HashRouter>
      {showMagicBox && <MagicBoxModal onClaim={handleMagicBoxClaim} />}
      {magicBoxToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-xl whitespace-nowrap pointer-events-none">
          {magicBoxToast}
        </div>
      )}
    </>
  );
}

function App() {
  if (!isMobile) return <DesktopBlock />;
  return <AppShell />;
}

export default App;
