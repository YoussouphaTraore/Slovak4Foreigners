import type { Lesson } from '../../types/lesson';
import survival1 from './survival-1.json';
import survival2 from './survival-2.json';
import survival3 from './survival-3.json';
import survival4 from './survival-4.json';
import survival5 from './survival-5.json';
import survival6 from './survival-6.json';

export const lessons: Lesson[] = [
  survival1 as unknown as Lesson,
  survival2 as unknown as Lesson,
  survival3 as unknown as Lesson,
  survival4 as unknown as Lesson,
  survival5 as unknown as Lesson,
  survival6 as unknown as Lesson,
];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
