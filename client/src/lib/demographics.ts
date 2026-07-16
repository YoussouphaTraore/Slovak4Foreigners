import { supabase } from './supabase/client';
import { useAuthStore } from '../store/useAuthStore';
import type { Country } from '../data/countries';

// ─────────────────────────────────────────────────────────────────────────────
// Anonymous demographics.
//
// Gender + country of origin are NEVER stored against a user. At signup we bump
// an anonymous aggregate counter (record_demographics RPC — no user_id anywhere),
// and the user's own choice is kept CLIENT-SIDE ONLY (localStorage, never sent to
// our servers) purely so the self-introduction exercises can personalise Slovak
// grammar. The in-exercise picker can override it at any moment.
// ─────────────────────────────────────────────────────────────────────────────

// Keyed per user so a shared device never leaks one user's choice to another.
const keyFor = (userId: string) => `demographics.v1:${userId}`;

export interface Demographics {
  country: Country;
  gender: string; // 'Male' | 'Female' (free-form tolerated)
}

/** Bumps the anonymous aggregate tallies. Best-effort; never blocks the user. */
export async function recordDemographics(gender: string, countryEn: string): Promise<void> {
  try {
    await supabase.rpc('record_demographics', { p_gender: gender, p_country: countryEn });
  } catch (e) {
    console.error('[demographics] record failed:', e);
  }
}

/** Client-only preference — stays on the device, never transmitted to us. */
export function saveLocalDemographics(userId: string, country: Country, gender: string): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ country, gender }));
  } catch { /* storage unavailable — non-fatal */ }
}

export function loadLocalDemographics(userId: string): Demographics | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.country && typeof parsed.country.en === 'string' && typeof parsed.gender === 'string') {
      return parsed as Demographics;
    }
    return null;
  } catch {
    return null;
  }
}

/** Pushes a demographics choice (or a blank reset) into the in-memory auth store
 *  so the self-intro exercises can read the Slovak grammatical forms. */
export function applyDemographicsToStore(d: Demographics | null): void {
  const setProfileData = useAuthStore.getState().setProfileData;
  if (!d) {
    setProfileData('', '', '', '', '', '', '', '', '');
    return;
  }
  const c = d.country;
  setProfileData(c.en, c.sk, c.gen, c.loc, c.adj_m, c.adj_f, c.adj_n, c.adv, d.gender);
}
