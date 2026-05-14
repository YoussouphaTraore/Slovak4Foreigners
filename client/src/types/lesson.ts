export type ExerciseType =
  | 'LISTEN_AND_PICK'
  | 'PICK_TRANSLATION'
  | 'SITUATIONAL_CHOICE'
  | 'TRANSLATE_TO_ENGLISH'
  | 'TRANSLATE_TO_SLOVAK'
  | 'MULTIPLE_CHOICE'
  | 'WORD_MATCH'
  | 'FILL_IN_BLANK'
  | 'LISTEN_AND_TYPE'
  | 'WORD_MATCH_REVIEW'
  | 'LISTEN_AND_IDENTIFY'
  | 'FILL_IN_BLANK_PICK'
  | 'UNSCRAMBLE'
  | 'VOCABULARY_TABLE'
  | 'NUMBER_TO_WORDS';

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  hint?: string;
}

export interface ListenAndPickExercise extends BaseExercise {
  type: 'LISTEN_AND_PICK';
  words: { slovak: string; english: string }[];
}

export interface PickTranslationExercise extends BaseExercise {
  type: 'PICK_TRANSLATION';
  words: { slovak: string; english: string }[];
}

export interface SituationalChoiceExercise extends BaseExercise {
  type: 'SITUATIONAL_CHOICE';
  scenarios: {
    situation: string;
    instruction?: string;
    choices: string[];
    answer: string;
    answerMeaning: string;
  }[];
}

export interface TranslateExercise extends BaseExercise {
  type: 'TRANSLATE_TO_ENGLISH' | 'TRANSLATE_TO_SLOVAK';
  prompt: string;
  answer: string;
  acceptedAnswers: string[];
  audio?: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'MULTIPLE_CHOICE';
  prompt: string;
  choices: string[];
  answer: string;
}

export interface WordMatchExercise extends BaseExercise {
  type: 'WORD_MATCH';
  pairs: { slovak: string; english: string }[];
}

export interface FillInBlankExercise extends BaseExercise {
  type: 'FILL_IN_BLANK';
  sentence: string;
  answer: string;
}

export interface ListenAndTypeExercise extends BaseExercise {
  type: 'LISTEN_AND_TYPE';
  audioText: string;
  answer: string;
}

export interface WordMatchReviewExercise extends BaseExercise {
  type: 'WORD_MATCH_REVIEW';
}

export interface UnscrambleExercise extends BaseExercise {
  type: 'UNSCRAMBLE';
  items: {
    word: string;    // the correct Slovak word
    context: string; // clue describing what the word means
  }[];
}

export interface VocabularyTableExercise extends BaseExercise {
  type: 'VOCABULARY_TABLE';
  title: string;
  headers?: [string, string, string]; // column labels, defaults to ["When", "Slovak", "English"]
  rows: {
    label: string;   // situation label, e.g. "Morning"
    slovak: string;  // e.g. "Dobré ráno" — also spoken by TTS on tap
    english: string; // e.g. "Good morning"
  }[];
}

export interface FillInBlankPickExercise extends BaseExercise {
  type: 'FILL_IN_BLANK_PICK';
  items: {
    sentence: string;     // Slovak sentence — blank marked as ___
    translation: string;  // English translation — blank marked as ___
    choices: string[];    // 4 word options
    answer: string;       // correct choice
  }[];
}

export interface ListenAndIdentifyExercise extends BaseExercise {
  type: 'LISTEN_AND_IDENTIFY';
  wordPool: string[];
  speechLang?: string;
  items: {
    sentence: string;
    targetWords: string[];
  }[];
}

export interface NumberToWordsExercise extends BaseExercise {
  type: 'NUMBER_TO_WORDS';
  items: {
    number: string;   // e.g. "150"
    choices: string[]; // 4 Slovak text options
    answer: string;   // correct Slovak text
  }[];
}

export type Exercise =
  | ListenAndPickExercise
  | PickTranslationExercise
  | SituationalChoiceExercise
  | TranslateExercise
  | MultipleChoiceExercise
  | WordMatchExercise
  | FillInBlankExercise
  | ListenAndTypeExercise
  | WordMatchReviewExercise
  | ListenAndIdentifyExercise
  | FillInBlankPickExercise
  | UnscrambleExercise
  | VocabularyTableExercise
  | NumberToWordsExercise;

export interface Lesson {
  id: string;
  stageId: string;
  stageName: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  exercises: Exercise[];
}
