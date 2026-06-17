import { lessons } from '../data/lessons';

export function getLessonRef(lessonId: string): string {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return lessonId;
  return lesson.title;
}

export function ref(lessonId: string): string {
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return `(${lessonId})`;
  return `(${lesson.title})`;
}
