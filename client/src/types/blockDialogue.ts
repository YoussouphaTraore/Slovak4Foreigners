export interface BlockDialogueChoice {
  id: string;
  text: string;
  translation: string;
  isCorrect: boolean;
}

export interface BlockDialogueExchange {
  id: string;
  speaker: string;
  text: string;
  translation: string;
  prompt: string;
  isOpenQuestion: boolean;
  choices: BlockDialogueChoice[];
  correctFeedback: string;
  wrongFeedback: string;
}

export interface BlockDialogueContact {
  name: string;
  initials: string;
  role: string;
  avatar: string;
}

export interface BlockDialogueSpeaker {
  name: string;
  initials: string;
  avatar: string;
}

export interface BlockDialogue {
  id: string;
  stageId: string;
  stageName: string;
  blockId: string;
  type: 'BLOCK_DIALOGUE';
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  contact: BlockDialogueContact;
  speakers?: Record<string, BlockDialogueSpeaker>;
  context: string;
  exchanges: BlockDialogueExchange[];
  completionMessage: string;
}
