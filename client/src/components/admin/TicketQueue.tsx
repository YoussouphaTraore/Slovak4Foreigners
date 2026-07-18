import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase/client';
import { listOpenTickets, setTicketStatus, type AdminTicket } from '../../lib/supabase/adminTickets';

// Open support tickets, oldest first, as a swipeable card rail (space stays
// constant no matter how many are open). Each card: full message + context,
// an in-place reply composer (sent from contact@ via the send-ticket-reply
// edge function), and a mark-resolved action.

function ticketAge(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 0)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const CATEGORY_ICON: Record<string, string> = {
  Problem: '🐛', Question: '❓', Idea: '💡',
};

function ContextLine({ context }: { context: Record<string, unknown> | null }) {
  if (!context) return null;
  const parts: string[] = [];
  if (typeof context.screen === 'string') parts.push(context.screen);
  if (typeof context.build === 'string') parts.push(String(context.build));
  if (typeof context.viewport === 'string') parts.push(String(context.viewport));
  if (context.installed === true) parts.push('PWA');
  if (parts.length === 0) return null;
  return (
    <p
      className="text-[10px] text-gray-500 mt-1 truncate"
      title={typeof context.device === 'string' ? context.device : undefined}
    >
      {parts.join(' · ')}
    </p>
  );
}

type ReplyState =
  | { phase: 'idle' }
  | { phase: 'composing'; text: string }
  | { phase: 'sending'; text: string }
  | { phase: 'sent' }
  | { phase: 'failed'; text: string; error: string };

