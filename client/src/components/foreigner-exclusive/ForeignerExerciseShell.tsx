import type { ForeignerExercise } from '../../types/foreignerExclusive';
import { isForeignerSms, isWhatsAppDialogue } from '../../types/foreignerExclusive';
import type { Exercise } from '../../types/lesson';
import { ExerciseShell } from '../exercises/ExerciseShell';
import { ForeignerSmsDialogue } from './ForeignerSmsDialogue';
import { ForeignerWhatsAppDialogue } from './ForeignerWhatsAppDialogue';

interface Props {
  exercise: ForeignerExercise;
  exerciseIndex: number;
  onComplete: (correct: boolean) => void;
  onAnswer?: (correct: boolean) => void;
}

export function ForeignerExerciseShell({ exercise, exerciseIndex, onComplete, onAnswer }: Props) {
  if (isWhatsAppDialogue(exercise)) {
    return (
      <ForeignerWhatsAppDialogue
        exercise={exercise}
        onDone={() => onComplete(true)}
        onAnswer={onAnswer}
      />
    );
  }

  if (isForeignerSms(exercise)) {
    return (
      <ForeignerSmsDialogue
        exercise={exercise}
        onDone={() => onComplete(true)}
        onAnswer={onAnswer}
      />
    );
  }

  return (
    <ExerciseShell
      exercise={exercise as Exercise}
      exerciseIndex={exerciseIndex}
      onComplete={onComplete}
      onAnswer={onAnswer}
      onFailed={() => {}}
      reviewPairs={[]}
    />
  );
}
