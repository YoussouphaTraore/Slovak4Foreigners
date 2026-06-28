import { useState, useRef } from 'react';
import type { ConversationComprehensionExercise as TExercise, ComprehensionAnswer } from '../../types/conversationComprehension';
import { useFeedbackNextDelay } from '../../hooks/useFeedbackNextDelay';

type Feedback = 'correct' | 'wrong' | null;

interface Props {
  exercise: TExercise;
  onDone: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
  onFailed?: (words: { slovak: string; english: string }[]) => void;
}

export function ConversationComprehensionExercise({ exercise, onDone, onAnswer, onFailed }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasAudio = Boolean(exercise.audioUrl);
  const [isPlaying, setIsPlaying] = useState(false);

  const [questionIdx, setQuestionIdx] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const nextVisible = useFeedbackNextDelay(feedback);

  const currentQuestion = exercise.questions[questionIdx];
  const correctAnswer = currentQuestion?.answers.find((a) => a.isCorrect);

  if (!currentQuestion) {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-full rounded-3xl border-2 border-amber-200 bg-amber-50 px-5 py-6">
            <p className="text-sm font-semibold text-amber-700">Comprehension coming soon</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-600">
              This topic comprehension lesson is available, but its questions have not been added yet.
            </p>
          </div>
        </div>
        <div className="flex-none pb-1">
          <button
            type="button"
            onClick={() => onDone(true)}
            className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest hover:opacity-90 active:scale-[0.98] shadow-md cursor-pointer transition-all"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  const handleReplay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play();
  };

  const handleAnswer = (answer: ComprehensionAnswer) => {
    if (feedback !== null) return;
    const correct = answer.isCorrect;
    if (!correct && currentQuestion.reviewPair) {
      onFailed?.([currentQuestion.reviewPair]);
    }
    setTappedId(answer.id);
    setFeedback(correct ? 'correct' : 'wrong');
    onAnswer?.(correct);
  };

  const handleNext = () => {
    const nextIdx = questionIdx + 1;
    if (nextIdx < exercise.questions.length) {
      setQuestionIdx(nextIdx);
      setFeedback(null);
      setTappedId(null);
    } else {
      onDone(true);
    }
  };

  const getAnswerStyle = (answer: ComprehensionAnswer): string => {
    const base =
      'w-full border-2 rounded-2xl px-4 py-4 text-left font-medium cursor-pointer transition-all duration-200 active:scale-95 break-words';
    if (feedback === null) {
      return `${base} border-gray-200 bg-white text-gray-700 hover:border-brand-blue hover:bg-blue-50`;
    }
    if (answer.isCorrect) {
      return `${base} border-brand-green bg-green-50 text-brand-green`;
    }
    if (answer.id === tappedId) {
      return `${base} border-brand-red bg-red-50 text-brand-red animate-shake`;
    }
    return `${base} border-gray-200 bg-white text-gray-400 opacity-50`;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {hasAudio && (
        <audio
          ref={audioRef}
          src={exercise.audioUrl}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top zone: replay button + question counter */}
      <div className="flex-none flex items-center gap-3">
        {hasAudio ? (
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-brand-blue text-sm font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            {isPlaying ? 'Playing…' : 'Replay conversation'}
          </button>
        ) : (
          <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            🎧 Audio coming soon
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {questionIdx + 1} / {exercise.questions.length}
        </span>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm px-5 py-6">
        <p className="text-base font-bold text-gray-800 leading-snug">
          {currentQuestion.questionEn}
        </p>
      </div>

      {/* Answer choices */}
      <div className="flex flex-col gap-3">
        {currentQuestion.answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            disabled={feedback !== null}
            onClick={() => handleAnswer(answer)}
            className={getAnswerStyle(answer)}
          >
            <span className="block text-sm font-semibold leading-tight">
              {answer.textEn}
              {feedback !== null && answer.isCorrect ? ' ✓' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback banner */}
      {feedback !== null && (
        <div
          className={`flex-none rounded-2xl px-4 py-3 ${
            feedback === 'correct'
              ? 'bg-green-50 border-2 border-brand-green'
              : 'bg-red-50 border-2 border-brand-red'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm mb-1 ${feedback === 'correct' ? 'text-brand-green' : 'text-brand-red'}`}>
                {feedback === 'correct' ? '✓ Correct!' : `✗ The answer is "${correctAnswer?.textEn ?? ''}"`}
              </p>
              <p className={`text-xs leading-snug ${feedback === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                {currentQuestion.answerMeaning}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`flex-none font-bold px-5 py-2 rounded-xl text-sm uppercase tracking-wide cursor-pointer transition-opacity duration-300 hover:opacity-90 ${
                feedback === 'correct' ? 'bg-brand-green text-white' : 'bg-brand-red text-white'
              } ${nextVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              {questionIdx + 1 < exercise.questions.length ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
