import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { createSupportTicket } from '../lib/supabase/support';

const SUPPORT_EMAIL = 'contact@slovakforforeigners.eu';

type ReportType = 'Problem' | 'Question' | 'Idea';

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

// Best-effort build identifier: the hashed entry bundle name (e.g. index-DXC6tyme.js).
function appBuild(): string {
  try {
    const src = [...document.scripts].map((s) => s.getAttribute('src') || '').find((s) => s.includes('/assets/'));
    return src ? (src.split('/').pop() || 'unknown') : 'dev';
  } catch { return 'unknown'; }
}

// Silent diagnostic context — turns "it's broken" into an actionable ticket.
function diagnostics(pathname: string, email: string | undefined): Record<string, unknown> {
  let installed = false;
  try { installed = window.matchMedia('(display-mode: standalone)').matches; } catch { /* */ }
  return {
    screen: pathname,
    account: email || 'Guest',
    build: appBuild(),
    device: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    installed,
    time: new Date().toISOString(),
  };
}

function genTicketNo(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `S4F-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function ReportIssueButton() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);
  const alias = useAuthStore((s) => s.alias);
  const isGuest = !user;

  const [open, setOpen] = useState(false);
  const [ticketNo, setTicketNo] = useState('');
  const [type, setType] = useState<ReportType>('Problem');
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openModal = () => {
    setTicketNo(genTicketNo());
    setType('Problem'); setMessage(''); setReplyEmail('');
    setSent(false); setError(null); setSubmitting(false);
    setOpen(true);
  };

  const submit = async () => {
    if (submitting || !message.trim()) return;
    setSubmitting(true); setError(null);
    const { ticket, error: err } = await createSupportTicket({
      ticketNo,
      category: type,
      message: message.trim(),
      alias: alias || undefined,
      replyEmail: isGuest && replyEmail.trim() ? replyEmail.trim() : undefined,
      context: diagnostics(pathname, user?.email),
    });
    setSubmitting(false);
    if (err) {
      setError('Sorry — we couldn’t submit that. Please try again, or email us directly.');
      return;
    }
    if (ticket) setTicketNo(ticket);
    setSent(true);
  };

  return (
    <>
      {/* Flag button — pinned to the top-right of the 430px app column on every screen. */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 pointer-events-none">
        <button
          type="button"
          onClick={openModal}
          aria-label="Report a problem"
          title="Report a problem"
          className="pointer-events-auto absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-brand-green hover:border-brand-green active:scale-90 transition-all cursor-pointer"
        >
          <FlagIcon />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[150] bg-black/50 flex items-end sm:items-center justify-center px-3 pb-3 sm:pb-0"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-3">
                <div className="text-3xl mb-2" aria-hidden="true">✅</div>
                <h2 className="text-lg font-extrabold text-gray-800">Ticket created</h2>
                <p className="text-sm text-gray-600 mt-1 leading-snug">
                  Your ticket <strong className="text-gray-800">{ticketNo}</strong> is with us.
                  {isGuest && !replyEmail.trim()
                    ? ' We can’t reply without an email, but we’ll get on it.'
                    : ' We’ll get back to you soon.'}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-brand-green text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-extrabold text-gray-800">Report a problem</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="text-gray-500 hover:text-gray-700 text-lg leading-none cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Autofilled meta */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                  <span>{isGuest ? 'Guest' : <>Alias: <strong lang="sk" className="text-gray-700">{alias || '—'}</strong></>}</span>
                  <span>Ticket: <strong className="text-gray-700">{ticketNo}</strong></span>
                </div>

                <div className="flex gap-2 mb-3">
                  {(['Problem', 'Question', 'Idea'] as ReportType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      aria-pressed={type === t}
                      className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                        type === t
                          ? 'border-brand-green bg-green-50 text-brand-green'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-brand-green hover:bg-green-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  aria-label="Describe the issue"
                  placeholder="Tell us what happened…"
                  rows={4}
                  maxLength={2000}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-brand-green transition-colors"
                />

                {isGuest && (
                  <input
                    type="email"
                    value={replyEmail}
                    onChange={(e) => setReplyEmail(e.target.value)}
                    aria-label="Your email (optional, for a reply)"
                    placeholder="Email (optional — so we can reply)"
                    maxLength={200}
                    className="w-full mt-2 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green transition-colors"
                  />
                )}

                <p className="text-[11px] text-gray-500 mt-2 leading-snug">
                  We attach a few technical details (your screen, device, app version) to help us fix it faster. See our{' '}
                  <a href="/privacy" className="text-brand-green underline">Privacy Policy</a>.
                </p>

                {error && <p className="text-[11px] text-red-500 mt-2">{error} <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>}

                <button
                  type="button"
                  onClick={submit}
                  disabled={!message.trim() || submitting}
                  className={`mt-4 w-full py-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                    message.trim() && !submitting
                      ? 'bg-brand-green text-white hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {submitting && <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
                  {submitting ? 'Sending…' : 'Create Ticket'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
