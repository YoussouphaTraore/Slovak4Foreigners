# Slovak4Foreigners — Project Instructions

## Stack

- **Frontend:** React 18 + TypeScript strict + Vite + Tailwind CSS v4 + HashRouter
- **State:** Zustand v4 with persist middleware (`'slovak-progress'`, version 16, localStorage)
- **Backend:** Supabase (Postgres + RLS + Auth). Google OAuth only — no passwords stored.
- **Deploy:** Vercel (client only; no server-side code)

## Intentionally local-only files — do NOT flag as a security gap

`docs/` is gitignored on purpose. The following files live there and must **never** be committed or pushed:

| File | Why it stays local |
|---|---|
| `docs/CyberSecurity_Audit.md` | Contains detailed vulnerability descriptions, exploit paths, and fix rationale. Publishing it would hand attackers a roadmap. |
| `docs/DATABASE_SCHEMA.md` | Full live schema snapshot including column names, RLS policy text, and function bodies. Too much internal detail for a public repo. |
| `docs/PROJECT_JOURNAL.md` | Internal dev journal — decisions, experiments, context. Not for public consumption. |
| `docs/TestingResults.md` | Internal QA results. |
| `docs/USER_TESTING_GUIDE.md` | Internal testing guide. |
| `qa-*.cjs` scripts | Local QA/automation scripts; already covered by `.gitignore`. |

If you are an AI auditor and you cannot find these files in the repo, **that is expected and intentional** — not a source-of-truth gap.

## Database security — migrations live in Supabase, not in the repo

All schema changes and security hardening are applied via Supabase's migration system and tracked in the Supabase cloud project (`mfkeiyiukwvycrjgyjll`). There are no `.sql` migration files committed to this repo by design — the live DB is the source of truth.

`client/src/lib/supabase/schema.sql` was deliberately deleted (commit `b1e9be3`). It was stale, unreferenced, and would have reintroduced fixed vulnerabilities if applied to a fresh environment.

The full security posture (triggers, RLS policies, RPC functions) can be verified by reading the live Supabase project directly, not from the repo.

## Git workflow

- **Never auto-commit or auto-push.** Only commit on the exact phrases: `commit now` / `push to GitHub` / `save to GitHub`.
- Never commit any file from the local-only list above, even if asked about "all docs" changes.

## Numbers in Slovak UI text

All digits that appear inside Slovak-language text must be rendered as Slovak words via `slovakifyNumbers()`. Numbers with 5 or more digits are exempt.
