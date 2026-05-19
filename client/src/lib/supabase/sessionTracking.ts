import { supabase } from './client';

export function getDeviceType(): 'mobile' | 'desktop' {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

export async function startSession(userId: string | null): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({ user_id: userId, device_type: getDeviceType() })
      .select('id')
      .single();
    if (error) {
      console.warn('[session] start error:', error.message);
      return null;
    }
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

export async function heartbeat(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', sessionId);
  } catch { /* */ }
}

export async function endSession(sessionId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('user_sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();
    const startedAt = (data as { started_at: string } | null)?.started_at;
    const durationSeconds = startedAt
      ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
      : null;
    await supabase
      .from('user_sessions')
      .update({
        ended_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId);
  } catch { /* */ }
}
