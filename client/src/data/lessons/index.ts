import type { Lesson } from '../../types/lesson';
import s1FirstWords from './s1-first-words.json';
import s1Verbs from './s1-verbs.json';
import s1Greetings from './s1-greetings.json';
import s1HowAreYou from './s1-how-are-you.json';
import s1DontUnderstand from './s1-dont-understand.json';
import s1WhoIAm from './s1-who-i-am.json';
import s1DescribingYourself from './s1-describing-yourself.json';
import s1BodyParts from './s1-body-parts.json';
import s1Colors from './s1-colors.json';
import s1Family from './s1-family.json';
import s1CardinalNumbers from './s1-cardinal-numbers.json';
import s1Money from './s1-money.json';
import s1TimesOfDay from './s1-times-of-day.json';
import s1DaysOfWeek from './s1-days-of-week.json';
import s1WeeksOfMonth from './s1-weeks-of-month.json';
import s1MonthsOfYear from './s1-months-of-year.json';
import s1MyAddress from './s1-my-address.json';
import s1Directions from './s1-directions.json';
import s1Positions from './s1-positions.json';
import s1Emergency from './s1-emergency.json';
import s1Hospital from './s1-hospital.json';
import s1Pharmacy from './s1-pharmacy.json';
import s1Food from './s1-food.json';
import s1OrderingFood from './s1-ordering-food.json';
import s1Transport from './s1-transport.json';
import s1TramBus from './s1-tram-bus.json';
import s1Taxi from './s1-taxi.json';
import s1FlatItems from './s1-flat-items.json';
import s1Pets from './s1-pets.json';
import s1Beverages from './s1-beverages.json';
import s1Supermarket from './s1-supermarket.json';
import s2MarekIntroduction from './s2-marek-introduction.json';
import s2SaraIntroduction from './s2-sara-introduction.json';
import s2MarekSaraMeeting from './s2-marek-sara-meeting.json';
import advanced1 from './advanced-1.json';
import advanced2 from './advanced-2.json';
import advanced3 from './advanced-3.json';
import advanced4 from './advanced-4.json';

export const lessons: Lesson[] = [
  s1FirstWords as unknown as Lesson,
  s1Verbs as unknown as Lesson,
  s1Greetings as unknown as Lesson,
  s1HowAreYou as unknown as Lesson,
  s1DontUnderstand as unknown as Lesson,
  s1WhoIAm as unknown as Lesson,
  s1DescribingYourself as unknown as Lesson,
  s1BodyParts as unknown as Lesson,
  s1Colors as unknown as Lesson,
  s1Family as unknown as Lesson,
  s1CardinalNumbers as unknown as Lesson,
  s1Money as unknown as Lesson,
  s1TimesOfDay as unknown as Lesson,
  s1DaysOfWeek as unknown as Lesson,
  s1WeeksOfMonth as unknown as Lesson,
  s1MonthsOfYear as unknown as Lesson,
  s1MyAddress as unknown as Lesson,
  s1Directions as unknown as Lesson,
  s1Positions as unknown as Lesson,
  s1Emergency as unknown as Lesson,
  s1Hospital as unknown as Lesson,
  s1Pharmacy as unknown as Lesson,
  s1Food as unknown as Lesson,
  s1OrderingFood as unknown as Lesson,
  s1Transport as unknown as Lesson,
  s1TramBus as unknown as Lesson,
  s1Taxi as unknown as Lesson,
  s1FlatItems as unknown as Lesson,
  s1Pets as unknown as Lesson,
  s1Beverages as unknown as Lesson,
  s1Supermarket as unknown as Lesson,
  s2MarekIntroduction as unknown as Lesson,
  s2SaraIntroduction as unknown as Lesson,
  s2MarekSaraMeeting as unknown as Lesson,
  advanced1 as unknown as Lesson,
  advanced2 as unknown as Lesson,
  advanced3 as unknown as Lesson,
  advanced4 as unknown as Lesson,
];

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}
