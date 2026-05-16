export interface DialogueChoice {
  id: string;
  text: string;
  translation: string;
  isCorrect: boolean;
  nextNode?: string;
  usesVocab: string[];
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  translation: string;
  choices?: DialogueChoice[];
  isEndNode?: boolean;
  outcome?: string;
  autoAdvance?: boolean;
  nextNode?: string;
  wrongAnswerResponse?: string;
  wrongAnswerTranslation?: string;
}

export interface DialogueCharacter {
  name: string;
  role: string;
  avatar: string;
  wrongAnswerResponse?: string;
  wrongAnswerTranslation?: string;
}

export interface DialogueOutcome {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
}

export interface EmergencyWrongNumber {
  response: string;
  responseTranslation: string;
  redirect?: string;
  redirectTranslation?: string;
  note?: string;
}

export interface EmergencyScenario {
  id: string;
  situation: string;
  situationTranslation: string;
  correctNumber: string;
  outcome: string;
  wrongNumbers: Record<string, EmergencyWrongNumber>;
}

export interface Dialogue {
  id: string;
  tier: number;
  stageRequired: string;
  topic: string;
  description: string;
  icon: string;
  character: DialogueCharacter;
  outcomes: Record<string, DialogueOutcome>;
  nodes: DialogueNode[];
  emergencyMode?: boolean;
  scenarios?: EmergencyScenario[];
  callNodes?: Record<string, DialogueNode[]>;
}
