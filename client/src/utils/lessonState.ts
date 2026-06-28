import { lessons } from '../data/lessons';
import { stage1Blocks, getBlockLessonIds } from '../config/stageBlocks';
import { stage1Topics } from '../config/stage1Topics';

export type NodeState = 'completed' | 'available' | 'locked' | 'block_locked' | 'topic_locked';

const isDev = import.meta.env.DEV;

export function getLessonState(
  index: number,
  completedLessons: string[],
  passedBlocks: string[],
  passedTopics: string[] = [],
): NodeState {
  const lesson = lessons[index];

  if (lesson.coming_soon) return 'locked';

  if (isDev) return completedLessons.includes(lesson.id) ? 'completed' : 'available';

  const blockIndex = stage1Blocks.findIndex((b) => getBlockLessonIds(b).includes(lesson.id));
  if (blockIndex > 0) {
    const previousBlock = stage1Blocks[blockIndex - 1];
    if (!passedBlocks.includes(previousBlock.blockId)) return 'block_locked';
  }

  // Topic gate: first lesson of topic N (N > 0 in its block) is locked until topic N-1 race is passed
  const topicForLesson = stage1Topics.find((t) => t.lessonIds.includes(lesson.id));
  if (topicForLesson) {
    const block = stage1Blocks[blockIndex];
    if (block?.topicIds) {
      const topicIdxInBlock = block.topicIds.indexOf(topicForLesson.id);
      if (topicIdxInBlock > 0) {
        const prevTopicId = block.topicIds[topicIdxInBlock - 1];
        if (!passedTopics.includes(prevTopicId)) return 'topic_locked';
      }
    }
  }

  if (completedLessons.includes(lesson.id)) return 'completed';

  let prevIndex = index - 1;
  while (prevIndex >= 0 && lessons[prevIndex].coming_soon) prevIndex--;

  if (prevIndex < 0 || completedLessons.includes(lessons[prevIndex].id)) return 'available';
  return 'locked';
}
