import type { Exercise } from './lesson';

export interface ForeignerSmsMessage {
  sender: string;
  text: string;
}

export interface ForeignerSmsQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

// SMS_DIALOGUE variant with messages+questions (different from the turns-based one in lesson types)
export interface ForeignerSmsExercise {
  id: string;
  type: 'SMS_DIALOGUE';
  title?: string;
  description?: string;
  messages: ForeignerSmsMessage[];
  questions: ForeignerSmsQuestion[];
}

// ── WHATSAPP_DIALOGUE ─────────────────────────────────────────────────────

export interface WhatsAppChoice {
  id: string;
  text: string;
  translation: string;
  isCorrect: boolean;
  nextNode?: string;
  usesVocab: string[];
}

export interface WhatsAppOutcome {
  id: string;
  title: string;
  description: string;
  xpBonus: number;
}

export interface WhatsAppNode {
  id: string;
  speaker: 'user' | 'landlord';
  // user-speaker nodes
  prompt?: string;
  // landlord-speaker nodes
  text?: string;
  translation?: string;
  // both
  wrongAnswerResponse?: string;
  wrongAnswerTranslation?: string;
  choices?: WhatsAppChoice[];
  // auto-advance (landlord sends a second message without waiting for user input)
  autoAdvance?: boolean;
  nextNode?: string;
  // end nodes
  isEndNode?: boolean;
  outcome?: string;
}

export interface WhatsAppDialogueExercise {
  id: string;
  type: 'WHATSAPP_DIALOGUE';
  contact: { name: string; initials: string; role: string; status: string };
  context: string;
  outcomes: Record<string, WhatsAppOutcome>;
  nodes: WhatsAppNode[];
  questions: ForeignerSmsQuestion[];
}

export type ForeignerExercise = Exercise | ForeignerSmsExercise | WhatsAppDialogueExercise;

export interface ReferenceCardItem {
  item: string;
  slovak: string;
  warning: string | null;
}

export interface ReferenceCard {
  id: string;
  title: string;
  titleSlovak: string;
  unlockedMessage: string;
  checklist: ReferenceCardItem[];
  keyFacts: string[];
  keyPhrase: { english: string; slovak: string };
  whereToApply: string;
  freeHelp: string;
}

export interface ForeignerExclusiveLesson {
  id: string;
  stageId: string;
  stageName: string;
  category: string;
  categoryName: string;
  title: string;
  titleSlovak: string;
  description: string;
  icon: string;
  xpReward: number;
  isPremium: boolean;
  coming_soon?: boolean;
  unlocksReferenceCard: string;
  exercises: ForeignerExercise[];
  referenceCard?: ReferenceCard;
}

export function isForeignerSms(ex: ForeignerExercise): ex is ForeignerSmsExercise {
  return ex.type === 'SMS_DIALOGUE' && 'messages' in ex;
}

export function isWhatsAppDialogue(ex: ForeignerExercise): ex is WhatsAppDialogueExercise {
  return ex.type === 'WHATSAPP_DIALOGUE';
}
