import { topicById, block1TopicIds, block2TopicIds, block3TopicIds, block4TopicIds, block5TopicIds, block6TopicIds, block7TopicIds, block8TopicIds, block9TopicIds, block10TopicIds } from './stage1Topics';

export interface BlockConfig {
  blockId: string;
  blockName: string;
  topicIds?: string[];
  lessonIds?: string[];
}

// Returns the flat ordered lesson ID list for a block, regardless of whether it
// uses topicIds (Stage 1) or lessonIds (Stage 2+).
export function getBlockLessonIds(block: BlockConfig): string[] {
  if (block.topicIds) {
    return block.topicIds.flatMap(id => topicById[id]?.lessonIds ?? []);
  }
  return block.lessonIds ?? [];
}

export const stage1Blocks: BlockConfig[] = [
  { blockId: 'stage1-block1', blockName: 'Core Communication', topicIds: block1TopicIds },
  { blockId: 'stage1-block2', blockName: 'Identity',           topicIds: block2TopicIds },
  { blockId: 'stage1-block3', blockName: 'Numbers & Time',     topicIds: block3TopicIds },
  { blockId: 'stage1-block4', blockName: 'Where You Are',      topicIds: block4TopicIds },
  { blockId: 'stage1-block5', blockName: 'Emergency & Medical', topicIds: block5TopicIds },
  { blockId: 'stage1-block6', blockName: 'Food',           topicIds: block6TopicIds },
  { blockId: 'stage1-block7', blockName: 'Getting Around', topicIds: block7TopicIds },
  { blockId: 'stage1-block8', blockName: 'At Home',        topicIds: block8TopicIds },
  { blockId: 'stage1-block9',  blockName: 'Shopping & Clothes', topicIds: block9TopicIds },
  { blockId: 'stage1-block10', blockName: 'Education & Work',   topicIds: block10TopicIds },
];

export const stage1LessonOrder = stage1Blocks.flatMap(b => getBlockLessonIds(b));

// Stage 2 - Settling In. Block structure is a work in progress; expand as lessons are added.
export const stage2Blocks: BlockConfig[] = [
  {
    blockId: 'stage2-block1',
    blockName: 'Real People, Real Slovak',
    lessonIds: ['s2-marek-introduction', 's2-sara-introduction', 's2-marek-sara-meeting', 's2-introduce-yourself'],
  },
];

export const stage2LessonOrder = stage2Blocks.flatMap(b => getBlockLessonIds(b));

export function getCumulativeLessonIds(blockId: string): string[] {
  const blockIndex = stage1Blocks.findIndex(b => b.blockId === blockId);
  if (blockIndex === -1) return [];
  return stage1Blocks.slice(0, blockIndex + 1).flatMap(b => getBlockLessonIds(b));
}

export function getNextBlock(blockId: string): BlockConfig | null {
  const blockIndex = stage1Blocks.findIndex(b => b.blockId === blockId);
  if (blockIndex === -1 || blockIndex === stage1Blocks.length - 1) return null;
  return stage1Blocks[blockIndex + 1];
}

export function isLastBlock(blockId: string): boolean {
  return stage1Blocks[stage1Blocks.length - 1].blockId === blockId;
}

