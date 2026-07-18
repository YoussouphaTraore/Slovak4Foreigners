import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Sends a support-ticket reply from the operator's own mailbox
// (contact@slovakforforeigners.eu) via the Zoho Mail API, so replies come from
// the address users already know — never from a third-party sender.
//
// Access model: the ticket is looked up through the is_admin-gated
// admin_list_open_tickets() RPC **with the caller's own JWT** — the same read
// path the dashboard uses. That RPC is the admin gate; this function holds no
// service-role access at all. (support_tickets is sealed even from
// service_role, which is also why only OPEN tickets can be replied to — the
// UI only shows open ones, so that's the intended shape.)
//
// Secrets required (Edge Function secrets):
//   ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN — self-client OAuth
//   ZOHO_ACCOUNT_ID — Zoho Mail account id for the mailbox
//   ZOHO_FROM       — contact@slovakforforeigners.eu
//   ZOHO_ACCOUNTS_BASE (optional, default https://accounts.zoho.eu)
//   ZOHO_MAIL_BASE     (optional, default https://mail.zoho.eu)

const ALLOWED_ORIGIN =
  /^(https?:\/\/localhost(:\d+)?|https:\/\/([a-z0-9-]+\.)?slovakforforeigners\.eu|https:\/\/[a-z0-9-]+\.vercel\.app|https:\/\/[a-z0-9-]+\.trycloudflare\.com)$/;

const MAX_REPLY_CHARS = 5000;

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGIN.test(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// The reply is composed as plain text; escape before converting newlines so no
// admin-typed (or pasted) markup ever reaches the recipient as live HTML.
function toSafeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, '<br>');
}

async function zohoAccessToken(): Promise<string> {
  const base = Deno.env.get('ZOHO_ACCOUNTS_BASE') ?? 'https://accounts.zoho.eu';
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: Deno.env.get('ZOHO_CLIENT_ID')!,
    client_secret: Deno.env.get('ZOHO_CLIENT_SECRET')!,
    refresh_token: Deno.env.get('ZOHO_REFRESH_TOKEN')!,
  });
  const res = await fetch(`${base}/oauth/v2/token`, { method: 'POST', body: params });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error('zoho token error', res.status, JSON.stringify(data).slice(0, 300));
    throw new Error('zoho auth failed');
  }
  return data.access_token as string;
}

interface OpenTicket {
  id: string;
  ticket_no: string;
  reply_email: string | null;
  email: string | null;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  // Require a real signed-in user (anon key alone is a valid JWT — not enough).
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401, cors);

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401, cors);

  try {
    const body = await req.json().catch(() => null) as { ticketId?: string; message?: string } | null;
    const ticketId = body?.ticketId?.trim();
    const message = body?.message?.trim();
    if (!ticketId || !message) return json({ error: 'Missing ticketId or message' }, 400, cors);
    if (message.length > MAX_REPLY_CHARS) return json({ error: 'Reply too long' }, 413, cors);

    // Admin gate + ticket lookup in one step, under the CALLER's identity.
    const { data: tickets, error: rpcErr } = await authClient.rpc('admin_list_open_tickets');
    if (rpcErr) {
      if (/not authorized/i.test(rpcErr.message)) return json({ error: 'Forbidden' }, 403, cors);
      console.error('ticket lookup error', rpcErr.message);
      return json({ error: 'Ticket lookup failed' }, 500, cors);
    }
    const t = ((tickets ?? []) as OpenTicket[]).find((x) => x.id === ticketId);
    if (!t) return json({ error: 'Ticket not found among open tickets' }, 404, cors);

    const to = t.email ?? t.reply_email;
    if (!to) return json({ error: 'Ticket has no reply address' }, 400, cors);

    const accessToken = await zohoAccessToken();
    const mailBase = Deno.env.get('ZOHO_MAIL_BASE') ?? 'https://mail.zoho.eu';
    const sendRes = await fetch(
      `${mailBase}/api/accounts/${Deno.env.get('ZOHO_ACCOUNT_ID')}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAddress: Deno.env.get('ZOHO_FROM'),
          toAddress: to,
          subject: `Re: your Slovak for Foreigners ticket ${t.ticket_no}`,
          content: toSafeHtml(message),
          askReceipt: 'no',
        }),
      },
    );
    if (!sendRes.ok) {
      // Log detail server-side; never leak the upstream body to the client.
      console.error('zoho send error', sendRes.status, (await sendRes.text()).slice(0, 300));
      return json({ error: 'Send failed' }, 502, cors);
    }

    return json({ ok: true }, 200, cors);
  } catch (e) {
    console.error('send-ticket-reply internal error', e);
    return json({ error: 'Internal error' }, 500, cors);
  }
});
