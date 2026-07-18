import type { Insights, Extras } from '../../lib/adminInsights';

// Admin dashboard KPI sections. Two mount points so AdminPage can interleave
// them with its existing sections: <PulseStrip> (exceptions, top of page) and
// <DeepInsights> (growth / learning / audience).
//
// Chart notes: every chart here is a single-hue magnitude bar (brand-green) —
// no multi-series palettes. Brand-green fill is 2.03:1 against the card
// surface, below the 3:1 relief line, so every bar carries its value as a
// visible text label; color is never the only way to read a number. Status
// colors in the Pulse strip are reserved for state and always paired with an
// icon and a label.

// ── Shared bits (mirror AdminPage's local Section/StatRow idiom) ─────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold px-1 mb-2">{title}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}

// Horizontal magnitude bar with its value as a direct label (required relief
// for the low-contrast fill).
function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;
  return (
    <div className="px-4 py-2 border-b border-gray-50 last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 truncate pr-2">{label}</span>
        <span className="text-xs font-bold text-gray-900 flex-none">{value}{suffix ?? ''}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Pulse strip ──────────────────────────────────────────────────────────────

type PulseState = 'good' | 'warn' | 'bad' | 'info' | 'muted';

const PULSE_STYLES: Record<PulseState, string> = {
  good: 'bg-green-50 border-green-200 text-green-800',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  bad: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  muted: 'bg-gray-50 border-gray-200 text-gray-600',
};
const PULSE_ICONS: Record<PulseState, string> = {
  good: '✅', warn: '⚠️', bad: '🔴', info: 'ℹ️', muted: '⏳',
};

function PulseTile({ state, label, value }: { state: PulseState; label: string; value: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${PULSE_STYLES[state]}`}>
      <p className="text-[11px] leading-tight opacity-80">
        <span aria-hidden="true" className="mr-1">{PULSE_ICONS[state]}</span>
        {label}
      </p>
      <p className="text-sm font-extrabold leading-tight mt-0.5">{value}</p>
    </div>
  );
}

export function PulseStrip({ insights, extras }: { insights: Insights | null | undefined; extras: Extras | 'missing' | null }) {
  if (!insights) return null;

  const tiles: { state: PulseState; label: string; value: string }[] = [];

  // Tickets — the "ears". Escalates by age of the oldest open ticket.
  if (extras === 'missing') {
    tiles.push({ state: 'muted', label: 'Support tickets', value: 'needs migration' });
  } else if (extras === null) {
    tiles.push({ state: 'muted', label: 'Support tickets', value: 'unavailable' });
  } else {
    const t = extras.tickets;
    tiles.push(
      t.open === 0
        ? { state: 'good', label: 'Support tickets', value: 'inbox clear' }
        : {
            state: t.oldest_open_hours > 48 ? 'bad' : 'warn',
            label: 'Support tickets',
            value: `${t.open} open · oldest ${Math.round(t.oldest_open_hours)}h`,
          },
    );
  }

  tiles.push(
    insights.daysSinceLastSignup === null
      ? { state: 'info', label: 'Signups', value: 'no users yet' }
      : insights.daysSinceLastSignup >= 3
        ? { state: 'warn', label: 'Signups', value: `none for ${insights.daysSinceLastSignup}d` }
        : { state: 'good', label: 'Last signup', value: insights.daysSinceLastSignup === 0 ? 'today' : `${insights.daysSinceLastSignup}d ago` },
  );

  tiles.push(
    insights.streaksAtRisk > 0
      ? { state: 'warn', label: 'Streaks at risk today', value: String(insights.streaksAtRisk) }
      : { state: 'good', label: 'Streaks at risk today', value: '0' },
  );

  tiles.push(
    insights.reviewDebtUsers > 0
      ? { state: 'info', label: 'Users with overdue reviews', value: `${insights.reviewDebtUsers} (${insights.reviewDebtLessons} lessons)` }
      : { state: 'good', label: 'Overdue reviews', value: 'none' },
  );

  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-widest text-gray-600 font-semibold px-1 mb-2">Pulse</p>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => <PulseTile key={t.label} {...t} />)}
      </div>
    </div>
  );
}

// ── Deep insights ────────────────────────────────────────────────────────────

function fmtSec(sec: number | null): string {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// 24 thin columns, viewer-local hours. Same single-hue treatment as DauChart;
// the peak bucket carries its count as the direct label.
function HourChart({ histogram }: { histogram: number[] }) {
  const max = Math.max(...histogram, 1);
  const total = histogram.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="px-4 py-3 border-t border-gray-50">
      <div className="flex items-end gap-px h-12">
        {histogram.map((n, h) => (
          <div
            key={h}
            className="flex-1 flex flex-col items-center justify-end h-full"
            title={`${String(h).padStart(2, '0')}:00 — ${n} session${n === 1 ? '' : 's'}`}
          >
            {n > 0 && n === max && (
              <span className="text-[9px] font-bold text-gray-900 leading-none mb-0.5">{n}</span>
            )}
            <div
              className={`w-full rounded-t ${n > 0 ? 'bg-brand-green' : 'bg-gray-100'}`}
              style={{ height: n > 0 ? `${Math.max((n / max) * 100, 8)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        {['0h', '6h', '12h', '18h', '23h'].map((t) => (
          <span key={t} className="text-[10px] text-gray-600">{t}</span>
        ))}
      </div>
      <p className="text-[10px] text-gray-600 mt-0.5 text-right">sessions by hour · your local time · 30 days</p>
    </div>
  );
}

function DauChart({ series }: { series: Insights['dauSeries'] }) {
  const max = Math.max(...series.map((d) => d.users), 1);
  const first = series[0]?.day.slice(5);
  const last = series[series.length - 1]?.day.slice(5);
  return (
    <div className="px-4 py-3">
      <div className="flex items-end gap-1 h-16">
        {series.map((d) => (
          <div
            key={d.day}
            className="flex-1 flex flex-col items-center justify-end h-full"
            title={`${d.day}: ${d.users} active`}
          >
            {d.users > 0 && d.users === max && (
              <span className="text-[9px] font-bold text-gray-900 leading-none mb-0.5">{d.users}</span>
            )}
            <div
              className={`w-full rounded-t ${d.users > 0 ? 'bg-brand-green' : 'bg-gray-100'}`}
              style={{ height: d.users > 0 ? `${Math.max((d.users / max) * 100, 8)}%` : '3px' }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-600">{first}</span>
        <span className="text-[10px] text-gray-600">daily active users (UTC) · {last}</span>
      </div>
    </div>
  );
}

export function DeepInsights({ insights, extras }: { insights: Insights | null | undefined; extras: Extras | 'missing' | null }) {
  if (insights === undefined) return null; // still loading — render nothing, not an error
  if (insights === null) {
    return (
      <Section title="Insights">
        <p className="px-4 py-3 text-sm text-gray-600">Couldn't load insight data — check the console and reload.</p>
      </Section>
    );
  }

  const f = insights.funnel;
  const genders = extras && extras !== 'missing' ? Object.entries(extras.demographics.gender) : [];
  const countries = extras && extras !== 'missing' ? extras.demographics.countries.slice(0, 6) : [];
  const maxCountry = Math.max(...countries.map((c) => c.count), 1);
  const maxGender = Math.max(...genders.map(([, n]) => n), 1);

  return (
    <>
      <Section title="Growth">
        <div className="grid grid-cols-3 text-center border-b border-gray-50">
          {[
            ['Today', insights.dauToday],
            ['7 days', insights.wau],
            ['30 days', insights.mau],
          ].map(([label, n]) => (
            <div key={label} className="py-3">
              <p className="text-lg font-extrabold text-gray-900 leading-none">{n}</p>
              <p className="text-[10px] text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <DauChart series={insights.dauSeries} />
        <StatRow label="Guest sessions today" value={insights.guestSessionsToday} />
        <StatRow label="Stickiness (avg daily ÷ monthly)" value={`${insights.stickinessPct}%`} />
        {insights.cohorts.length > 0 && (
          <div className="border-t border-gray-50">
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-600">Came back a week after signing up</p>
            {insights.cohorts.map((c) => (
              <Bar
                key={c.weekOf}
                label={`week of ${c.weekOf.slice(5)}`}
                value={c.returned}
                max={c.size}
                suffix={` / ${c.size}`}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Engagement">
        <StatRow label="Avg session (7d · 30d)" value={`${fmtSec(insights.avgSession7dSec)} · ${fmtSec(insights.avgSession30dSec)}`} />
        <StatRow label="Sessions per active user (7d)" value={insights.sessionsPerActive7d ?? '—'} />
        <StatRow
          label="Devices (30d)"
          value={Object.entries(insights.deviceSplit)
            .sort(([, a], [, b]) => b - a)
            .map(([dev, n]) => `${dev} ${n}`)
            .join(' · ') || '—'}
        />
        <HourChart histogram={insights.hourHistogram} />
      </Section>

      <Section title="Learning funnel">
        <Bar label="Registered" value={f.registered} max={f.registered} />
        <Bar label="Completed 1st lesson" value={f.oneLesson} max={f.registered} />
        <Bar label="Completed 3+ lessons" value={f.threeLessons} max={f.registered} />
        <Bar label="Passed a block" value={f.oneBlock} max={f.registered} />
        <StatRow label="Inactive 7 / 14 / 30 days" value={`${insights.inactive.d7} / ${insights.inactive.d14} / ${insights.inactive.d30}`} />
      </Section>

      {(insights.curriculum.positions.length > 0 || insights.curriculum.notStarted > 0) && (
        <Section title="Curriculum — where learners are">
          {insights.curriculum.positions.map((p) => (
            <Bar
              key={p.lessonId}
              label={`${p.icon} ${p.title}`}
              value={p.users}
              max={Math.max(...insights.curriculum.positions.map((x) => x.users), 1)}
              suffix={p.users === 1 ? ' learner' : ' learners'}
            />
          ))}
          {insights.curriculum.notStarted > 0 && (
            <StatRow label="Not started yet" value={insights.curriculum.notStarted} />
          )}
        </Section>
      )}

      {insights.hardestLessons.length > 0 && (
        <Section title="Hardest lessons (avg strikes)">
          {insights.hardestLessons.map((l) => (
            <div key={l.lessonId} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-b-0">
              <span className="text-sm text-gray-800 truncate pr-2">
                <span aria-hidden="true" className="mr-1.5">{l.icon}</span>{l.title}
              </span>
              <span className="text-xs text-gray-600 flex-none">
                <strong className="text-gray-900">{l.avgStrikes}</strong> · {l.learners} learners · {l.masteredPct}% mastered
              </span>
            </div>
          ))}
        </Section>
      )}

      <Section title="This week">
        <StatRow label="Real leaderboard players" value={insights.realLeaderboardPlayers} />
        <StatRow label="NPCs shown alongside them" value={insights.npcCount} />
        <StatRow label="Magic Box claimers (7d)" value={insights.magicBoxClaimers7d} />
      </Section>

      <Section title="Audience (anonymous)">
        {extras === 'missing' ? (
          <p className="px-4 py-3 text-xs text-gray-600">
            Run <code className="font-mono">docs/sql/admin_dashboard_extras.sql</code> in the Supabase SQL editor to unlock ticket and demographics stats.
          </p>
        ) : extras === null ? (
          <p className="px-4 py-3 text-xs text-gray-600">Demographics unavailable right now.</p>
        ) : (
          <>
            {genders.map(([g, n]) => <Bar key={g} label={g} value={n} max={maxGender} />)}
            {countries.map((c) => <Bar key={c.value} label={c.value} value={c.count} max={maxCountry} />)}
            {genders.length === 0 && countries.length === 0 && (
              <p className="px-4 py-3 text-xs text-gray-600">No demographic submissions yet.</p>
            )}
          </>
        )}
      </Section>
    </>
  );
}
