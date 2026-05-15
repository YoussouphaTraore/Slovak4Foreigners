import { useState, useCallback } from 'react';
import type { Exercise } from '../../types/lesson';
import { flexMatch } from '../../utils/normalize';
import { ListenAndPickExercise } from './ListenAndPickExercise';
import { PickTranslationExercise } from './PickTranslationExercise';
import { SituationalChoiceExercise } from './SituationalChoiceExercise';
import { WordBankTranslate } from './WordBankTranslate';
import { TranslateExercise } from './TranslateExercise';
import { MultipleChoiceExercise } from './MultipleChoiceExercise';
import { WordMatchExercise } from './WordMatchExercise';
import { FillInBlankExercise } from './FillInBlankExercise';
import { ListenAndTypeExercise } from './ListenAndTypeExercise';
import { WordMatchReview } from './WordMatchReview';
import { ListenAndIdentifyExercise } from './ListenAndIdentifyExercise';
import { FillInBlankPickExercise } from './FillInBlankPickExercise';
import { UnscrambleExercise } from './UnscrambleExercise';
import { VocabularyTableExercise } from './VocabularyTableExercise';
import { NumberToWordsExercise } from './NumberToWordsExercise';
import { SmsDialogueExercise } from './SmsDialogueExercise';
import { DiacriticKeyboard } from './DiacriticKeyboard';
import { FeedbackBanner } from '../ui/FeedbackBanner';

type InputEl = HTMLInputElement | HTMLTextAreaElement;
type KbReg = { ref: React.RefObject<InputEl | null>; onChange: (v: string) => void } | null;

interface Props {
  exercise: Exercise;
  exerciseIndex: number;
  onComplete: (correct: boolean) => void;
  onFailed?: (words: { slovak: string; english: string }[]) => void;
  onAnswer?: (correct: boolean) => void;
  reviewPairs?: { slovak: string; english: string }[];
}

type Phase = 'answering' | 'feedback';

function getTypeBadge(ex: Exercise): string {
  switch (ex.type) {
    case 'LISTEN_AND_PICK':      return 'Listen & pick';
    case 'PICK_TRANSLATION':     return 'Pick the translation';
    case 'SITUATIONAL_CHOICE':   return 'What would you say?';
    case 'TRANSLATE_TO_ENGLISH': return 'Translate';
    case 'TRANSLATE_TO_SLOVAK':  return 'Write in Slovak';
    case 'MULTIPLE_CHOICE':      return 'Multiple choice';
    case 'WORD_MATCH':           return 'Word match';
    case 'FILL_IN_BLANK':        return 'Fill in blank';
    case 'LISTEN_AND_TYPE':      return 'Listen & type';
    case 'WORD_MATCH_REVIEW':      return 'Review';
    case 'LISTEN_AND_IDENTIFY':  return 'Listen & identify';
    case 'FILL_IN_BLANK_PICK':   return 'Fill in the blank';
    case 'UNSCRAMBLE':           return 'Unscramble';
    case 'VOCABULARY_TABLE':     return 'Learn these words';
    case 'NUMBER_TO_WORDS':      return 'Number to words';
    case 'SMS_DIALOGUE':         return 'Conversation';
  }
}

function validate(exercise: Exercise, answer: string): { correct: boolean; correctAnswer: string } {
  switch (exercise.type) {
    case 'LISTEN_AND_PICK':
    case 'PICK_TRANSLATION':
    case 'SITUATIONAL_CHOICE':
      return { correct: true, correctAnswer: '' };
    case 'TRANSLATE_TO_ENGLISH':
    case 'TRANSLATE_TO_SLOVAK':
      return { correct: exercise.acceptedAnswers.some((a) => flexMatch(answer, a)), correctAnswer: exercise.answer };
    case 'MULTIPLE_CHOICE':
      return { correct: answer === exercise.answer, correctAnswer: exercise.answer };
    case 'FILL_IN_BLANK':
      return { correct: flexMatch(answer, exercise.answer), correctAnswer: exercise.answer };
    case 'LISTEN_AND_TYPE':
      return { correct: flexMatch(answer, exercise.answer), correctAnswer: exercise.answer };
    case 'WORD_MATCH':
    case 'WORD_MATCH_REVIEW':
    case 'LISTEN_AND_IDENTIFY':
    case 'FILL_IN_BLANK_PICK':
    case 'UNSCRAMBLE':
    case 'VOCABULARY_TABLE':
    case 'NUMBER_TO_WORDS':
    case 'SMS_DIALOGUE':
      return { correct: true, correctAnswer: '' };
  }
}

