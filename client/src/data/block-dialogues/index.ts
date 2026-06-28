import type { BlockDialogue } from '../../types/blockDialogue';
import block1DialogueData from './block1-dialogue.json';
import block2Dialogue from './block2-dialogue.json';
import block3Dialogue from './block3-dialogue.json';
import block4Dialogue from './block4-dialogue.json';
import block5Dialogue from './block5-dialogue.json';
import block6Dialogue from './block6-dialogue.json';
import block7Dialogue from './block7-dialogue.json';
import block8Dialogue from './block8-dialogue.json';
import block9Dialogue from './block9-dialogue.json';

export const blockDialogues: BlockDialogue[] = [
  block1DialogueData as unknown as BlockDialogue,
  block2Dialogue as unknown as BlockDialogue,
  block3Dialogue as unknown as BlockDialogue,
  block4Dialogue as unknown as BlockDialogue,
  block5Dialogue as unknown as BlockDialogue,
  block6Dialogue as unknown as BlockDialogue,
  block7Dialogue as unknown as BlockDialogue,
  block8Dialogue as unknown as BlockDialogue,
  block9Dialogue as unknown as BlockDialogue,
];

export function getBlockDialogueById(blockId: string): BlockDialogue | undefined {
  return blockDialogues.find((d) => d.blockId === blockId);
}

