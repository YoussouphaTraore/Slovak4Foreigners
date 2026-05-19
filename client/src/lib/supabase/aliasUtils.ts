import { supabase } from './client';

// Strips _2, _3 etc suffix to get the base avatar name
export function getAvatarUrl(alias: string): string {
  const base = alias.replace(/_\d+$/, '');
  return `/pp/${base}.png`;
}

// Returns baseName_XXXX with a random 4-digit suffix that isn't already taken
export async function generateUniqueAlias(baseName: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${baseName}_${suffix}`;
    const { data } = await supabase
      .from('user_profiles')
      .select('alias')
      .eq('alias', candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error('Could not generate a unique alias — try again');
}

// Fetches the user's current alias. Returns the alias string if one exists,
// null if the user has never chosen one (triggers the alias picker),
// or '' on network/DB error (treated as "try again later", don't show picker).
export async function loadAlias(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('alias')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    const existing = (data as { alias?: string | null } | null)?.alias;
    return existing ?? null; // null = no alias yet, must pick
  } catch {
    return ''; // empty string = error, don't trigger picker
  }
}

// Returns whether the user is allowed to change alias (30-day cooldown).
// Cooldown only applies after a MANUAL change — tracked via alias_changed_at on user_profiles.
// Auto-assigned aliases (alias_changed_at is null) are always changeable.
export async function canChangeAlias(
  userId: string,
): Promise<{ allowed: boolean; nextChangeDate: Date | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('alias_changed_at')
    .eq('id', userId)
    .maybeSingle();

  // Query failed — fail open (30-day rule is UX, not security)
  if (error) return { allowed: true, nextChangeDate: null };

  const changedAt = (data as { alias_changed_at?: string | null } | null)?.alias_changed_at;

  // Never manually changed — allow
  if (!changedAt) return { allowed: true, nextChangeDate: null };

  const lastChange = new Date(changedAt);
  const nextChangeDate = new Date(lastChange.getTime() + 30 * 24 * 3_600_000);
  if (Date.now() < nextChangeDate.getTime()) return { allowed: false, nextChangeDate };
  return { allowed: true, nextChangeDate: null };
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
    const newAlias = await generateUniqueAlias(baseName);

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ alias: newAlias, alias_changed_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true, alias: newAlias };
  } catch {
    return { success: false, alias: '', error: 'Something went wrong. Please try again.' };
  }
}