function TicketCard({
  ticket,
  onResolved,
}: {
  ticket: AdminTicket;
  onResolved: (t: AdminTicket) => void;
}) {
  const [reply, setReply] = useState<ReplyState>({ phase: 'idle' });
  const [resolving, setResolving] = useState(false);
  const [resolveFailed, setResolveFailed] = useState(false);

  const replyTo = ticket.email ?? ticket.reply_email;
  const from = ticket.alias ?? (ticket.email ? 'User' : 'Guest');

  const send = async () => {
    if (reply.phase !== 'composing' || !reply.text.trim()) return;
    const text = reply.text;
    setReply({ phase: 'sending', text });
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
        'send-ticket-reply',
        { body: { ticketId: ticket.id, message: text.trim() } },
      );
      if (error || !data?.ok) {
        // supabase-js wraps non-2xx responses in a generic message; the
        // function's own { error } body says what actually went wrong.
        let msg = error?.message ?? data?.error ?? 'Send failed';
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json().catch(() => null) as { error?: string } | null;
          if (body?.error) msg = `${body.error} (HTTP ${ctx.status})`;
        }
        setReply({ phase: 'failed', text, error: msg });
        return;
      }
      setReply({ phase: 'sent' });
    } catch (e) {
      setReply({ phase: 'failed', text, error: e instanceof Error ? e.message : 'Send failed' });
    }
  };

  const resolve = async () => {
    if (resolving) return;
    setResolving(true);
    setResolveFailed(false);
    const { error } = await setTicketStatus(ticket.id, 'resolved');
    setResolving(false);
    if (error) { setResolveFailed(true); return; }
    onResolved(ticket);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-gray-800 truncate">
          <span aria-hidden="true" className="mr-1">{CATEGORY_ICON[ticket.category] ?? '📩'}</span>
          {ticket.ticket_no} · {ticket.category}
        </span>
        <span className="text-[10px] text-gray-500 flex-none">
          {ticketAge(ticket.created_at)} ago · {from}
        </span>
      </div>

      <p className="text-sm text-gray-800 mt-1.5 whitespace-pre-wrap break-words">{ticket.message}</p>
      <ContextLine context={ticket.context} />

      {/* Reply composer */}
      {replyTo ? (
        reply.phase === 'idle' ? (
          <button
            type="button"
            onClick={() => setReply({ phase: 'composing', text: '' })}
            className="self-start text-xs font-semibold text-brand-blue underline mt-2 cursor-pointer"
          >
            Reply to {replyTo}
          </button>
        ) : reply.phase === 'sent' ? (
          <p className="text-xs font-semibold text-green-700 mt-2">✅ Reply sent to {replyTo}</p>
        ) : (
          <div className="mt-2">
            <textarea
              value={reply.text}
              onChange={(e) => reply.phase === 'composing' && setReply({ phase: 'composing', text: e.target.value })}
              disabled={reply.phase === 'sending'}
              aria-label={`Reply to ${replyTo}`}
              placeholder={`Reply to ${from}…`}
              rows={3}
              maxLength={5000}
              className="w-full border-2 border-gray-200 rounded-xl p-2.5 text-sm resize-none focus:outline-none focus:border-brand-green transition-colors disabled:opacity-60"
            />
            {reply.phase === 'failed' && (
              <p role="alert" className="text-[11px] text-red-600 mb-1">
                Couldn't send: {reply.error}{' '}
                <a className="underline" href={`mailto:${replyTo}?subject=${encodeURIComponent(`Re: your Slovak for Foreigners ticket ${ticket.ticket_no}`)}`}>
                  use your mail app instead
                </a>
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={send}
                disabled={reply.phase === 'sending' || !reply.text.trim()}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-brand-green text-white hover:opacity-90 active:scale-[0.97] cursor-pointer disabled:opacity-50 transition-all"
              >
                {reply.phase === 'sending' ? 'Sending…' : `Send from contact@`}
              </button>
              <button
                type="button"
                onClick={() => setReply({ phase: 'idle' })}
                disabled={reply.phase === 'sending'}
                className="text-xs text-gray-500 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      ) : (
        <span className="text-[11px] text-gray-500 mt-2">No reply address (guest)</span>
      )}

      <div className="flex items-center mt-auto pt-2">
        <button
          type="button"
          onClick={resolve}
          disabled={resolving}
          className="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-brand-green text-brand-green hover:bg-green-50 active:scale-[0.97] cursor-pointer disabled:opacity-50 transition-all"
        >
          {resolving ? 'Saving…' : 'Mark resolved'}
        </button>
      </div>
      {resolveFailed && (
        <p role="alert" className="text-[11px] text-red-600 mt-1">Couldn't update — try again.</p>
      )}
    </div>
  );
}

export function TicketQueue({ onChanged }: { onChanged?: () => void }) {
  const [tickets, setTickets] = useState<AdminTicket[] | 'missing' | null | undefined>(undefined);

  const load = useCallback(() => { listOpenTickets().then(setTickets); }, []);
  useEffect(() => { load(); }, [load]);

  const handleResolved = (t: AdminTicket) => {
    setTickets((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== t.id) : prev));
    onChanged?.();
  };

  if (tickets === undefined) return null; // loading

  const many = Array.isArray(tickets) && tickets.length > 1;

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold px-1 mb-2">
        Open tickets{Array.isArray(tickets) ? ` (${tickets.length})` : ''}
        {many && <span className="normal-case tracking-normal font-normal"> · swipe →</span>}
      </p>

      {tickets === 'missing' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-xs text-gray-600">
            Run <code className="font-mono">docs/sql/admin_ticket_queue.sql</code> in the Supabase SQL editor to read tickets here.
          </p>
        </div>
      ) : tickets === null ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-xs text-gray-600">Couldn't load tickets — reload to retry.</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
          <p className="text-sm text-gray-600 text-center">Inbox clear ✅</p>
        </div>
      ) : (
        // One card = full width; several = horizontal snap rail so the section
        // never grows taller, only sideways.
        <div className={many ? 'flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1' : ''}>
          {tickets.map((t) => (
            <div key={t.id} className={many ? 'snap-center flex-none w-[88%]' : ''}>
              <TicketCard ticket={t} onResolved={handleResolved} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
