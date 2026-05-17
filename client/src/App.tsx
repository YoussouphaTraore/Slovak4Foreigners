import { useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { XpCelebrationPage } from './pages/XpCelebrationPage';
import { SnailRacePage } from './pages/SnailRacePage';
import { PracticeDialoguePage } from './pages/PracticeDialoguePage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { ReviewSessionPage } from './pages/ReviewSessionPage';
import { ForeignerExclusivePage } from './pages/ForeignerExclusivePage';
import { ForeignerExclusiveCategoryPage } from './pages/ForeignerExclusiveCategoryPage';
import { ForeignerExclusiveLessonPage } from './pages/ForeignerExclusiveLessonPage';
import { DialogueSession } from './components/dialogue/DialogueSession';
import { EmergencyDialogueSession } from './components/dialogue/EmergencyDialogueSession';
import { SaveProgressModal, REGRESSION_DISMISS_KEY } from './components/auth/SaveProgressModal';
import { dialogues } from './data/dialogues';
import { useProgressStore } from './store/useProgressStore';
import { useAuthStore } from './store/useAuthStore';

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
  const lastReviewDate = useProgressStore((s) => s.lastReviewDate);
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

  // Auto-trigger daily review when any lesson hits critical strength (< 30)
  useEffect(() => {
    if (!isInitialized || autoReviewChecked.current) return;
    autoReviewChecked.current = true;

    try {
      if (sessionStorage.getItem('autoReviewShown')) return;
    } catch { /* */ }

    const hasEnoughProgress = !!userId || completedLessons.length >= 3;
    if (!hasEnoughProgress) return;

    const today = new Date().toISOString().split('T')[0];
    if (lastReviewDate === today) return;

    // Don't conflict with a regression modal that may have just been set
    const { lessonRecords, showSaveProgressModal: modalState } = useProgressStore.getState();
    if (modalState !== null) return;

    const hasCritical = lessonRecords.some((r) => r.strength < 30);
    if (!hasCritical) return;

    try { sessionStorage.setItem('autoReviewShown', 'true'); } catch { /* */ }
    navigate('/review', { state: { autoTriggered: true } });
  }, [isInitialized, userId, completedLessons.length, lastReviewDate, navigate]);

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showSaveProgressModal && (
        <SaveProgressModal
          trigger={showSaveProgressModal}
          onDismiss={dismissSaveProgressModal}
          regressionLessonTitle={regressionLessonTitle ?? undefined}
        />
      )}
    </>
  );
}

function App() {
  const decayLessonStrengths = useProgressStore((s) => s.decayLessonStrengths);
  const initializeFromCloud = useProgressStore((s) => s.initializeFromCloud);
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    decayLessonStrengths();
    initialize();
  }, [decayLessonStrengths, initialize]);

  // Sync cloud ↔ local whenever a user logs in
  useEffect(() => {
    if (userId) initializeFromCloud(userId);
  }, [userId, initializeFromCloud]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

export default App;