export function ExerciseShell({ exercise, exerciseIndex, onComplete, onFailed, onAnswer, reviewPairs }: Props) {
  const [phase, setPhase] = useState<Phase>('answering');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [kbReg, setKbReg] = useState<KbReg>(null);

  if (exercise.type === 'WORD_MATCH_REVIEW') {
    const pairs = reviewPairs ?? [];
    if (pairs.length === 0) {
      return (
        <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4 text-center px-6">
          <img src="/snailExcited.png" alt="" className="w-28 h-28 object-contain" />
          <p className="text-2xl font-extrabold text-gray-800">Perfect score!</p>
          <p className="text-sm text-gray-400">You got every word right — nothing to review.</p>
          <button
            type="button"
            onClick={() => onComplete(true)}
            className="bg-brand-green text-white font-bold py-3 px-10 rounded-xl hover:opacity-90 cursor-pointer"
          >
            Continue
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <WordMatchReview pairs={pairs} onDone={() => onComplete(true)} onAnswer={onAnswer} />
      </div>
    );
  }

  if (exercise.type === 'LISTEN_AND_IDENTIFY') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <ListenAndIdentifyExercise exercise={exercise} onDone={() => onComplete(true)} onAnswer={onAnswer} />
      </div>
    );
  }

  if (exercise.type === 'FILL_IN_BLANK_PICK') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <FillInBlankPickExercise exercise={exercise} onDone={() => onComplete(true)} onAnswer={onAnswer} />
      </div>
    );
  }

  if (exercise.type === 'UNSCRAMBLE') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <UnscrambleExercise exercise={exercise} onDone={() => onComplete(true)} onAnswer={onAnswer} />
      </div>
    );
  }

  if (exercise.type === 'VOCABULARY_TABLE') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <VocabularyTableExercise exercise={exercise} onDone={() => onComplete(true)} />
      </div>
    );
  }

  if (exercise.type === 'NUMBER_TO_WORDS') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <NumberToWordsExercise exercise={exercise} onDone={() => onComplete(true)} onAnswer={onAnswer} />
      </div>
    );
  }

  if (exercise.type === 'SMS_DIALOGUE') {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <SmsDialogueExercise exercise={exercise} onDone={() => onComplete(true)} onAnswer={onAnswer} />
      </div>
    );
  }

  const isListenAndPick = exercise.type === 'LISTEN_AND_PICK' || exercise.type === 'PICK_TRANSLATION' || exercise.type === 'SITUATIONAL_CHOICE';
  const isWordMatch = exercise.type === 'WORD_MATCH';
  const isMC = exercise.type === 'MULTIPLE_CHOICE';
  const isWordBank = exercise.type === 'TRANSLATE_TO_ENGLISH';
  const needsCheckButton = !isListenAndPick && !isWordMatch && !isMC;
  const hasAnswer = answer.trim().length > 0;
  const disabled = phase === 'feedback';

  const handleRegisterInput = useCallback((reg: KbReg) => setKbReg(reg), []);

  const submitAnswer = useCallback((ans: string) => {
    const result = validate(exercise, ans);
    setFeedback(result);
    setShowResult(true);
    setPhase('feedback');
    onAnswer?.(result.correct);
  }, [exercise, onAnswer]);

  const handleMCCheck = (choice: string) => {
    if (phase === 'feedback') return;
    setAnswer(choice);
    submitAnswer(choice);
  };

  if (isListenAndPick) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {exercise.type === 'LISTEN_AND_PICK'
          ? <ListenAndPickExercise exercise={exercise} onDone={() => onComplete(true)} onAnswer={onAnswer} />
          : exercise.type === 'PICK_TRANSLATION'
          ? <PickTranslationExercise exercise={exercise} onDone={(f) => { onFailed?.(f); onComplete(true); }} onAnswer={onAnswer} />
          : <SituationalChoiceExercise exercise={exercise} onDone={(f) => { onFailed?.(f); onComplete(true); }} onAnswer={onAnswer} />
        }
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Type badge + exercise number */}
      <div className="flex items-center gap-2 mb-4 flex-none">
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          {getTypeBadge(exercise)}
        </span>
        <span className="text-sm text-gray-400">Ex {exerciseIndex + 1}</span>
      </div>

      {/* Exercise content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="animate-slide-in-right">
          {isWordBank ? (
            <WordBankTranslate
              exercise={exercise}
              onChange={setAnswer}
              disabled={disabled}
            />
          ) : exercise.type === 'TRANSLATE_TO_SLOVAK' ? (
            <TranslateExercise
              exercise={exercise}
              value={answer}
              onChange={setAnswer}
              disabled={disabled}
              onInputRef={handleRegisterInput}
            />
          ) : exercise.type === 'MULTIPLE_CHOICE' ? (
            <MultipleChoiceExercise
              exercise={exercise}
              selected={answer}
              onSelect={handleMCCheck}
              disabled={disabled}
              showResult={showResult}
            />
          ) : exercise.type === 'WORD_MATCH' ? (
            <WordMatchExercise
              exercise={exercise}
              onAllMatched={() => { setFeedback({ correct: true, correctAnswer: '' }); setPhase('feedback'); }}
            />
          ) : exercise.type === 'FILL_IN_BLANK' ? (
            <FillInBlankExercise
              exercise={exercise}
              value={answer}
              onChange={setAnswer}
              disabled={disabled}
              onInputRef={handleRegisterInput}
            />
          ) : exercise.type === 'LISTEN_AND_TYPE' ? (
            <ListenAndTypeExercise
              exercise={exercise}
              value={answer}
              onChange={setAnswer}
              disabled={disabled}
              onInputRef={handleRegisterInput}
            />
          ) : null}
        </div>
      </div>

      {/* Keyboard — docked above buttons, only for keyboard-input exercises */}
      {kbReg && !disabled && (
        <div className="flex-none pt-2">
          <DiacriticKeyboard targetRef={kbReg.ref} onChange={kbReg.onChange} />
        </div>
      )}

      {/* CHECK button */}
      {needsCheckButton && phase === 'answering' && (
        <div className="flex-none pt-3 pb-1">
          <button
            type="button"
            onClick={() => { if (hasAnswer) submitAnswer(answer); }}
            disabled={!hasAnswer}
            className={`w-full font-bold py-3.5 rounded-xl text-sm uppercase tracking-widest transition-all cursor-pointer ${
              hasAnswer
                ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Check
          </button>
        </div>
      )}

      {/* Feedback banner */}
      {phase === 'feedback' && feedback && (
        <FeedbackBanner
          correct={feedback.correct}
          correctAnswer={feedback.correctAnswer}
          onContinue={() => onComplete(feedback.correct)}
        />
      )}
    </div>
  );
}
