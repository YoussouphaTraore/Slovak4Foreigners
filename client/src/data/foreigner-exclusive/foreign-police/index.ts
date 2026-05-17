import type { ForeignerExclusiveLesson } from '../../../types/foreignerExclusive';
import temporaryResidence from './temporary-residence.json';
import permanentResidence from './permanent-residence.json';
import longTermResidence from './long-term-residence.json';
import euFamilyMember from './eu-family-member.json';
import studentResidence from './student-residence.json';

export const foreignPoliceLessons: ForeignerExclusiveLesson[] = [
  temporaryResidence as unknown as ForeignerExclusiveLesson,
  permanentResidence as unknown as ForeignerExclusiveLesson,
  longTermResidence as unknown as ForeignerExclusiveLesson,
  euFamilyMember as unknown as ForeignerExclusiveLesson,
  studentResidence as unknown as ForeignerExclusiveLesson,
];
