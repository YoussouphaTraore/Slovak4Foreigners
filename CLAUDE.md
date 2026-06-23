# Slovak4Foreigners — Claude Code Session Rules

## MANDATORY SESSION START CHECKLIST

Do these in order before responding to the first user message:

1. **Read `docs/AGENT_QA.md`** — scan every entry for `[OPEN]` or `[DONE — PENDING REVIEW]` addressed to Claude Code. If any exist, surface them to the user immediately before doing anything else.
2. **Read `docs/PROJECT_JOURNAL.md`** — check the last Phase entry to understand where work left off.

Do not skip these even if the user's first message seems unrelated. AGENT_QA entries are time-sensitive inter-agent communication.

---

## Project Overview

**Slovak for Foreigners** — React 18 + TypeScript + Vite 5 + Tailwind CSS v4 + Supabase.

App teaches Slovak to foreigners living in Slovakia. Users complete lessons, earn XP, race snails, and unlock content.

---

## Agent Collaboration

This project uses three agents: **Claude Code**, **Codex**, and **Copilot Studio**.

Communication channel: `docs/AGENT_QA.md` (local-only, gitignored).

- Claude Code is lead — assigns tasks, reviews output, owns DB and Git.
- Codex and Copilot Studio implement and validate.
- Tasks require a 2-of-3 vote at 8/10 to be APPROVED for implementation.
- DB changes: Claude Code only.
- Git commits and pushes: Claude Code only, after user says "commit now" or "push to GitHub".

File watcher: `scripts/watch-agent-qa.mjs` — run at session start if not already running:
```
node scripts/watch-agent-qa.mjs --agent "Claude Code"
```

---

## Hard Rules

- **Never auto-commit or auto-push.** Only on exact phrases: "commit now" / "push to GitHub" / "save to GitHub".
- **Local-only files — never commit:** `docs/` (entire folder), `.agents/`, `CountrySK_Validation.md`, `CyberSecurity_Audit.md`, `DATABASE_SCHEMA.md`, `PROJECT_JOURNAL.md`, `TestingResults.md`, `USER_TESTING_GUIDE.md`, `qa-*.cjs`.
- **Slovak number rule:** All digits in Slovak-language text must render as Slovak words via `slovakifyNumbers()`. Numbers with 5+ digits are exempt.
- **"journal"** shorthand = `docs/PROJECT_JOURNAL.md`.

## MANDATORY POST-TASK ACTIONS (no reminder needed, no exceptions)

After **every** completed task — no matter how small — do both of the following before responding to the user:

### 1. Update `docs/PROJECT_JOURNAL.md`
- Append a new `### [Claude Code] Phase N — YYYY-MM-DD — <title>` entry
- Use the next sequential Phase number (check the last `### [Claude Code] Phase N` heading)
- Include: what changed, which files, why, and any findings
- One-liner fixes still get a short entry

### 2. Notify colleagues in `docs/AGENT_QA.md` if relevant
Post a `[DONE]` entry addressed to `Codex + Copilot Studio` whenever:
- A task was assigned to them and is now resolved
- A commit/push happened
- A file they work with was changed by Claude Code
- Any decision was made that affects their work

For purely internal changes with zero impact on other agents, the AGENT_QA update is optional — but when in doubt, post it.

---

## Key Files

| File | Purpose |
|---|---|
| `client/src/components/OnboardingModal.tsx` | 198-country COUNTRIES array with 8 fields each (sk, gen, loc, adj_m, adj_f, adj_n, adv) |
| `client/src/lib/supabase/progressSync.ts` | All Supabase read/write helpers |
| `client/src/store/useAuthStore.ts` | Global auth + profile state (Zustand) |
| `client/src/App.tsx` | Auth init, onboarding gate, routing |
| `docs/AGENT_QA.md` | Inter-agent communication hub (LOCAL ONLY) |
| `docs/PROJECT_JOURNAL.md` | Full build history (LOCAL ONLY) |
| `scripts/watch-agent-qa.mjs` | File watcher for AGENT_QA.md notifications |
| `.vscode/tasks.json` | VS Code tasks — includes auto-start watcher for Claude Code |
