import { supabase } from '../lib/supabase/client';
import { COUNTRIES, type Country } from '../data/countries';

type DbRow = {
  country: string;
  country_sk: string;
  country_sk_genitive: string;
  country_sk_locative: string;
  country_sk_adj_masculine: string;
  country_sk_adj_feminine: string;
  country_sk_adj_neuter: string;
  country_sk_adverb: string;
  disabled: boolean;
};

let cache: Country[] | null = null;

export async function fetchCountries(): Promise<Country[]> {
  if (cache) return cache;

  try {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('country');

    if (error || !data) throw new Error(error?.message);

    cache = (data as DbRow[]).map(row => ({
      en: row.country,
      sk: row.country_sk,
      gen: row.country_sk_genitive,
      loc: row.country_sk_locative,
      adj_m: row.country_sk_adj_masculine,
      adj_f: row.country_sk_adj_feminine,
      adj_n: row.country_sk_adj_neuter,
      adv: row.country_sk_adverb,
      disabled: row.disabled,
    }));
  } catch {
    // Supabase unavailable — fall back to bundled local data
    cache = COUNTRIES;
  }

  return cache!;
}
