import { type Country } from '../data/countries';
import type { Exercise } from '../types/lesson';

export function hydrateCountryExercise(exercise: Exercise, countries: Country[]): Exercise {
  if (exercise.dynamic !== 'countries') return exercise;

  if (exercise.type === 'VOCABULARY_TABLE') {
    return {
      ...exercise,
      rows: countries.map(c => ({
        label: c.en,
        slovak: `Som ${c.gen}.`,
        english: `I am from ${c.en}.`,
      })),
    };
  }

  if (exercise.type === 'LISTEN_AND_PICK' || exercise.type === 'PICK_TRANSLATION') {
    return {
      ...exercise,
      words: countries.map(c => ({ slovak: c.sk, english: c.en })),
    };
  }

  if (exercise.type === 'SITUATIONAL_CHOICE') {
    const scenarios = countries.map((country, i) => {
      const others = countries.filter((_, j) => j !== i);
      const correct = `Som ${country.gen}.`;
      const wrongChoices = others.slice(0, 3).map(c => `Som ${c.gen}.`);
      // Rotate correct answer position across scenarios (0→1→2→3→0…)
      const choices = [...wrongChoices];
      choices.splice(i % 4, 0, correct);

      return {
        situation: `Someone is from ${country.en}. They say...`,
        instruction: 'Choose the correct phrase',
        choices,
        answer: correct,
        answerMeaning: `I am from ${country.en}.`,
      };
    });

    return { ...exercise, scenarios };
  }

  return exercise;
}
