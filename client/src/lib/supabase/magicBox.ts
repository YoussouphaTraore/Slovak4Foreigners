import { supabase } from './client';

const LAST_ACTIVE_KEY = 'magic_box_last_active_date';

export async function runMagicBoxCheck(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  let lastActive: string | null = null;
  try { lastActive = localStorage.getItem(LAST_ACTIVE_KEY); } catch { /* */ }

  // Fetch current profile state first
  const { data } = await supabase
    .from('user_profiles')
    .select('magic_box_days_count, magic_box_last_claimed, magic_box_force_trigger')
    .eq('id', userId)
    .single();

  if (!data) return false;

  type Row = { magic_box_days_count: number; magic_box_last_claimed: string | null; magic_box_force_trigger: boolean };
  const d = data as Row;

  let daysCount = d.magic_box_days_count;

  // Increment once per calendar day
  if (lastActive !== today) {
    try { localStorage.setItem(LAST_ACTIVE_KEY, today); } catch { /* */ }
    daysCount += 1;
    await supabase
      .from('user_profiles')
      .update({ magic_box_days_count: daysCount })
      .eq('id', userId);
  }

  // Force trigger: show regardless of 5-day rule
  if (d.magic_box_force_trigger) return true;

  // Show on every 5th active day, only if not already claimed today
  if (daysCount > 0 && daysCount % 5 === 0 && d.magic_box_last_claimed !== today) return true;

  return false;
}

export async function claimMagicBox(xp: number): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('claim_magic_box', { boost_amount: xp });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function triggerMagicBoxForUser(targetUserId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ magic_box_force_trigger: true })
      .eq('id', targetUserId);
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: String(e) };
  }
}
