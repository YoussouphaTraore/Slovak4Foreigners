import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { XpCelebrationPage } from './pages/XpCelebrationPage';
import { SnailRacePage } from './pages/SnailRacePage';
import { PracticeDialoguePage } from './pages/PracticeDialoguePage';
import { AuthPage } from './pages/AuthPage';
import { DialogueSession } from './components/dialogue/DialogueSession';
import { EmergencyDialogueSession } from './components/dialogue/EmergencyDialogueSession';
import { SaveProgressModal } from './components/auth/SaveProgressModal';
import { dialogues } from './data/dialogues';
import { useProgressStore } from './store/useProgressStore';
import { useAuthStore } from './store/useAuthStore';

function DialogueSessionRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const recordDialogueComplete = useProgressStore((s) => s.recordDialogueComplete);
  const dialogue = dialogues.find((d) => d.id === id);
  if (!dialogue) return <Navigate to="/practice/dialogue" replace />;

  const handleExit = () => {
    recordDialogueComplete();
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

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/celebration/:lessonId" element={<XpCelebrationPage />} />
        <Route path="/race/:stageId" element={<SnailRacePage />} />
        <Route path="/practice/dialogue" element={<PracticeDialoguePage />} />
        <Route path="/practice/dialogue/:id" element={<DialogueSessionRoute />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showSaveProgressModal && (
        <SaveProgressModal trigger={showSaveProgressModal} onDismiss={dismissSaveProgressModal} />
      )}
    </>
  );
}

function App() {
  const decayLessonStrengths = useProgressStore((s) => s.decayLessonStrengths);
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    decayLessonStrengths();
    initialize();
  }, [decayLessonStrengths, initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#E8F4DC] flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
