export interface BlockConfig {
  blockId: string;
  blockName: string;
  lessonIds: string[];
}

// Stages with production-ready content. Stages not in this list are fully
// hidden from production users (still rendered in dev for reference) until
// they're reworked with the Stage 1 block system and added here.
export const PRODUCTION_VISIBLE_STAGES = ['survival'];

export const stage1Blocks: BlockConfig[] = [
  {
    blockId: 'stage1-block1',
    blockName: 'Core Communication',
    lessonIds: ['s1-first-words', 's1-verbs', 's1-greetings', 's1-how-are-you', 's1-dont-understand'],
  },
  {
    blockId: 'stage1-block2',
    blockName: 'Identity',
    lessonIds: ['s1-who-i-am', 's1-describing-yourself', 's1-body-parts', 's1-colors', 's1-family'],
  },
  {
    blockId: 'stage1-block3',
    blockName: 'Numbers & Time',
    lessonIds: ['s1-cardinal-numbers', 's1-money', 's1-times-of-day', 's1-days-of-week', 's1-weeks-of-month', 's1-months-of-year'],
  },
  {
    blockId: 'stage1-block4',
    blockName: 'Where You Are',
    lessonIds: ['s1-my-address', 's1-directions', 's1-positions', 's1-emergency'],
  },
  {
    blockId: 'stage1-block5',
    blockName: 'Emergency',
    lessonIds: ['s1-hospital', 's1-pharmacy'],
  },
  {
    blockId: 'stage1-block6',
    blockName: 'Daily Life',
    lessonIds: ['s1-food', 's1-ordering-food', 's1-transport', 's1-tram-bus', 's1-taxi', 's1-flat-items', 's1-pets', 's1-beverages', 's1-supermarket'],
  },
];

export const stage1LessonOrder = stage1Blocks.flatMap((b) => b.lessonIds);

export function getCumulativeLessonIds(blockId: string): string[] {
  const blockIndex = stage1Blocks.findIndex((b) => b.blockId === blockId);
  if (blockIndex === -1) return [];
  return stage1Blocks.slice(0, blockIndex + 1).flatMap((b) => b.lessonIds);
}

export function getNextBlock(blockId: string): BlockConfig | null {
  const blockIndex = stage1Blocks.findIndex((b) => b.blockId === blockId);
  if (blockIndex === -1 || blockIndex === stage1Blocks.length - 1) return null;
  return stage1Blocks[blockIndex + 1];
}

export function isLastBlock(blockId: string): boolean {
  return stage1Blocks[stage1Blocks.length - 1].blockId === blockId;
}
