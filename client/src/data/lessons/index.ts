import type { Lesson } from '../../types/lesson';
import survival1 from './survival-1.json';
import survival2 from './survival-2.json';
import survival3 from './survival-3.json';
import survival4 from './survival-4.json';
import survival5 from './survival-5.json';
import survival6 from './survival-6.json';
import survival7 from './survival-7.json';
import settling1 from './settling-1.json';
import settling2 from './settling-2.json';
import settling3 from './settling-3.json';
import settling4 from './settling-4.json';
import settling5 from './settling-5.json';
import settling6 from './settling-6.json';
import advanced1 from './advanced-1.json';
import advanced2 from './advanced-2.json';
import advanced3 from './advanced-3.json';
import advanced4 from './advanced-4.json';

export const lessons: Lesson[] = [
  survival1 as unknown as Lesson,
  survival2 as unknown as Lesson,
  survival3 as unknown as Lesson,
  survival4 as unknown as Lesson,
  survival5 as unknown as Lesson,
  survival6 as unknown as Lesson,
  survival7 as unknown as Lesson,
  settling1 as unknown as Lesson,
  settling2 as unknown as Lesson,
  settling3 as unknown as Lesson,
  settling4 as unknown as Lesson,
  settling5 as unknown as Lesson,
  settling6 as unknown as Lesson,
  advanced1 as unknown as Lesson,
  advanced2 as unknown as Lesson,
  advanced3 as unknown as Lesson,
  advanced4 as unknown as Lesson,
];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
