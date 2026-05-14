import type { Lesson } from '../types/lesson';

export interface RaceQuestion {
  prompt: string;
  subPrompt?: string;
  choices: string[];
  answer: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(pool: string[], exclude: string): string[] {
  return shuffle([...new Set(pool)].filter((e) => e !== exclude)).slice(0, 3);
}

export function buildRacePool(lessons: Lesson[]): RaceQuestion[] {
  // Collect all English meanings for distractor generation on vocab questions
  const englishPool: string[] = [];
  for (const lesson of lessons) {
    for (const ex of lesson.exercises) {
      if (ex.type === 'VOCABULARY_TABLE') {
        ex.rows.forEach((r) => englishPool.push(r.english));
      } else if (ex.type === 'LISTEN_AND_PICK' || ex.type === 'PICK_TRANSLATION') {
        ex.words.forEach((w) => englishPool.push(w.english));
      }
    }
  }

  const questions: RaceQuestion[] = [];

  for (const lesson of lessons) {
    for (const ex of lesson.exercises) {
      if (ex.type === 'VOCABULARY_TABLE') {
        for (const row of ex.rows) {
          const distractors = pickDistractors(englishPool, row.english);
          if (distractors.length < 3) continue;
          questions.push({
            prompt: row.slovak,
            choices: shuffle([row.english, ...distractors]),
            answer: row.english,
          });
        }
      } else if (ex.type === 'LISTEN_AND_PICK' || ex.type === 'PICK_TRANSLATION') {
        for (const word of ex.words) {
          const distractors = pickDistractors(englishPool, word.english);
          if (distractors.length < 3) continue;
          questions.push({
            prompt: word.slovak,
            choices: shuffle([word.english, ...distractors]),
            answer: word.english,
          });
        }
      } else if (ex.type === 'SITUATIONAL_CHOICE') {
        for (const s of ex.scenarios) {
          questions.push({
            prompt: s.situation,
            choices: shuffle([...s.choices]),
            answer: s.answer,
          });
        }
      } else if (ex.type === 'NUMBER_TO_WORDS') {
        for (const item of ex.items) {
          questions.push({
            prompt: item.number,
            choices: shuffle([...item.choices]),
            answer: item.answer,
          });
        }
      } else if (ex.type === 'FILL_IN_BLANK_PICK') {
        for (const item of ex.items) {
          questions.push({
            prompt: item.sentence,
            subPrompt: item.translation,
            choices: shuffle([...item.choices]),
            answer: item.answer,
          });
        }
      } else if (ex.type === 'MULTIPLE_CHOICE') {
        questions.push({
          prompt: ex.prompt,
          choices: shuffle([...ex.choices]),
          answer: ex.answer,
        });
      }
    }
  }

  // Deduplicate by prompt+answer (same word can appear in multiple exercise types)
  const seen = new Set<string>();
  const unique = questions.filter((q) => {
    const key = `${q.prompt}|||${q.answer}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return shuffle(unique);
}
