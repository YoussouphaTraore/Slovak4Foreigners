export interface YesNoAnswer {
  sk: string;
  en: string;
  chunks: string[];
}

export interface SpeakingChoice {
  id: string;
  label: string;
  sk: string;
  en: string;
  chunks: string[];
}

export interface SpeakingQuestion {
  id: string;
  marekAudioUrl: string;
  marekQuestionSk: string;
  marekQuestionEn: string;
  correctAnswerSk: string | null;
  correctAnswerEn: string | null;
  answerChunks: string[];
  isYesNo: boolean;
  yesAnswer?: YesNoAnswer | null;
  noAnswer?: YesNoAnswer | null;
  choices?: SpeakingChoice[] | null;
  personalData?: string | null;
  speakerName?: string | null;
}

export interface ConversationSpeakingExercise {
  id: string;
  type: 'CONVERSATION_SPEAKING';
  questions: SpeakingQuestion[];
  dynamic?: 'countries';
}
