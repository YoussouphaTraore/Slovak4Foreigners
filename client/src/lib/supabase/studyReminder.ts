// Requires a `user_profiles` table in Supabase:
//
//   create table public.user_profiles (
//     user_id uuid primary key references auth.users(id) on delete cascade,
//     study_reminder_time text,           -- e.g. "07:30"
//     study_reminder_enabled boolean not null default false,
//     push_subscription jsonb
//   );
//   alter table public.user_profiles enable row level security;
//   create policy "Users manage own profile"
//     on public.user_profiles for all using (auth.uid() = user_id);

import { supabase } from './client';

export interface StudyReminderSettings {
  studyReminderTime: string | null;
  studyReminderEnabled: boolean;
  pushSubscription: PushSubscriptionJSON | null;
}

export async function loadStudyReminder(userId: string): Promise<StudyReminderSettings | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('study_reminder_time, study_reminder_enabled, push_subscription')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    studyReminderTime: data.study_reminder_time ?? null,
    studyReminderEnabled: data.study_reminder_enabled ?? false,
    pushSubscription: data.push_subscription ?? null,
  };
}

export async function saveStudyReminder(
  userId: string,
  patch: Partial<StudyReminderSettings>,
): Promise<{ error: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  const row: Record<string, unknown> = { id: userId, email: user?.email ?? '' };
  if (patch.studyReminderTime !== undefined) row.study_reminder_time = patch.studyReminderTime;
  if (patch.studyReminderEnabled !== undefined) row.study_reminder_enabled = patch.studyReminderEnabled;
  if (patch.pushSubscription !== undefined) row.push_subscription = patch.pushSubscription;

  const { error } = await supabase
    .from('user_profiles')
    .upsert(row, { onConflict: 'id' });

  return { error: error?.message ?? null };
}

export function formatReminderTime(value: string): string {
  const [hStr, mStr] = value.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
