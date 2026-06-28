export interface ConversationListenExercise {
  id: string;
  type: 'CONVERSATION_LISTEN';
  coverImage?: string;
  audioUrl: string;
  conversationTranscriptSk?: string;
  speakers: { name: string; avatar: string }[];
  dynamic?: 'countries';
}

export interface ConversationWordRecognitionExercise {
  id: string;
  type: 'CONVERSATION_WORD_RECOGNITION';
  instruction: string;
  passThresholdPercent: number;
  correctWords: string[];
  distractorWords: string[];
  dynamic?: 'countries';
}

export interface ComprehensionAnswer {
  id: string;
  textEn: string;
  isCorrect: boolean;
}

export interface ComprehensionQuestion {
  id: string;
  questionEn: string;
  answerMeaning: string;
  answers: ComprehensionAnswer[];
  reviewPair?: { slovak: string; english: string };
}

export interface ConversationComprehensionExercise {
  id: string;
  type: 'CONVERSATION_COMPREHENSION';
  topicId?: string;
  coverImage?: string;
  audioUrl: string;
  xpReward?: number;
  conversationTranscriptSk?: string;
  speakers: { name: string; avatar: string }[];
  questions: ComprehensionQuestion[];
  dynamic?: 'countries';
}
