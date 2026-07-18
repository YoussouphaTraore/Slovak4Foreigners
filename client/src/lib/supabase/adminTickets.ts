import { supabase } from './client';

// Admin-only ticket queue. Both calls go through is_admin-gated SECURITY
// DEFINER RPCs (docs/sql/admin_ticket_queue.sql) — the table itself stays
// sealed. 'missing' means the SQL hasn't been applied yet.

export interface AdminTicket {
  id: string;
  ticket_no: string;
  created_at: string;
  category: string;
  message: string;
  alias: string | null;
  reply_email: string | null;   // guest-provided, optional
  email: string | null;         // signed-in reporter's account email
  context: Record<string, unknown> | null;
}

export async function listOpenTickets(): Promise<AdminTicket[] | 'missing' | null> {
  try {
    const { data, error } = await supabase.rpc('admin_list_open_tickets');
    if (error) {
      if (/function|schema cache|not exist/i.test(error.message)) return 'missing';
      console.error('[adminTickets] list failed:', error.message);
      return null;
    }
    return (data ?? []) as AdminTicket[];
  } catch (e) {
    console.error('[adminTickets] list error:', e);
    return null;
  }
}

export async function setTicketStatus(
  id: string,
  status: 'open' | 'resolved',
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc('admin_set_ticket_status', {
      p_id: id,
      p_status: status,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
