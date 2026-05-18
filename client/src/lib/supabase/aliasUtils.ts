import { supabase } from './client';
import { BASE_ALIASES } from '../../data/aliases';

// Strips _2, _3 etc suffix to get the base avatar name
export function getAvatarUrl(alias: string): string {
  const base = alias.replace(/_\d+$/, '');
  return `/pp/${base}.png`;
}

// Returns baseName if free; otherwise tries baseName_2, _3, ... until one is free
export async function generateUniqueAlias(baseName: string): Promise<string> {
  const { data } = await supabase
    .from('user_profiles')
    .select('alias')
    .eq('alias', baseName)
    .maybeSingle();

  if (!data) return baseName;

  let suffix = 2;
  while (true) {
    const candidate = `${baseName}_${suffix}`;
    const { data: taken } = await supabase
      .from('user_profiles')
      .select('alias')
      .eq('alias', candidate)
      .maybeSingle();
    if (!taken) return candidate;
    suffix++;
  }
}

// Picks a random base alias, generates a unique version, saves it to user_profiles.
// Verifies the write actually landed (PostgREST silently ignores unknown columns when
// its schema cache is stale, returning no error but saving nothing). Throws if the
// column isn't readable after writing so loadOrAssignAlias returns '' rather than
// exposing an alias that will disappear on the next refresh.
export async function assignDefaultAlias(userId: string): Promise<string> {
  const base = BASE_ALIASES[Math.floor(Math.random() * BASE_ALIASES.length)];
  const alias = await generateUniqueAlias(base);

  const { error } = await supabase
    .from('user_profiles')
    .update({ alias })
    .eq('id', userId);
  if (error) throw new Error(`alias update failed: ${error.message}`);

  // Re-read to confirm the value was actually persisted
  const { data: verify } = await supabase
    .from('user_profiles')
    .select('alias')
    .eq('id', userId)
    .maybeSingle();
  const saved = (verify as { alias?: string | null } | null)?.alias;
  if (!saved) throw new Error('alias not persisted — run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL editor');

  return saved;
}

// Fetches the user's current alias; only assigns a new one if alias is truly absent.
// Bug 2 fix: uses maybeSingle() (not single() which errors on no-match),
// checks both data and the alias field explicitly, and catches any DB error so
// a transient failure never triggers a spurious re-assignment.
export async function loadOrAssignAlias(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('alias')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    // Alias exists in DB — return it, never overwrite
    const existing = (data as { alias?: string | null } | null)?.alias;
    if (existing) return existing;

    // Alias is null/empty — first-time user, assign one
    return await assignDefaultAlias(userId);
  } catch {
    // If anything fails (DB error, network, schema not refreshed), return empty
    // string so the UI gracefully shows nothing rather than assigning a bad alias.
    return '';
  }
}

// Returns whether the user is allowed to change alias (30-day cooldown).
// Bug 1 fix: destructures error from query; if the query fails for any reason
// (table not exposed in Data API, RLS, network) we default to allowed: false
// rather than allowed: true, preventing the cooldown from being bypassed silently.
export async function canChangeAlias(
  userId: string,
): Promise<{ allowed: boolean; nextChangeDate: Date | null }> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();

  const { data, error } = await supabase
    .from('alias_change_log')
    .select('changed_at')
    .eq('user_id', userId)
    .gt('changed_at', thirtyDaysAgo)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Query failed — safe default is to block the change
  if (error) return { allowed: false, nextChangeDate: null };

  // No recent change found — allow
  if (!data) return { allowed: true, nextChangeDate: null };

  const lastChange = new Date((data as { changed_at: string }).changed_at);
  const nextChangeDate = new Date(lastChange.getTime() + 30 * 24 * 3_600_000);
  return { allowed: false, nextChangeDate };
}

// Full alias change: enforces 30-day rule, generates unique alias, updates profile, logs change
export async function changeAlias(
  userId: string,
  baseName: string,
): Promise<{ success: boolean; alias: string; error?: string }> {
  const { allowed, nextChangeDate } = await canChangeAlias(userId);
  if (!allowed) {
    if (nextChangeDate) {
      const dateStr = nextChangeDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      return { success: false, alias: '', error: `You can change your alias again on ${dateStr}` };
    }
    return { success: false, alias: '', error: 'You can change your Alias in 30 days' };
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('alias')
      .eq('id', userId)
      .maybeSingle();

    const oldAlias = (profile as { alias: string | null } | null)?.alias ?? null;
    const newAlias = await generateUniqueAlias(baseName);

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ alias: newAlias })
      .eq('id', userId);

    if (updateError) throw updateError;

    await supabase.from('alias_change_log').insert({
      user_id: userId,
      old_alias: oldAlias,
      new_alias: newAlias,
    });

    return { success: true, alias: newAlias };
  } catch {
    return { success: false, alias: '', error: 'Something went wrong. Please try again.' };
  }
}
