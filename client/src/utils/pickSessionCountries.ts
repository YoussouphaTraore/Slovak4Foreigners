import { fetchCountries } from './fetchCountries';
import type { Country } from '../data/countries';

export async function pickSessionCountries(userCountryEn?: string): Promise<Country[]> {
  const all = await fetchCountries();
  const eligible = all.filter(c => !c.disabled);
  const userCountry = eligible.find(c => c.en === userCountryEn);
  const others = eligible.filter(c => c.en !== userCountryEn);

  // Fisher-Yates shuffle — called once on lesson mount so stable per session
  const shuffled = [...others];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const fill = userCountry ? 5 : 6;
  return userCountry ? [userCountry, ...shuffled.slice(0, fill)] : shuffled.slice(0, fill);
}
