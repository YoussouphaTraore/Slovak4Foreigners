export interface SentenceBuilderItem {
  id: string;
  promptEn: string;
  targetSk: string[];
  bankChunks: string[];
}

export interface ConversationSentenceBuilderExercise {
  id: string;
  type: 'CONVERSATION_SENTENCE_BUILDER';
  sentences: SentenceBuilderItem[];
  dynamic?: 'countries';
}
