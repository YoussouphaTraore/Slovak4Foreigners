import { supabase } from './client';

// Submits a support ticket via the SECURITY DEFINER RPC. Nothing is written
// directly to the table (it's RLS-locked); the RPC sets user_id server-side,
// validates/caps the input, and rate-limits. No raw SQL, so no injection surface.
export async function createSupportTicket(params: {
  ticketNo: string;
  category: string;
  message: string;
  alias?: string;
  replyEmail?: string;
  context: Record<string, unknown>;
}): Promise<{ ticket: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('create_support_ticket', {
      p_ticket_no: params.ticketNo,
      p_category: params.category,
      p_message: params.message,
      p_alias: params.alias ?? null,
      p_reply_email: params.replyEmail ?? null,
      p_context: params.context,
    });
    if (error) return { ticket: null, error: error.message };
    return { ticket: (data as string) ?? params.ticketNo, error: null };
  } catch (e) {
    return { ticket: null, error: e instanceof Error ? e.message : 'network error' };
  }
}
