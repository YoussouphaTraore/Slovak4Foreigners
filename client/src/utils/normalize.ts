/** Strip combining diacritic marks so "prosim" matches "prosím". */
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Flexible match: case-insensitive, trimmed, punctuation-tolerant, diacritic-optional. */
export function flexMatch(userInput: string, accepted: string): boolean {
  const clean = (t: string) => t.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  const strip = (t: string) => stripDiacritics(clean(t));
  return clean(userInput) === clean(accepted) || strip(userInput) === strip(accepted);
}
