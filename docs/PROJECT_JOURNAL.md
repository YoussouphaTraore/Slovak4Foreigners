# Slovak for Foreigners — Project Journal

> **Audience:** Junior developers joining this project. This document is the single source of truth.
> **Rule:** Every GitHub push must add an entry to the [Build History](#14-build-history) section.

> **Developer note — 2026-06-16:** Codex is joining this project as a new developer collaborator to help Claude Code maintain, understand, and extend the Slovak for Foreigners codebase.

---

## Collaboration Protocol — Slovak4Foreigners

You are one of two AI coding assistants working on this repository: **Claude Code (lead developer)** and **Codex (supporting developer)**. Both work in the same VS Code workspace and the same git working tree, but never at the same time.

### Roles

Claude Code is the lead developer. It owns architecture decisions, lesson content structure, primary feature implementation, and is the only tool authorized to commit or push. Codex is the support developer — it assists with debugging, investigates issues, proposes fixes, writes code, and can take over active implementation work when Claude Code is unavailable (e.g. hit a token/context limit mid-task). Codex never commits or pushes under any circumstance, even if explicitly asked to by anyone other than the user relaying a Claude Code instruction.

Neither tool overrides the other's completed decisions without the user's explicit approval. If you disagree with a prior decision recorded in the journal, raise it with the user — don't silently redo it.

### Before starting any session, every time, no exceptions

1. Run `git status`. If there are uncommitted changes, **STOP** and tell the user. Do not proceed, do not commit them yourself, do not discard them. The user will tell you what to do.
2. Read `PROJECT_JOURNAL.md`, specifically the [Build History](#14-build-history) section, to understand what was done in the most recent sessions and by which tool.
3. State out loud (in your first response) which tool you are and a one-line summary of what you understand the current state to be, before taking any action.

### During the session

- Tag your identity in any journal entry you write: `### [Claude Code] ...` or `### [Codex] ...`.
- If you are taking over a task that another tool left incomplete (e.g. Claude Code hit a token limit mid-implementation), say so explicitly: *"Picking up from Claude Code's incomplete work on X — here's what I see in the current files."* Then verify the actual file state matches what the journal claims before continuing — don't trust the journal blindly, trust `git status` and the files themselves.
- For debugging tasks: either tool can independently read code, search for the root cause, and propose a fix. Investigation is parallel-safe in conversation (talking to the user) but file edits are not — only one tool edits at a time, confirmed by the user.
- Do not start a task that requires extensive file changes if you suspect you are near a context/token limit. Flag it to the user early.

### Commit and push — Claude Code only

- Codex never runs `git commit`, `git push`, or any command that changes git history. If Codex's work is ready to ship, it stops at "uncommitted, ready for review" and tells the user explicitly: *"Changes are complete and uncommitted. Claude Code needs to review and commit these."*
- When Claude Code starts a session and finds uncommitted changes from Codex, it must review the actual diff (`git diff`) before committing anything — not just read Codex's summary. Claude Code validates the changes are correct, consistent with project conventions, and don't conflict with anything else before committing.
- If Claude Code finds Codex's uncommitted changes are incomplete, broken, or inconsistent with the journal's description, it stops and tells the user what it found — it does not silently fix and commit, nor does it discard the work without asking.
- The user gives the final go-ahead to commit, same as always. Claude Code reviewing the diff is a validation step, not a replacement for the user's explicit "commit now" instruction.
- **Every time Claude Code reviews a `[Codex]` journal entry, it writes its own review back into the journal directly below that entry** — tagged `### [Claude Code review of Codex Phase N]` — stating what was checked (diff, build/typecheck, file structure, consistency with the claim) and whether it matches what Codex claimed. This applies whether or not the work is committed yet.

### Before ending any session

- **Codex:** confirm with the user that changes are left uncommitted and ready for Claude Code to review. Write a Build History entry tagged `[Codex]` describing exactly what was changed and why, so Claude Code can validate against the actual diff rather than just the description.
- **Claude Code:** follow the existing rule — never commit or push without the user explicitly saying so. Write a Build History entry tagged `[Claude Code]` after any commit, summarizing what was committed.
- If the task is incomplete, leave clear notes on exactly where work stopped and what the next step is.

### Handoff scenario — token limit mid-task

If Claude Code is running low on context mid-task, it stops at a clean point if possible (not mid-edit of a file), tells the user clearly what is done and what remains, and writes the journal entry before running out. Codex picking up afterward always verifies file state against the claim first, not just reads the claim and proceeds. Codex continues the implementation but leaves everything uncommitted for Claude Code to review when it returns.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Lesson Content System](#5-lesson-content-system)
6. [XP & Progression System](#6-xp--progression-system)
7. [Practice Dialogue System](#7-practice-dialogue-system)
8. [Auth System](#8-auth-system)
9. [Guest Conversion Flow](#9-guest-conversion-flow)
10. [Deployment Pipeline](#10-deployment-pipeline)
11. [Environment Setup](#11-environment-setup)
12. [How to Add New Content](#12-how-to-add-new-content)
13. [Known Issues & Future Work](#13-known-issues--future-work)
14. [Build History](#14-build-history)

---

## 1. Project Overview

**Slovak for Foreigners** is a mobile-first web app that teaches Slovak to expats, international students, and anyone living in Slovakia who needs practical language survival skills.

### Core Features
- **Structured lesson system** — 16 lessons across 3 stages (Survival → Settling In → Advanced), each with 8–18 exercises
- **Practice Dialogue** — 5 branching conversation scenarios with real Slovak characters
- **Snail Race** — timed mini-game that awards XP for fast correct answers
- **XP & Level system** — earn XP by completing lessons, levels every 200 XP
- **Streak system** — daily streaks with multipliers (1.0×, 1.5×, 2.0×)
- **Lesson strength** — each lesson has a strength score (0–100) that decays over time, nudging review
- **Google sign-in** — cloud progress sync; guest play allowed for up to 2 free dialogues + all lessons

### Design Principles
- Mobile-first (max-width 512px centered layout)
- No typing — all exercises use tap/select/match UI
- Slovak text with diacritics rendered faithfully; numbers shown as Slovak words
- TTS via Web Speech API (lang: `sk-SK`) for every Slovak word

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript (strict mode) |
| Build tool | Vite 5 |
| Styling | Tailwind CSS v4 (no config file — uses CSS `@theme`) |
| State management | Zustand 4 with `persist` middleware |
| Auth & database | Supabase JS v2 (Google OAuth, PostgreSQL, RLS) |
| Routing | React Router v6 |
| Animations | canvas-confetti (XP celebration) |
| Audio | Web Speech API (TTS), Web Audio API (Snail Race SFX) |
| Deployment | Vercel (auto-deploy from `main` branch) |
| Package manager | npm |

### Key library notes
- **Zustand persist** stores to `localStorage` under the key `slovak-progress`. Version migrations run on rehydration.
- **Supabase** client is at `client/src/lib/supabase/client.ts`. Env vars are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Tailwind v4** uses `@theme` in `client/src/index.css` instead of `tailwind.config.js`. Custom colors defined there: `--color-brand-green`, etc.

---

## 3. Project Structure

```
Slovak4Foreigners/
├── client/                          # Entire frontend (Vite + React)
│   ├── public/
│   │   └── snail.png                # Mascot used in modals + race page
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── SaveProgressModal.tsx    # Guest → sign-in conversion modal
│   │   │   ├── dialogue/
│   │   │   │   ├── DialogueSession.tsx      # Standard branching dialogue player
│   │   │   │   └── EmergencyDialogueSession.tsx  # Emergency scenario player
│   │   │   ├── exercises/
│   │   │   │   ├── ExerciseShell.tsx        # Router: picks the right exercise component
│   │   │   │   ├── FillInBlankPickExercise.tsx
│   │   │   │   ├── ListenAndIdentifyExercise.tsx
│   │   │   │   ├── ListenAndPickExercise.tsx
│   │   │   │   ├── NumberToWordsExercise.tsx
│   │   │   │   ├── PickTranslationExercise.tsx
│   │   │   │   ├── SituationalChoiceExercise.tsx
│   │   │   │   ├── SmsDialogueExercise.tsx
│   │   │   │   ├── UnscrambleExercise.tsx
│   │   │   │   ├── VocabularyTableExercise.tsx
│   │   │   │   └── WordMatchExercise.tsx
│   │   │   ├── LeaderboardModal.tsx         # Top-100 weekly leaderboard with live NPC animation
│   │   │   └── ui/
│   │   │       └── BottomNav.tsx            # Fixed bottom navigation bar (5 tabs)
│   │   ├── data/
│   │   │   ├── dialogues/
│   │   │   │   ├── index.ts                 # Exports all dialogues array
│   │   │   │   ├── dialogue-coffee-tier1.json
│   │   │   │   ├── dialogue-supermarket-tier1.json
│   │   │   │   ├── dialogue-bus-tier1.json
│   │   │   │   ├── dialogue-neighbor-tier1.json
│   │   │   │   └── dialogue-emergency-tier1.json
│   │   ├── aliases.ts                       # 25 base alias names (all *Snail)
│   │   │   └── lessons/
│   │   │       ├── index.ts                 # Exports all lessons array (ordered)
│   │   │       ├── survival-1.json          # First Words (9 exercises)
│   │   │       ├── survival-2.json          # Greetings (8 exercises)
│   │   │       ├── survival-3.json          # About Me (9 exercises)
│   │   │       ├── survival-4.json          # Emergency (11 exercises)
│   │   │       ├── survival-5.json          # Numbers & Money (11 exercises)
│   │   │       ├── survival-6.json          # Directions & Positions (10 exercises)
│   │   │       ├── settling-1.json          # Know Your Address (11 exercises)
│   │   │       ├── settling-2.json          # At the Foreign Police (12 exercises)
│   │   │       ├── settling-3.json          # Getting Around (12 exercises)
│   │   │       ├── settling-4.json          # At the Supermarket (18 exercises)
│   │   │       ├── settling-5.json          # At the Restaurant (14 exercises)
│   │   │       ├── settling-6.json          # Fruits & Vegetables (13 exercises)
│   │   │       ├── advanced-1.json          # Family (14 exercises)
│   │   │       ├── advanced-2.json          # Talking About Myself (14 exercises)
│   │   │       ├── advanced-3.json          # Calendar & Time (14 exercises)
│   │   │       └── advanced-4.json          # At the Coffee Shop (13 exercises)
│   │   ├── hooks/
│   │   │   └── useFeedbackNextDelay.ts      # Delays next exercise by 2500ms after correct answer
│   │   ├── lib/
│   │   │   └── supabase/
│   │   │       ├── client.ts                # Supabase client singleton
│   │   │       ├── aliasUtils.ts            # Alias assign / change / cooldown / avatar URL
│   │   │       ├── progressSync.ts          # Cloud read/write helpers (incl. weekly XP)
│   │   │       └── schema.sql               # Full DB schema (run once in Supabase SQL editor)
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx                 # Google sign-in page
│   │   │   ├── HomePage.tsx                 # Stage-grouped lesson map
│   │   │   ├── LessonPage.tsx               # Exercise runner with strike system
│   │   │   ├── PracticeDialoguePage.tsx     # Dialogue scenario list
│   │   │   ├── ProfilePage.tsx              # Stats, XP, stage progress, settings
│   │   │   ├── SnailRacePage.tsx            # Timed translation mini-game
│   │   │   └── XpCelebrationPage.tsx        # Confetti + XP breakdown after lesson
│   │   ├── store/
│   │   │   ├── useAuthStore.ts              # Auth state + Google sign-in + alias state
│   │   │   └── useProgressStore.ts          # XP, lessons, streaks, weeklyXp, sync — version 10
│   │   ├── types/
│   │   │   ├── dialogue.ts                  # Dialogue + EmergencyScenario types
│   │   │   └── lesson.ts                    # Lesson + all Exercise union types
│   │   ├── utils/
│   │   │   ├── normalize.ts                 # flexMatch: diacritic-tolerant answer checking
│   │   │   ├── numberToSlovak.ts            # Integer → Slovak word form (0–9999)
│   │   │   └── speak.ts                     # TTS wrapper (Web Speech API, lang: sk-SK)
│   │   ├── App.tsx                          # Router + regression check on mount
│   │   ├── index.css                        # Tailwind v4 + @theme custom colors
│   │   └── main.tsx                         # React root
│   ├── package.json
│   ├── tsconfig.json                        # strict: true
│   └── vite.config.ts
└── docs/
    └── PROJECT_JOURNAL.md                   # This file
```

---

## 4. Database Schema

All tables live in the `public` schema in Supabase. Row Level Security (RLS) is enabled on all tables — every policy is `auth.uid() = user_id` (or `auth.uid() = id` for `user_profiles`).

### Tables

#### `user_profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | References `auth.users(id)` |
| `email` | `text` | User's email |
| `display_name` | `text` | Editable in Profile page |
| `avatar_url` | `text` | Google avatar URL |
| `alias` | `text UNIQUE` | Snail alias (e.g. `FrogySnail`, `KittySnail_2`) — assigned on first login |
| `alias_changed_at` | `timestamptz` | Set when user manually changes alias; NULL if still on auto-assigned alias |
| `weekly_xp` | `integer` | XP earned since last Monday 00:00 UTC; reset by cron |
| `created_at` | `timestamptz` | Auto-set |

#### `user_progress`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | Auto-generated |
| `user_id` | `uuid UNIQUE` | References `auth.users(id)` |
| `xp` | `integer` | Total XP |
| `level` | `integer` | `floor(xp / 200) + 1` |
| `streak` | `integer` | Consecutive days |
| `last_played_date` | `text` | YYYY-MM-DD |
| `streak_multiplier` | `numeric` | 1.0 / 1.5 / 2.0 |
| `unlocked_stages` | `text[]` | e.g. `{survival, settling}` |
| `tried_emergency_scenarios` | `text[]` | IDs of tried scenarios |
| `updated_at` | `timestamptz` | Auto-stamped by trigger |

#### `lesson_records`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` + `lesson_id` | `UNIQUE` | One record per lesson per user |
| `strength` | `integer` | 0–100, decays daily |
| `strikes` | `integer` | Mistakes in last attempt |
| `completed_at` | `timestamptz` | Last completion time |
| `times_completed` | `integer` | Total completions |
| `xp_earned` | `integer` | XP from last attempt |
| `last_decayed_at` | `text` | YYYY-MM-DD |

#### `npc_profiles`
| Column | Type | Notes |
|--------|------|-------|
| `alias` | `text PK` | NPC name (same pool as user aliases) |
| `avatar` | `text` | Path to avatar image e.g. `/pp/FrogySnail.png` |
| `weekly_xp` | `integer` | Simulated XP; updated by `update_npc_xp()` cron every 3h |
| `personality` | `text` | One of: `grinder`, `casual`, `weekend_warrior`, `fading` |

100 NPCs seeded. `update_npc_xp()` scales gains to the top real user's XP and applies personality-based variance. Sunday protection: NPCs never exceed `topRealUserXp - 1` on the last day of the week.

#### `weekly_winners`
| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | Auto-generated |
| `alias` | `text` | Winner's alias |
| `avatar` | `text` | Winner's avatar path |
| `week_of` | `date` | The Monday that week started |
| `created_at` | `timestamptz` | When the record was inserted |

`record_weekly_winner()` cron runs at 23:55 UTC Sunday, recording the current #1 player before Monday's reset. Displayed in the leaderboard modal header the following week.

#### `snail_race_records`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` + `stage_id` | `UNIQUE` | One record per stage per user |
| `attempts_today` | `integer` | Max 5, resets at midnight |
| `last_attempt_date` | `text` | YYYY-MM-DD |
| `best_score` | `integer` | Highest correct answer count |

### Triggers
- **`on_auth_user_created`** — fires `AFTER INSERT ON auth.users`. Creates a `user_profiles` row and a `user_progress` row (with `survival` unlocked) for every new user. Uses `ON CONFLICT DO NOTHING` for idempotency.
- **`set_user_progress_updated_at`** — fires `BEFORE UPDATE ON user_progress`. Auto-stamps `updated_at = now()`.

### Important: RLS and role permissions
Tables created via raw SQL (not the Supabase dashboard) may not have `GRANT` permissions for the `authenticated` role. If you see `403 permission denied` errors on upserts, run:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.snail_race_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon, authenticated;
```

---

## 5. Lesson Content System

### Stage Structure

| Stage ID | Display Name | Unlock Cost | Lessons |
|----------|--------------|-------------|---------|
| `survival` | Stage 1 · Survival | Free (always unlocked) | survival-1 through survival-6 |
| `settling` | Stage 2 · Settling In | 100 XP | settling-1 through settling-6 |
| `advanced` | Stage 3 · Advanced | 250 XP | advanced-1 through advanced-4 |

Lessons unlock sequentially within each stage. The first lesson of each stage is locked behind the stage's XP cost (spent via the unlock button on the Home page). Subsequent lessons unlock after completing the previous one.

### Lesson JSON Format

```json
{
  "id": "survival-1",
  "stageId": "survival",
  "stageName": "Stage 1 · Survival",
  "title": "First Words",
  "description": "Essential words every newcomer needs.",
  "icon": "💬",
  "xpReward": 10,
  "exercises": [...]
}
```

### Exercise Types

All exercises are in the `exercises` array. The `type` field determines which component renders it.

| Type | Component | Description |
|------|-----------|-------------|
| `VOCABULARY_TABLE` | `VocabularyTableExercise` | Tap-to-hear word cards in a 2-column grid |
| `LISTEN_AND_PICK` | `ListenAndPickExercise` | Hear a word via TTS, pick the English meaning |
| `LISTEN_AND_IDENTIFY` | `ListenAndIdentifyExercise` | Hear a word, pick the correct Slovak spelling from options |
| `PICK_TRANSLATION` | `PickTranslationExercise` | See a Slovak word, pick the English translation |
| `SITUATIONAL_CHOICE` | `SituationalChoiceExercise` | Read a Slovak situation, pick the best response |
| `FILL_IN_BLANK_PICK` | `FillInBlankPickExercise` | Fill in a blank by choosing from word options |
| `WORD_MATCH_REVIEW` | `WordMatchExercise` | Match Slovak words to their English pairs |
| `UNSCRAMBLE` | `UnscrambleExercise` | Tap words in correct order to form a sentence |
| `NUMBER_TO_WORDS` | `NumberToWordsExercise` | See a digit, pick the Slovak word form |
| `SMS_DIALOGUE` | `SmsDialogueExercise` | Read an SMS conversation, answer a comprehension question |

`VOCABULARY_TABLE` is non-graded — it always passes and calls `onComplete(true)` directly from within the component (no check button).

### How `ExerciseShell` works

`ExerciseShell.tsx` is the central router. It receives an `exercise` object and `onComplete` callback. For each exercise type it:
1. Renders the appropriate sub-component
2. Shows a "Check" button (except `VOCABULARY_TABLE`)
3. Calls `validate()` to check the answer
4. Shows a green/red feedback banner
5. After `CORRECT_DELAY_MS` (2500ms), calls `onComplete(isCorrect)`

### Answer normalization

`utils/normalize.ts` exports `flexMatch(userAnswer, correctAnswer)` which:
- Strips leading/trailing whitespace
- Lowercases both strings
- Strips punctuation (`.`, `,`, `!`, `?`)
- Normalizes diacritics: converts `á→a`, `č→c`, `ď→d`, `é→e`, `í→i`, `ľ→l`, `ĺ→l`, `ň→n`, `ó→o`, `ô→o`, `ŕ→r`, `š→s`, `ť→t`, `ú→u`, `ý→y`, `ž→z`

This means a user typing "dakujem" matches "Ďakujem." without needing a special keyboard.

### Number display rule

All digits in Slovak-facing text must be rendered as Slovak words using `slovakifyNumbers()` from `utils/numberToSlovak.ts`. Numbers with 5+ digits are exempt (displayed as numerals). The conversion covers 0–9999.

Examples: `1` → `jedna`, `15` → `pätnásť`, `100` → `sto`, `1500` → `tisícpäťsto`

---

## 6. XP & Progression System

### XP Calculation (per lesson)

```
baseXp = isRepeat ? min(8, exerciseCount) : exerciseCount
strikeXpLoss = floor(strikes * 0.5)
rawXp = max(1, baseXp - strikeXpLoss)
perfectBonus = (strikes === 0) ? 5 : 0
totalXp = (rawXp + perfectBonus) * streakMultiplier
```

- First completion: XP = exercise count (e.g. 11-exercise lesson = up to 11 XP base)
- Repeat completion: capped at 8 XP base (diminishing returns)
- Perfect (0 strikes): +5 XP bonus
- Streak multiplier applied to total

### Strike System (in `LessonPage.tsx`)

| Constant | Value | Effect |
|----------|-------|--------|
| `MAX_TOTAL` | 5 | Go back one exercise |
| `MAX_CONSEC` | 3 | Restart entire lesson |
| `MAX_EXERCISE` | 2 | Redo the same exercise |

"Strikes" are wrong answers. Strikes reset per-exercise when you advance. `lessonTotal` accumulates for the entire lesson session and feeds into XP loss + strength calculation.

### Level System

`level = floor(xp / 200) + 1`

Level advances every 200 XP. Displayed with a progress bar on the Profile page (`xpIntoLevel = xp % 200`, bar fills to `(xpIntoLevel / 200) * 100%`).

### Streak System

Checked on app load via `decayLessonStrengths()` and `checkAndUpdateStreak()`.

| Streak | Multiplier |
|--------|-----------|
| 0–2 days | 1.0× |
| 3–6 days | 1.5× |
| 7+ days | 2.0× |

If the user skips a day, streak resets to 0.

### Lesson Strength & Decay

All lessons share a single **12-hour review clock** driven by `lastReviewedAt` (ISO timestamp). Strength is a pure function of hours elapsed since `max(lastReviewedAt, lesson.completedAt)` — whichever is more recent — so newly completed lessons always start fresh.

```
computeStrength(lastReviewedAt, completedAt, nowMs):
  hours = (nowMs - max(lastReviewedAt, completedAt)) / 3_600_000
  if hours < 7  → 100  (green dot)
  if hours < 10 → 60   (yellow dot)
  if hours < 12 → 20   (red dot)
  else          → 0    (review overdue)
```

Dot thresholds: `strength >= 80` → green, `>= 40` → yellow, `< 40` → red.

`decayLessonStrengths()` runs on app load and applies `computeStrength` to each `lessonRecord`, updating the stored value. The Home page also recomputes live via a 1-minute `setInterval` ticker so dots update without a refresh.

After a review session, `completeReview()` resets **all** `lessonRecords` to `strength: 100` and writes a new `lastReviewedAt` timestamp.

Lessons with strength < 80 appear in `getWeakLessons()` and are surfaced in the review banner.

### Stage Unlocking

Users spend XP to unlock stages via `unlockStage(stageId)` in the store:
- `settling`: 100 XP
- `advanced`: 250 XP

For guests (not signed in), `unlockStage` shows the `hard_unlock` save-progress modal instead of unlocking.

### Snail Race

Mini-game on each stage's race card. Rules:
- `RACE_DURATION = 60` seconds
- `BONUS_SECONDS = 3` added per correct answer
- `MAX_ATTEMPTS = 5` per calendar day (resets at midnight)
- `FREEZE_MS = 2000` freeze on wrong answer (no XP, timer keeps running)
- `TURBO_THRESHOLD = 25` correct answers triggers turbo mode (snail speeds up, special sound)
- XP earned = correct answer count (not multiplied by streak)

---

## 7. Practice Dialogue System

### Dialogue Access

| Index | ID | Topic | Guest access |
|-------|----|-------|-------------|
| 0 | `dialogue-coffee-tier1` | At the Coffee Shop | Free |
| 1 | `dialogue-supermarket-tier1` | At the Supermarket | Free |
| 2 | `dialogue-bus-tier1` | On the Bus | Auth required |
| 3 | `dialogue-neighbor-tier1` | Meeting Your Neighbor | Auth required |
| 4 | `dialogue-emergency-tier1` | Calling Emergency Services | Auth required |

Guest users clicking Start Conversation on index 2+ see the `hard_dialogue` save-progress modal. "Maybe Later" closes the modal but does not start the dialogue.

### Standard Dialogue Format

```typescript
interface Dialogue {
  id: string;
  topic: string;
  description: string;
  character: { name: string; avatar: string; role: string };
  tier: number;
  stageRequired: string;    // stage ID that must be unlocked
  emergencyMode?: boolean;
  nodes: DialogueNode[];    // branching conversation nodes
}

interface DialogueNode {
  id: string;
  speaker: 'character' | 'user';
  text: string;              // Slovak text shown
  translation?: string;      // English shown below
  choices?: DialogueChoice[];
}

interface DialogueChoice {
  id: string;
  text: string;              // Slovak option text
  nextNodeId: string | null; // null = end of dialogue
  isCorrect?: boolean;       // correct choice in comprehension nodes
  outcome?: string;          // outcome label (e.g. 'A', 'B')
}
```

Dialogues are branching: choices at each node lead to different `nextNodeId`. Multiple outcomes are possible (good ending, neutral ending, etc.).

### Emergency Dialogue Format

The emergency dialogue (`dialogue-emergency-tier1`) uses a special `EmergencyDialogueSession` component with a different data structure:

```typescript
interface EmergencyScenario {
  id: string;
  title: string;
  description: string;
  steps: EmergencyStep[];   // linear steps, not branching nodes
}
```

The emergency mode teaches specific survival phrases in a structured drill format rather than branching choices.

### TTS in Dialogues

Slovak text is read aloud using `speak()` from `utils/speak.ts`. The function uses `window.speechSynthesis` with `lang: 'sk-SK'`. TTS fires automatically when a character line appears. Users can tap to replay. TTS is cancelled when the user exits or the component unmounts.

---

## 8. Auth System

### Sign-in Flow

Google OAuth only. No email/password.

1. User taps "Continue with Google" (on `AuthPage` or in `SaveProgressModal`)
2. `useAuthStore.signInWithGoogle()` calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
3. Supabase redirects to Google, then back to the app
4. `onAuthStateChange` fires with the new session
5. `useAuthStore` sets `user` and `isInitialized: true`
6. `App.tsx` `useEffect` detects `userId` and calls `initializeFromCloud(userId)`
7. Cloud progress merges with local guest progress

### `useAuthStore` shape

```typescript
{
  user: User | null;          // Supabase auth user object
  session: Session | null;
  isInitialized: boolean;     // false until onAuthStateChange fires once
  isLoading: boolean;         // true during sign-in redirect
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => void;     // called once in App.tsx useEffect
}
```

### Session persistence

Supabase JS stores the session in `localStorage` automatically. On app load, `initialize()` calls `supabase.auth.getSession()` and sets up `onAuthStateChange`. The spinner shows until `isInitialized` is true.

### `wasLoggedIn` flag

When `onAuthStateChange` receives a session with a user, it sets `sessionStorage.setItem('wasLoggedIn', 'true')`. This flag lives only for the browser session (cleared on tab close). `App.tsx` reads it before running the guest regression check, so signing out in the same browser session does not re-trigger regression.

### Display name resolution

The app resolves a display name from Supabase `user_metadata` in priority order:
1. `user_metadata.display_name` (set by user in Profile page)
2. `user_metadata.full_name` (from Google)
3. `user_metadata.name` (from Google fallback)
4. `user.email` prefix
5. `'?'` fallback

---

## 9. Guest Conversion Flow

### Overview

Guest users (not signed in) can play freely but are nudged toward sign-in at strategic moments. The system has four modal triggers:

| Trigger | When | Dismissible? | Copy |
|---------|------|-------------|------|
| `soft` | At exercise 5 of the 2nd, 4th, or 6th Stage 1 lesson (guest only) | Yes (4h) | "You're making great progress!" |
| `hard_stage` | After completing the last Stage 1 lesson | No | "You've completed Stage 1! 🎉" |
| `hard_unlock` | When a guest tries to unlock Stage 2/3 | No | "Ready for Stage 2?" |
| `hard_dialogue` | When a guest taps dialogue 3, 4, or 5 | No | "Sign in to continue" |
| `regression` | On app open when ≥3 lessons complete (guest) | Yes (4h) | "Welcome back, Guest Learner!" |

"Hard" modals have a dark backdrop (bg-black/90) and no "Maybe Later" button. Tapping the backdrop does nothing. The user must sign in or close the browser.

### Soft modal timing (in `LessonPage.tsx`)

- Fires at the **5th exercise completion** of a Stage 1 lesson, only when the number of previously completed Stage 1 lessons is **odd** (1, 3, or 5 completed → currently on lesson 2, 4, or 6)
- Only within `stageId === 'survival'`; never fires in Stage 2 or 3 (those require login anyway)
- Once per lesson instance via `hasShownSoftModal` ref (new LessonPage mount = fresh ref)
- Respects 4-hour localStorage dismiss key (`save-modal-dismissed-soft`)
- **Pauses the lesson**: sets `pendingAdvance.current = true` and returns early from `handleComplete`. A `useEffect` watching `isModalOpen` resumes the lesson (advances to next exercise) when the modal closes.

### Regression mechanic

On fresh app load (no existing session, not just signed out), if the guest has ≥3 completed lessons and the 4h dismiss timer has expired:
- `applyGuestRegression()` is called
- It picks the most recently completed lesson and resets its `completedLessons` entry (removes it) + resets `strength` to 0
- Shows the `regression` modal explaining "your guest account has hit its limit"
- This creates urgency to sign in — the guest loses a lesson's progress permanently unless they sign in

Regression does NOT fire if:
- `sessionStorage.wasLoggedIn` is set (user was signed in this browser session)
- `completedLessons.length < 3`
- The regression dismiss timer is still active

### Cloud merge on sign-in

When `initializeFromCloud(userId)` runs after sign-in:
1. `loadProgressFromSupabase(userId)` fetches all 3 tables in parallel
2. `mergeProgress(localState, cloudData)` applies merge rules:
   - XP: take the max
   - `completedLessons`, `unlockedStages`, `triedEmergencyScenarios`: union (combine both)
   - `lessonRecords`: per lesson, keep the one with higher `timesCompleted`; if tied, keep higher `strength`
   - `streak`, `streakMultiplier`, `lastPlayedDate`: prefer whichever has the longer streak
3. Merged state is written back to Supabase + saved to local Zustand store
4. Guest progress is never lost — it always gets folded into the cloud record

---

## 10. Deployment Pipeline

### Hosting

The app is deployed on **Vercel**. The `client/` directory is the build root.

- **Build command:** `npm run build` (runs `tsc -b && vite build`)
- **Output directory:** `client/dist`
- **Framework preset:** Vite

### Environment Variables (set in Vercel dashboard)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

These must also be set in `client/.env.local` for local development (never commit this file).

### Auto-deploy

Every push to `main` triggers an automatic Vercel deploy. Build failures block the deploy — check Vercel dashboard logs for TypeScript errors.

### TypeScript strictness

Vercel runs `tsc -b` (project references, strict). This is stricter than running `tsc --noEmit` locally in some configs. Common gotcha: unused imports trigger `TS6133` on Vercel even if local `tsc` passes.

### Supabase OAuth redirect

In the Supabase dashboard → Authentication → URL Configuration:
- **Site URL:** `https://www.slovakforforeigners.eu`
- **Redirect URLs:** add both production URL and `http://localhost:5173` for local dev

---

## 11. Environment Setup

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project (free tier works)

### Local setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd Slovak4Foreigners/client

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local and fill in:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key

# 4. Set up database
# Open your Supabase project → SQL Editor
# Run the entire contents of src/lib/supabase/schema.sql

# 5. Set up Google OAuth
# Supabase dashboard → Authentication → Providers → Google
# Add your Google OAuth client ID + secret
# Set redirect URL to http://localhost:5173

# 6. Start dev server
npm run dev
# App runs at http://localhost:5173
```

### Useful commands

```bash
npm run dev          # Start dev server
npm run build        # Type-check + production build
npx tsc --noEmit     # Type-check only (no output files)
```

---

## 12. How to Add New Content

### Adding a new lesson

1. Create `client/src/data/lessons/[stage]-[n].json` following the existing format
2. Set `stageId` to one of `survival`, `settling`, or `advanced`
3. Add exercises using the supported exercise types (see Section 5)
4. Import the JSON in `client/src/data/lessons/index.ts` and add it to the exported array in the correct position
5. The Home page automatically groups by `stageId` — no other changes needed

### Adding a new exercise type

1. Add the type string to `ExerciseType` union in `client/src/types/lesson.ts`
2. Add a new interface extending `BaseExercise` in `client/src/types/lesson.ts`
3. Add to the `Exercise` union type
4. Create `client/src/components/exercises/[NewType]Exercise.tsx`
5. In `ExerciseShell.tsx`:
   - Add a label to `getTypeLabel()`
   - Add a `validate()` case
   - Add a render branch

### Adding a new dialogue

1. Create `client/src/data/dialogues/dialogue-[name]-tier[n].json` following the existing format
2. Design `nodes` array with branching `choices` (each choice has a `nextNodeId` pointing to another node's `id`, or `null` to end)
3. Import and add to the `dialogues` array in `client/src/data/dialogues/index.ts`
4. Dialogue access gating is position-based (index 0 and 1 are free for guests). If adding a new dialogue, update the `isAuthLocked = !user && index >= 2` check in `PracticeDialoguePage.tsx` if needed.

### Slovak text guidelines

- Always use proper Slovak diacritics in lesson content (the app's `flexMatch` handles diacritic-tolerant user input, but source content should be accurate)
- Numbers in Slovak-facing text must be words, not digits — but this is handled automatically by `slovakifyNumbers()` when rendering exercise text
- Keep exercise instructions in English; only the Slovak content should use Slovak

---

## 13. Known Issues & Future Work

### Known issues

- **TTS availability varies by browser/OS** — Web Speech API with `sk-SK` voice is available on Chrome and Edge on desktop; on mobile it depends on the device's installed voices. No fallback audio exists.
- **Zustand persist version** — the store is at version 7. Adding new persisted fields requires bumping the version and writing a migration in the `migrate` function, otherwise old localStorage data will be missing the new fields and users will get `undefined` errors.
- **No offline mode** — the app works offline for exercises already loaded, but sync requires connectivity. There's no explicit offline state or retry queue.
- **Delete account is not implemented** — the Profile page shows a "Delete Account" option that opens a modal directing users to contact `support@learnslovakforforeigners.com`. No automated deletion flow exists yet.
- **Emergency dialogue** — `dialogue-emergency-tier1` uses a different data structure (`EmergencyDialogueSession` component) than standard dialogues. The `emergencyMode` flag on the dialogue object routes it to the correct component.

### Future work ideas

- Email/magic-link auth as a fallback (for users without Google)
- Pronunciation scoring (Web Speech Recognition API)
- Push notifications for streak reminders (Web Push)
- More dialogue tiers (Tier 2 and Tier 3 scenarios)
- Offline-first with service worker
- Leaderboard: add all-time XP ranking alongside the weekly board

---

## 14. Build History

> Every push to GitHub must add an entry here. Format: `## Phase N — [date] — [title]`

---

### Phase 1 — Lesson Engine (pre-auth)

**Date:** Early 2026
**Scope:** Core offline lesson engine
- Vite + React + TypeScript + Tailwind project scaffolded
- 5 initial lessons (daily-life series) with exercises
- `useProgressStore` with XP, level, streak, lesson completion
- `LessonPage` with strike system and exercise routing
- `XpCelebrationPage` with canvas-confetti
- `SnailRacePage` timed mini-game
- All exercise types: `VOCABULARY_TABLE`, `LISTEN_AND_PICK`, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`, `UNSCRAMBLE`, `NUMBER_TO_WORDS`, `SMS_DIALOGUE`, `LISTEN_AND_IDENTIFY`
- TTS via Web Speech API
- `flexMatch` diacritic-tolerant answer checking
- `numberToSlovak` utility

---

### Phase 2 — Stage System

**Date:** 2026
**Scope:** Restructured lessons into stages + added Stage 1 Survival content
- Added `stageId` / `stageName` to lesson JSON format
- Created 6 Stage 1 Survival lessons (survival-1 through survival-6)
- Created 6 Stage 2 Settling In lessons (settling-1 through settling-6)
- Created 4 Stage 3 Advanced lessons (advanced-1 through advanced-4)
- Stage unlock system (100 XP for settling, 250 XP for advanced)
- `HomePage` grouped by stage with stage banners
- Sequential lesson unlock within each stage

---

### Phase 3 — Practice Dialogue

**Date:** 2026
**Scope:** Branching conversation system
- `PracticeDialoguePage` with dialogue cards
- `DialogueSession` component (standard branching dialogue)
- `EmergencyDialogueSession` component (emergency drill format)
- 5 dialogues: coffee shop, supermarket, bus, neighbor, emergency
- TTS auto-play on character lines
- `BottomNav` component with Home / Practice Dialogue / Profile tabs

---

### Phase 4 — Auth & Cloud Sync

**Date:** 2026
**Scope:** Supabase auth + progress sync
- Google-only OAuth via `supabase.auth.signInWithOAuth`
- `useAuthStore` with `onAuthStateChange` listener
- Supabase database schema (4 tables + 2 triggers)
- `progressSync.ts` — `syncProgressToSupabase`, `syncLessonRecord`, `syncSnailRaceRecord`, `loadProgressFromSupabase`, `mergeProgress`
- `initializeFromCloud` merges guest progress with cloud on sign-in
- `AuthPage` (Google sign-in page)
- Spinner on app load until `isInitialized`
- RLS policies on all tables

---

### Phase 5 — Guest Conversion Flow

**Date:** 2026
**Scope:** Nudge guests toward sign-in at strategic moments
- `SaveProgressModal` with 5 triggers: `soft`, `hard_stage`, `hard_unlock`, `hard_dialogue`, `regression`
- Soft modal: fires at exercise 3 of lesson 3 or 5 (once per session, 4h dismiss)
- Hard modals: stage completion, stage unlock, dialogue gate — no dismiss button
- Guest regression: on fresh app open with ≥3 lessons, resets one lesson as urgency signal
- `wasLoggedIn` sessionStorage flag prevents regression after sign-out
- `useRef` lock pattern in `AppRoutes` ensures regression check runs once only
- Lesson pause while modal is open (`pendingAdvance` ref + `isModalOpen` guard)
- Practice Dialogue page gates dialogues 3–5 for guests
- `hard_dialogue` trigger: "Sign in to continue"
- Fixed Vercel TS6133 build error (unused `navigate` import in `SaveProgressModal`)

---

### Phase 6 — Profile Page

**Date:** 2026-05-16
**Scope:** Full Profile page with user stats and settings
- `ProfilePage.tsx` with 8 sections:
  1. Header (avatar initial, display name, email, member since)
  2. Display name edit (updates both Supabase auth metadata and `user_profiles` table)
  3. XP & Level progress bar
  4. Stage progress (lessons complete per stage, snail race best score)
  5. Learning stats (total XP, streak, days active, lessons completed)
  6. Streak reminder toggle (localStorage)
  7. Sign out
  8. Delete account (shows contact support modal — not automated)
- Guest users are redirected to `/auth`
- `ProfilePage` route added to `App.tsx`
- `BottomNav` simplified: removed dropdown, Profile tab navigates to `/profile`

---

### Phase 7 — Project Documentation

**Date:** 2026-05-16
**Scope:** Developer onboarding journal
- Created `docs/PROJECT_JOURNAL.md` — comprehensive 14-section reference for junior developers
- Covers: project overview, tech stack, full file structure, database schema, all exercise types, XP formulas, dialogue system, auth flow, guest conversion mechanics, deployment, environment setup, content authoring guide, known issues, complete build history

---

### Phase 8 — OAuth & Dev Server Fixes

**Date:** 2026-05-16
**Scope:** Production OAuth redirect + stable local dev port
- Confirmed `signInWithGoogle` in `useAuthStore.ts` already uses `redirectTo: window.location.origin` (no hardcoded URLs)
- Added `server: { port: 5173, strictPort: true }` to `vite.config.ts` — dev server always starts on 5173 and errors instead of silently incrementing, so Supabase redirect URLs are always predictable

---

### Phase 9 — Daily Review System

**Date:** 2026-05-16
**Scope:** Mixed-lesson review session with auto-trigger and real-time UI feedback

**New: `ReviewSessionPage.tsx`** (`/review` route)
- 4 screens: `intro → session → complete → already_done`
- **Intro screen** — `snailReading.png` mascot, "Time to Review!" copy, lesson list with color-coded strength bars (🔴 < 30%, 🟡 < 60%, 🟢 ≥ 60%), "Start Review" button, "Maybe Later" link (hidden when auto-triggered)
- **Session** — shuffles 3–4 exercises from each of the 3 weakest lessons (strength < 70) into one mixed session; "From: Lesson Title" label above every exercise; same ExerciseShell + ExerciseCelebration + ConfirmModal as LessonPage
- **Completion screen** — XP earned (1 per correct answer, max 10, +2 perfect bonus), strength before → after bar for each reviewed lesson
- **Already-done screen** — live HH:MM:SS countdown to midnight, Back to Home

**`useProgressStore.ts`** — persist version bumped to 5
- Added `lastReviewDate: string | null` (persisted; cleared in v5 migration)
- Added `completeReview(xpEarned, lessonIds)` — boosts each reviewed lesson strength +20 (capped at 100), awards XP, sets `lastReviewDate = today`, syncs to Supabase

**`App.tsx`** — auto-trigger in `AppRoutes`
- One-shot `useEffect` (locked by `autoReviewChecked` ref + `sessionStorage.autoReviewShown`)
- Fires when: auth initialized + any lesson strength < 30 + `lastReviewDate !== today` + no regression modal showing
- Requires logged-in user OR guest with ≥ 3 completed lessons
- Navigates to `/review` with `{ state: { autoTriggered: true } }` — hides "Maybe Later" on intro screen

**`HomePage.tsx`** — two reactivity fixes
- `lessonRecords` now read via dedicated `useProgressStore((s) => s.lessonRecords)` selector — strength dot colors update immediately after review without page refresh
- `showReviewBanner` now also checks `lastReviewDate !== todayStr()` — banner disappears as soon as a review is completed today, reappears tomorrow if lessons decay again

---

### Phase 10 — Hash Routing, Foreigner Exclusive, Mojibake Fix

**Date:** 2026-05-17
**Scope:** Routing overhaul, new content section, encoding bug fix

**Hash routing** — switched from `BrowserRouter` to `HashRouter` across the entire app. All URLs now use `#` format (`/#/lesson/:id`, `/#/profile`, etc.). Required because Vercel's SPA rewrite rules were breaking deep links on refresh. No server-side route config needed with hash routing.

**Foreigner Exclusive section** — new gated content area for foreigners living in Slovakia:
- `ForeignerExclusivePage`, `ForeignerExclusiveCategoryPage`, `ForeignerExclusiveLessonPage` — three-level drill-down
- First category: Foreign Police — residence permit procedures, document vocabulary, situational exercises
- Reference card unlock system — completing exercises unlocks `unlockedReferenceCards[]` in the store
- Bottom nav updated with "🇸🇰" (foreigner exclusive) tab

**Mojibake fix** — `temporary-residence.json` had 75+ lines of double-encoded UTF-8 (bytes read as Windows-1252 then re-saved as UTF-8, e.g. `Ã½` → `ý`). Fixed with PowerShell byte-level targeted replacements using `New-Object System.Text.UTF8Encoding $false` to write back without BOM.

---

### Phase 11 — Legal Pages, GDPR Consent Popup, Security Hardening

**Date:** 2026-05-17
**Scope:** Compliance infrastructure and input security

**New pages:**
- `PrivacyPolicyPage.tsx` — 13-section GDPR-compliant privacy policy (route: `/privacy`)
- `TermsOfServicePage.tsx` — 15-section terms of service (route: `/terms`)
- Both accessible from Profile page → Legal section, and linked from the consent popup

**`ConsentPopup.tsx`** (new component):
- Waits for the user's **first tap/click** before appearing (capture-phase `document.addEventListener('click', handler, { capture: true, once: true })`). The click is intercepted via `stopImmediatePropagation()` so it does not activate anything behind the popup.
- Scrolling is unaffected — only click events are intercepted.
- On `/terms` or `/privacy` routes: renders as a **mini bar** at the bottom (does not block page reading); on all other routes: renders as a **full blocking modal**.
- localStorage keys: `consentAccepted`, `consentVersion: "1.0"`, `consentDate`, `lastConsentShown`
- Guests: re-shown after 24h. Signed-in users: never re-shown once accepted for v1.0.

**`ProfilePage.tsx`** — security hardening on display name input:
- `trimmed.length > 50` → validation error "Name must be 50 characters or fewer"
- `/[<>]/.test(trimmed)` → validation error "Name contains invalid characters"
- Both checks fire before any Supabase write

---

### Phase 12 — Stage Unlock Logic Fix + Retroactive Correction

**Date:** 2026-05-17
**Scope:** Enforce stage prerequisite completion, fix existing bad data

**Forward guard** (`unlockStage` in `useProgressStore.ts`):
- Added `isPrevStageComplete(stageId, completedLessons)` check before allowing a stage unlock
- Users can no longer unlock Stage N without finishing every lesson of Stage N-1
- XP cost still applies; the completion check is an additional gate

**Retroactive correction** — two layers:
1. `onRehydrateStorage` runs `sanitizeUnlockedStages(state.unlockedStages, state.completedLessons)` on every app load — corrects localStorage
2. `initializeFromCloud` applies `sanitizeUnlockedStages` to the **merged** result (after `mergeProgress`) before calling `set()` and before writing back to Supabase — prevents the cloud's stale bad data from overwriting the correction

Root cause of why `onRehydrateStorage` alone wasn't enough: `mergeProgress` unions local + cloud `unlockedStages`, so the cloud's bad stages were added back after `onRehydrateStorage` had already fixed them locally.

**`HomePage.tsx`** — stage gate button updated:
- Label changes: "Complete all lessons first" / "Need X more XP" / "Unlock — N XP"
- Button disabled unless both conditions are met (`canUnlockNext = canAffordNext && allInStageCompleted`)

Store bumped to **version 6** for this fix.

---

### Phase 13 — Review System Rework (12-Hour Cycle)

**Date:** 2026-05-17
**Scope:** Replace daily decay with a 12-hour global review clock

**Architecture change:** Per-lesson decay rates (5–20% per day based on strikes) replaced with a single global 12-hour clock. All lessons share the same cycle.

**`useProgressStore.ts`** — bumped to **version 7**:
- `lastReviewDate: string | null` (YYYY-MM-DD) → `lastReviewedAt: string | null` (ISO timestamp)
- New exported helper `computeStrength(lastReviewedAt, completedAt, nowMs)` — pure function, used by both store and UI
- `decayLessonStrengths()` — no longer per-lesson; applies `computeStrength` to every record on app load
- `completeReview()` — resets **all** `lessonRecords` to `strength: 100`, sets `lastReviewedAt = now`, syncs XP to Supabase
- `getWeakLessons()` threshold: `strength < 80` (was `< 60`)

**`ReviewSessionPage.tsx`** — fully rewritten:
- `alreadyDone`: `hoursElapsed < 12` (was "same calendar day")
- `buildSession`: up to 3 random completed lessons × 2 exercises each = **max 6 exercises** (was up to 10)
- Complete screen: shows `strengthBefore% → 100%` per lesson (was `+20%` boost)
- `AlreadyDoneScreen`: countdown to `lastReviewedAt + 12h` (was countdown to midnight)

**`HomePage.tsx`**:
- `now` state ticks every 60s via `setInterval` — dot colors update live while app is open
- Review banner: warning (amber) at 7h, urgent red at 12h with "Review overdue!" label
- First-review trigger: no `lastReviewedAt` + ≥3 completed lessons (user-initiated via banner)

**`App.tsx`** — auto-trigger:
- Fires when `hoursElapsed >= 12` since `lastReviewedAt` (was `any strength < 30 + not today`)
- First review (no `lastReviewedAt`) is never auto-triggered — always user-initiated

**Soft login prompt** (`LessonPage.tsx`) — timing updated:
- Now fires at **exercise 5** of the 2nd, 4th, and 6th Stage 1 lesson (odd `completedSurvivalCount`)
- Previously fired at exercise 3 of lesson 3 or 5

---

### Phase 14 — Review Banner Refinements

**Date:** 2026-05-17 / 2026-05-18
**Scope:** Fix review banner false positives + delay timing

**Review banner appears at 9h, not 7h** (`HomePage.tsx`):
- Warning zone moved from `hoursElapsed >= 7` to `hoursElapsed >= 9` — 2 hours after dots turn yellow
- Overdue threshold stays at 12h

**Exclude freshly-redone lessons** (`ReviewSessionPage.tsx`):
- `buildSession` filters by `computeStrength(lastReviewedAt, record.completedAt, nowMs) < 100`
- Lessons the user voluntarily replayed since the last review have `completedAt > lastReviewedAt`, so `computeStrength` returns 100 and they are excluded from the review queue

**Hide banner when session would be empty** (`HomePage.tsx`):
- Added `hasLessonsNeedingReview` check: `lessonRecords.some(r => computeStrength(...) < 100)`
- `showReviewBanner` is now `hasLessonsNeedingReview && (timeCondition)` — prevents the confusing "Review due" → "All lessons are fresh!" dead-end when all lessons were recently replayed

---

### Phase 15 — Header Redesign + Codebase Cleanup

**Date:** 2026-05-18
**Scope:** Unified header across all main pages + removal of dead components

**New header structure** (applied to `HomePage`, `PracticeDialoguePage`, `ForeignerExclusivePage`):

Row 1 — logo + page title

Row 2 — three separate elements:
- **Stats widget** — amber pill with `🔥 N Streak` and `⚡ N XP` inline (icon + number + label on one line, separated by a vertical divider)
- **Review pill** — separate amber pill with `⚠️ N+ Review`; pulses (`animate-pulse`) to catch attention; only visible when `showReviewBanner` is true
- **Join Our Physical Sessions** CTA — amber button with 👥 icon; positioned `ml-auto` (far right):
  - When Review pill is **hidden**: shows full text ("Join Our Physical Sessions / Register →")
  - When Review pill is **visible**: collapses to icon-only to make room

**Review pill behaviour:**
- Red 🔴 icon when overdue (12h+), amber ⚠️ when in warning zone (9–12h)
- Shows `N+` count of lessons with `computeStrength < 100`
- Tapping navigates to `/review`

**Dead code removed:**
- `HeartsDisplay.tsx` — hearts-based life system, never used after strike system replaced it
- `SnailMascot.tsx` — SVG snail component, superseded by PNG images in `/public`
- `XpBadge.tsx` — replaced by inline stats widget in all three pages
- `StreakDisplay.tsx` — replaced by inline stats widget in all three pages

`tsc --noEmit` passes clean after all deletions.

---

### Phase 16 — Physical Session Registration Feature

**Date:** 2026-05-18
**Scope:** Allow signed-in users to register interest in upcoming physical Slovak practice sessions

**New component — `SessionRegistrationModal.tsx`:**
- 3-screen modal: `guest` → `form` → `success`
- **Guest screen:** snailReading.png mascot + "Sign in to register" + Google sign-in button; sets `sessionStorage.openSessionModal = 'true'` before OAuth redirect so the modal re-opens automatically after return
- **Form screen:** Name (pre-filled from Google `display_name / full_name / name` metadata), Email (read-only), Phone (optional) → calls `insertSessionRegistration` → transitions to success
- **Success screen:** snailExcited.png + different copy for `justRegistered` vs already registered

**`progressSync.ts`** — two new Supabase helpers:
- `checkSessionRegistration(userId)` — queries `physical_session_regist` table, returns `boolean`
- `insertSessionRegistration(userId, name, email, phone)` — inserts row, returns `{ error: string | null }`

**`useProgressStore.ts`** — bumped to **version 8**:
- Added `isSessionRegistered: boolean` and `setIsSessionRegistered(val)` action
- v8 migration: sets `isSessionRegistered: false` for existing persisted stores

**`useAuthStore.ts`:**
- `signOut` now resets `isSessionRegistered` to `false` via dynamic import of `useProgressStore` (avoids circular dependency)

**`App.tsx`:**
- New `useEffect` calls `checkSessionRegistration(userId)` on login and syncs result to store

**`HomePage.tsx`:**
- Join Session buttons (both icon-only and full variants) wired to `setShowSessionModal(true)`
- `useEffect` checks `sessionStorage.openSessionModal` on mount → re-opens modal after OAuth redirect
- Button appearance adapts when `isSessionRegistered`: green ✓ icon, "Registered! / See details →" copy
- `SessionRegistrationModal` rendered when `showSessionModal` is true

**Supabase table — `physical_session_regist`:**
```sql
create table public.physical_session_regist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text,
  created_at timestamptz not null default now(),
  unique (user_id)
);
```
RLS: authenticated users can insert and select their own row only.

---

### Phase 17 — Fix Supabase Data API table exposure

**Date:** 2026-05-18
**Scope:** Resolve 403 Forbidden errors on `physical_session_regist` table

Both the `checkSessionRegistration` (GET) and `insertSessionRegistration` (POST) calls were returning 403. Root cause: RLS policies had not been applied to the table after it was created.

**Fix:** Re-ran RLS SQL in Supabase dashboard:
- `alter table public.physical_session_regist enable row level security`
- Dropped and re-created both policies (`for insert with check` + `for select using`)

No code changes — fix was entirely in Supabase dashboard.

---

### Phase 18 — Alias System, Weekly XP & Leaderboard

**Date:** 2026-05-18
**Scope:** Player identity, weekly competition, and NPC population

**Alias system:**
- 25 base aliases defined in `client/src/data/aliases.ts` (all `*Snail` names: FrogySnail, KualySnail, BunnySnail … ZebySnail)
- Avatar images at `client/public/pp/{BaseName}.png` — 15 new PNGs added for expanded set
- `aliasUtils.ts` — `getAvatarUrl(alias)` strips `_N` suffix; `loadOrAssignAlias(userId)` auto-assigns a random unique alias on first login; `changeAlias(userId, baseName)` enforces 30-day cooldown via `alias_changed_at` on `user_profiles`
- Cooldown only activates on **manual** alias changes — auto-assigned aliases can be changed freely
- Alias collision handled by appending `_2`, `_3`, etc. until a free slot is found
- `ProfilePage` alias picker: scrollable 5-column grid (`max-h-[60vh]`), change button disabled within 30-day window
- `useAuthStore` stores `alias`; `signOut` resets it to `''`

**Weekly XP:**
- `weekly_xp` column on `user_profiles` — reset by pg_cron every Monday 00:00 UTC
- `syncWeeklyXp(userId, xp)` and `loadWeeklyXp(userId)` in `progressSync.ts`
- `useProgressStore` v10 added `weeklyXp` field; incremented on every lesson, race, and review XP earn event
- Loaded from Supabase on login (cron may have reset it since last visit)

**Leaderboard (`LeaderboardModal.tsx`):**
- Fetches real users (limit 500), all NPCs, and previous week's winner in parallel
- Merges into a single sorted list, shows top 100
- Rank banner updates dynamically: gray (not ranked / outside top 100), green (#1), amber (ranked)
- Previous week's winner shown in modal header: `🏆 [avatar] Winner of Week DD.MM.YYYY / [alias]`
- BottomNav now has 5 tabs: 🏠 Home | 💬 Practice Dialogue | 🇸🇰 Foreigner Exclusive | 🏆 Leaderboard | 👤 Profile
- Profile tab icon animates: alternates between initial letter and alias avatar every 4s (cross-fade via inline opacity transition)

**NPC system (Supabase):**
- `npc_profiles` table: 100 NPCs with personality types (`grinder`, `casual`, `weekend_warrior`, `fading`)
- `update_npc_xp()` pg_cron runs every 3h — scales gains to top real user XP, personality-based variance
- `record_weekly_winner()` pg_cron at 23:55 UTC Sunday — records current #1 before Monday reset
- `weekly_winners` table stores winner history; displayed in leaderboard header

---

### Phase 19 — Live NPC Leaderboard Animation

**Date:** 2026-05-18
**Scope:** Client-side simulated NPC movement while the leaderboard modal is open

**`LeaderboardModal.tsx`** changes:
- `setInterval` every 10s while modal is open; cleared on unmount via `useEffect` cleanup
- Each tick: picks 1–3 random NPCs from the displayed list, bumps each by +1..+15 XP
- **Sunday protection (client-side):** if `new Date().getDay() === 0` and a real user holds #1, NPCs are capped at `realUserXp - 1` for that tick
- Re-sorts the full list after each tick; updates `userRank` state so the banner ("You are currently #N") updates live
- `rowsRef` pattern: a `useRef` mirrors `allRows` so the interval reads current state without needing to be in the dependency array (avoids interval restart on every render)
- **Flash animation:** `@keyframes xp-flash` embedded via `<style>` tag — bumped XP values briefly turn green (`#15803d`) then fade back to gray over 0.6s; `flashedKeys` Set tracks which rows are mid-flash; cleared after 600ms via `setTimeout`
- Real user rows are never touched — only NPC keys (starting with `npc-`) are eligible for bumps

---

### Phase 20 — Analytics, Auth Data Isolation & Real Delete Account

**Date:** 2026-05-18
**Scope:** Vercel Analytics integration, multi-user data safety, and implemented delete account

**Vercel Analytics:**
- Added `@vercel/analytics/react` — `<Analytics />` component mounted in `AppShell` render; zero-config, no cookie banner needed

**Sign-out data isolation bug (root cause + fix):**
- Bug: User A signs out; User B signs in on the same device. `initializeFromCloud` was reading `stored_user_id` from localStorage and, if User B had never used the device before (no stored ID), it treated local guest data as theirs and merged it — so User B inherited User A's completed lessons and XP.
- Fix: Added a user-switch detection check inside `initializeFromCloud` that compares `stored_user_id` against the incoming `userId`. If they differ, local state is reset to defaults before the cloud merge. `stored_user_id` is written to localStorage on each cloud sync and cleared on sign-out.
- Secondary fix: moved the `wasLoggedIn` sessionStorage flag write from the auth-state listener into `initializeFromCloud` so the flag is set only when a real cloud load occurs.

**Real delete account flow:**
- Profile page "Delete account" button now opens a confirmation modal with a "Delete my account" destructive action
- On confirm: calls `supabase.auth.admin` via a SECURITY DEFINER RPC, deletes `user_profiles`, `user_progress`, `lesson_records`, `snail_race_records` rows, then signs out
- Store is reset to defaults and all user-specific localStorage keys are cleared

---

### Phase 21 — Admin Dashboard

**Date:** 2026-05-19
**Scope:** Hidden admin panel accessible only to the admin user

**`AdminPage.tsx`** (new, route: `/admin`):
- Accessible only when `useAuthStore.isAdmin === true`; all other users are redirected to `/`
- `loadIsAdmin(userId)` in `progressSync.ts` checks `user_profiles.is_admin` column; result stored in `useAuthStore.isAdmin`

**Sections:**
- **User Stats** — total registered users, weekly active users, total XP across all users (live Supabase queries)
- **Recent Sessions** — scrollable list (max-h-[560px]) of the 10 most recent `user_sessions` rows with alias, duration, and timestamp
- **User Controls** — search by alias → view user profile → manually adjust XP (add/subtract) via admin RPC; updates `user_progress.xp` and `user_profiles.weekly_xp`
- **NPC Controls** — trigger NPC XP update immediately (calls `update_npc_xp` RPC) without waiting for the 3-hour cron

**Profile page admin entry:**
- Admin link replaced standard "Admin Dashboard" card with a plain `⁂` (asterism) text button — visually looks like a decorative separator, not an interactive element; provides stealth access

---

### Phase 22 — Magic Box Reward Feature

**Date:** 2026-05-19
**Scope:** Daily surprise XP reward system with admin trigger

**Concept:** Once per day, a signed-in user who opens the app may find a Magic Box containing a random XP reward (5, 10, 15, or 20 XP). The box opens on first app visit after midnight.

**`magicBox.ts`** (new):
- `runMagicBoxCheck(userId)` — reads `user_profiles.magic_box_force_trigger` and `magic_box_claimed_date`; returns `true` if the box should be shown (either force-triggered by admin or not yet claimed today)
- `claimMagicBox(xp)` — calls `claim_magic_box` SECURITY DEFINER RPC which writes the XP to `user_progress` and stamps `magic_box_claimed_date = today`
- **RLS fix:** direct `.update()` on `user_profiles` from the admin was silently blocked by RLS (no error returned, 0 rows affected). Fixed by routing through `admin_set_magic_box_trigger` SECURITY DEFINER RPC.
- **PostgREST schema cache fix:** after `ALTER TABLE` added `magic_box_force_trigger`, new column was silently omitted from SELECT responses until `NOTIFY pgrst, 'reload schema'` was run in the SQL editor.

**`MagicBoxModal.tsx`** (new):
- Displays 3 mystery gift boxes; user taps one to reveal the XP
- **Open sound:** rising frequency sweep (160→880 Hz) + sparkle cascade (C6→E6→G6→C7) on mount via Web Audio API
- **Pick sound:** ascending arpeggio (C5→E5→G5→C6 held) on box selection
- `SnailSuperExcited.png` mascot between title and subtitle
- After claim: `initializeFromCloud` re-syncs XP, then `loadWeeklyXp` refreshes the leaderboard XP — so all counters update instantly

**`App.tsx` integration:**
- Magic box check runs once per login (`magicBoxCheckedUser` ref guard); also re-checked on `visibilitychange` to catch midnight day-changes
- Toast notification: "+N XP from your Magic Box! 🐌" fades after 4s

**Admin trigger (AdminPage):**
- "Trigger Magic Box" button calls `admin_set_magic_box_trigger(target_user_id)` RPC — sets `magic_box_force_trigger = true` on any user, overriding the daily claim check so the box shows on their next app open

---

### Phase 23 — Weekly Winner Notification

**Date:** 2026-05-19
**Scope:** Show the weekly leaderboard winner to all users on app open

**`WeeklyWinnerModal.tsx`** (new):
- Full-screen dark overlay (z-[70]), confetti, `SnailSuperExcited.png` mascot, winner avatar with gold ring (80px)
- Conditional copy: "You won this week! 🏆" (current user is winner) vs "We have a winner! 🏆" (other user won)
- Button triggers a victory cheer sound (Web Audio API); backdrop tap does nothing (non-dismissible)
- Cannot be dismissed by tapping outside — button is the only exit

**`checkWeeklyWinner(userId, userAlias)`** in `progressSync.ts`:
- Queries `weekly_winners` for the most recent row with `week_of >= lastMonday`
- Returns `null` if already seen this week (`winner_seen_week` key in localStorage matches current Monday)
- Returns `{ show: true, winnerAlias, winnerAvatar, winnerXp, isCurrentUser }` otherwise

**`markWinnerSeen()`** — writes current Monday's date string to `winner_seen_week` in localStorage so the modal doesn't reappear

**`App.tsx` priority ordering:**
- Weekly Winner modal (z-[70]) renders before Magic Box modal: `{showMagicBox && !weeklyWinner && <MagicBoxModal />}`
- `handleWinnerDismiss`: marks winner seen → clears winner state → pulses leaderboard nav icon for 10s → triggers magic box check if it hadn't run yet (safety net for modal ordering)

**Admin preview (AdminPage):**
- "Preview Winner Notification" button fetches the latest `weekly_winners` row and opens `WeeklyWinnerModal` in preview mode
- Read-only — does not write to the database; allows admin to test both the winner and non-winner views

---

### Phase 24 — Alias System Rework & UI Polish

**Date:** 2026-05-19
**Scope:** Required alias selection on first login, 4-digit suffix format, profile + nav polish

**Alias system rework:**
- **Before:** aliases were auto-assigned on first login (e.g. `FrogySnail`, then `FrogySnail_2` on collision)
- **After:** no auto-assign. New users must pick their alias manually before using the app.
- Suffix format changed from sequential `_2/_3` to random 4-digit `_1000–_9999` (e.g. `BunnySnail_4271`). 25 base names × 9000 possible suffixes = 225,000 combinations.
- `generateUniqueAlias(baseName)` — 30-attempt loop; random 4-digit suffix each attempt; inserts directly to `user_profiles.alias`
- `loadAlias(userId)` replaces `loadOrAssignAlias` — returns `null` (no alias → show picker), `''` (DB error → silent, no picker), or the alias string
- `assignDefaultAlias` removed entirely

**`AliasPickerModal.tsx`** (new):
- Sheet-style modal (z-[80]), slides up from bottom, non-dismissible (no X button, no backdrop tap)
- Subtitle: "To keep our Users privacy, your Alias is what other users will see"
- Grid of 25 base names; tapping generates a 4-digit alias and calls `changeAlias(userId, baseName)`
- On successful pick: shows `WelcomeOverlay` (z-[90]) — confetti, `SnailSuperExcited.png`, avatar, "Welcome, {alias}! 🎉", body text explaining the alias is their public identity
- "Let's go!" button plays a cheer sound and calls `onDone(alias)`

**Leaderboard nav pulse:**
- After `WeeklyWinnerModal` dismiss, the 🏆 BottomNav icon pulses strongly (scale 1→1.45× at 0.6s cycle + gold `drop-shadow(0 0 6px #FFD700)`) for 10 seconds to draw attention to the leaderboard
- `leaderboardPulse: boolean` added to `useAuthStore`; trophy button tap clears it

**Profile page polish:**
- Sign out button moved above the Legal section
- Delete account: removed card/row wrapper → plain small grey text button (no white background)
- Admin entry (⁂): removed card/row wrapper → plain neutral text, blends with surrounding content

**Admin page:**
- Recent Sessions list wrapped in `overflow-y-auto max-h-[560px]` — scrollable when more than ~10 sessions

---

### Phase 26 — PWA Install Sheet Refinements

**Date:** 2026-05-20
**Scope:** iOS-aware install prompts + improved dismiss UX

**`client/src/lib/pwaInstall.ts`** — three new helpers:
- `isIOS()` — detects iPhone/iPad/iPod via `navigator.userAgent`
- `isInStandaloneMode()` — checks `(display-mode: standalone)` media query + `navigator.standalone` (iOS Safari)
- `shouldShowIOSPrompt()` — returns true if: iOS device + not in standalone mode + not previously installed + 24h cooldown elapsed

**`PwaInstallSheet.tsx`** — UX overhaul:
- Removed "Not now" button; dismissal now requires **3 taps on the backdrop** (tap counter tracked via `useRef`)
- Added `isIOS?: boolean` prop
- **iOS flow:** Install button → sets `showIOSSteps = true` → displays step-by-step "Add to Home Screen" instructions with visual cues → "Got it" dismisses
- **Android/Chrome flow:** Install button → calls `onInstall()` (deferred prompt), unchanged

**`App.tsx`:**
- Added `isIOSInstall` boolean state
- New `useEffect` on mount: if `isIOS() && shouldShowIOSPrompt()`, schedules the iOS sheet after 10s
- `handleInstallDismiss` resets both `showInstallSheet` and `isIOSInstall`

---

### Phase 27 — Study Reminder System (Attempted & Removed)

**Date:** 2026-05-20 → 2026-05-21
**Scope:** Full Web Push notification system — built, then abandoned and cleaned up

#### What was built

**VAPID keys** generated via `npx web-push generate-vapid-keys`; stored in gitignored `.env.local` (server-side) and `client/.env` (frontend public key).

**`client/src/lib/supabase/studyReminder.ts`** (deleted):
- `StudyReminderSettings` interface: `studyReminderTime`, `studyReminderEnabled`, `pushSubscription`, `timezone`
- `loadStudyReminder(userId)` — reads from `user_profiles`
- `saveStudyReminder(userId, patch)` — upserts; must include `email` due to NOT NULL constraint
- `formatReminderTime(value)` — converts `"HH:MM"` to `"H:MM AM/PM"`

**`client/src/components/StudyTimePickerModal.tsx`** (deleted):
- Time slot picker (30-min increments, 6 AM – 11 PM)
- On confirm: requests `Notification.requestPermission()`, subscribes to push via `pushManager.subscribe()`, saves to Supabase including IANA timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)

**`supabase/functions/send-study-reminders/index.ts`** (deleted):
- Deno Edge Function using `npm:web-push`
- Fetched all enabled users, converted UTC target time to each user's stored timezone via `Intl.DateTimeFormat`, sent push notifications to matching users
- Intended to run every 5 minutes via pg_cron

**`user_profiles` columns added** (must be dropped manually — see SQL below):
`study_reminder_time`, `study_reminder_enabled`, `push_subscription`, `timezone`

**`ProfilePage.tsx`** — new "Study Reminder" section with enable toggle and "Change time" row.

**`sw.js`** — added `push` and `notificationclick` event handlers.

#### Why it was removed

Web Push delivery was unreliable across the target browsers (especially iOS Safari). The timezone-aware delivery logic was complex, and the feature added significant infra surface area (VAPID keys, Edge Function, pg_cron job) for uncertain value. Decision: abandon entirely.

#### Cleanup (commit `8cee32b`)

- **Deleted:** `StudyTimePickerModal.tsx`, `studyReminder.ts`, `send-study-reminders/` edge function
- **Cleaned:** `App.tsx` (removed `showStudyPicker` state + render), `ProfilePage.tsx` (removed Study Reminder section + all imports), `sw.js` (removed push handlers), `client/.env` (removed `VITE_VAPID_PUBLIC_KEY`)
- **Manual DB cleanup** (run in Supabase SQL editor):
  ```sql
  alter table public.user_profiles
    drop column if exists study_reminder_time,
    drop column if exists study_reminder_enabled,
    drop column if exists push_subscription,
    drop column if exists timezone;

  select cron.unschedule('send-study-reminders');
  ```
- **Vercel:** remove `VITE_VAPID_PUBLIC_KEY` from environment variables manually

---

### Phase 25 — Database Maintenance

**Date:** 2026-05-19
**Scope:** RLS policy deduplication (no code changes)

**`weekly_winners` table** had two identical SELECT policies both using `USING (true)` for `authenticated` role:
- "All users can read weekly winners"
- "Anyone can read weekly winners"

Verified via codebase audit that all three query sites (`LeaderboardModal`, `progressSync.checkWeeklyWinner`, `AdminPage`) use the standard authenticated Supabase client — neither policy name is referenced in code. Deleted "Anyone can read weekly winners"; "All users can read weekly winners" remains as the single authoritative policy. No behavioral change.

---

### Phase 28 — Block Dialogue Feature (Guided / Unguided)

**Date:** 2026-06-14 → 2026-06-16
**Scope:** New per-block conversation exercise sitting between a block's lessons and its Snail Race, with a two-pass guided → unguided flow

**New types — `client/src/types/blockDialogue.ts`:**
- `BlockDialogue`, `BlockDialogueExchange`, `BlockDialogueChoice`, `BlockDialogueContact`
- Each exchange has Slovak `text` + `translation`, a `prompt`, multiple `choices` (one `isCorrect`), and `correctFeedback` / `wrongFeedback` strings

**New data — `client/src/data/block-dialogues/`:**
- `block1-dialogue.json` — 6-exchange conversation with "Marek" (`blockId: stage1-block1`, `xpReward: 20`) covering greeting, small talk, admitting limited Slovak, asking him to slow down, confirming understanding, and a formal farewell
- `index.ts` exports `blockDialogues[]` and `getBlockDialogueById(blockId)`

**New page — `BlockDialoguePage.tsx`** (route: `/block-dialogue/:blockId`, bare route, no guard):
- Two modes driven by `isGuided = location.state?.guided === true` — **not** a query param (see HashRouter note below)
- **Guided mode:** Slovak text and choices both show their English `translation`; on completing all exchanges, shows a "Ready for the real thing?" transition screen (no XP, no store write) with a "Let's Go" button that re-navigates to the same route **without** `state`, landing in unguided mode
- **Unguided mode:** translations hidden throughout; completion screen awards `dialogue.xpReward` via `addXP` and calls `completeBlockDialogue(blockId)` — this is the **only** path that marks the block's dialogue complete
- `useEffect` keyed on `location.key` resets all local state (`exchangeIndex`, `phase`, `selectedChoice`, `history`) on every navigation — required because React Router reuses the same component instance across guided → unguided since both hit the same route pattern; without the reset, "Let's Go" landed straight on the completion screen because `phase` was still `'complete'` from the guided run

**`HomePage.tsx` integration:**
- New dialogue node rendered between a block's lessons and its Snail Race card
- Tapping it always navigates with `{ state: { guided: true } }` — both first play and replay restart from guided, so the translated walkthrough is available every time
- Race button gate: `raceUnlocked = isDev || (allBlockLessonsCompleted && (dialogueCompleted || !blockDialogue))`

**`useProgressStore.ts`:**
- Added `completedBlockDialogues: string[]`, `completeBlockDialogue(blockId)`, `hasCompletedBlockDialogue(blockId)`
- Persist version bumped **12 → 15** — required three extra bumps during testing because stale pre-feature localStorage data (`completedBlockDialogues` already containing `stage1-block1` from before guided/unguided existed) kept routing returning players straight to unguided mode; each bump forces the migration to re-run and reset the field

**HashRouter gotcha (the actual bug, not a symptom):**
- `useSearchParams()` and `new URLSearchParams(location.search)` both read empty under `HashRouter` — query params inside the `#` fragment aren't exposed via `window.location.search`, and `navigate('/path?x=1')` can even misplace the `?` outside the fragment
- Fix: abandoned query params entirely in favor of React Router `location.state`, which lives in the history entry object and isn't subject to hash-URL encoding at all

`tsc --noEmit` clean throughout; two temporary debug `console.log` statements (in `BlockDialoguePage.tsx` and `HomePage.tsx`, added to diagnose the `location.state` issue) were removed once the feature was confirmed working.

---

### [Codex] Phase 29 — 2026-06-16 — Stage 1 Family Lesson Content Replacement

**Scope:** Replace the local Stage 1 Family lesson JSON with the user-provided file.

- Replaced `client/src/data/lessons/s1-family.json` with `C:\Users\Ty\Downloads\s1-family.json`.
- Verified the copied file matches the source byte-for-byte by SHA-256 hash.
- Confirmed the lesson keeps `id: "s1-family"`, `stageId: "survival"`, and contains 9 exercises.
- Ran `npx tsc --noEmit` from `client/`; TypeScript completed with zero errors.

---

### [Claude Code review of Codex Phase 29]

**Verdict:** Matches the claim. Verified independently, not just read.

- Re-ran `npx tsc --noEmit` from `client/` myself — clean, zero errors, confirming Codex's claim rather than trusting it.
- Read `s1-family.json` directly: `id: "s1-family"`, `stageId: "survival"`, exactly 9 exercises — matches Codex's description exactly.
- Confirmed `client/src/data/lessons/index.ts` already imports it correctly as `s1Family` — no wiring left dangling.
- Content check: vocabulary table (core + extended family), bidirectional listen/pick, pick-translation, an 8-scenario situational-choice set, 6-item fill-in-blank, and a word-match review — all using proper Slovak diacritics, consistent with existing lesson conventions.
- No conflicts with the rest of the in-progress (uncommitted) lesson restructuring — this is a content-only swap of a file the restructuring already references.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Codex] Phase 30 - 2026-06-16 - Block Dialogue Open Question Flag

**Scope:** Add open-question metadata to block dialogue exchanges and replace Block 2 dialogue content.

- Added `isOpenQuestion: boolean` to `BlockDialogueExchange`.
- Reviewed `BlockDialoguePage.tsx`; answer handling already uses `selectedChoice.isCorrect` only and does not assume exactly one correct choice per exchange.
- Replaced `client/src/data/block-dialogues/block2-dialogue.json` with the user-provided file.
- Verified copied Block 2 JSON matches the source byte-for-byte by SHA-256 hash.
- Verified `ex2` through `ex7` are open questions with all 4 choices marked correct.
- Verified `ex1` and `ex8` are closed questions with exactly 1 correct choice.
- Ran `npx.cmd tsc --noEmit` from `client/`; TypeScript completed with zero errors.

---

### [Codex] Phase 31 - 2026-06-16 - Closed Block Dialogue Retry Loop

**Scope:** Make closed block dialogue questions retry once after a wrong answer.

- Updated `BlockDialoguePage.tsx` with a per-exchange wrong-attempt counter.
- Closed questions (`isOpenQuestion: false`) now show wrong feedback, then Marek says `Prepáčte, nerozumiem. Môžete to skúsiť znova?`, then the same exchange is shown again.
- A second wrong answer on the same closed exchange shows feedback and then advances, preventing an infinite loop.
- Correct answers reset the counter and advance normally, including after one previous wrong attempt.
- Open questions are unaffected because retry logic only runs when `!currentExchange.isOpenQuestion && !selectedChoice.isCorrect`.
- Ran `npx.cmd tsc --noEmit` from `client/`; TypeScript completed with zero errors.

---

### [Codex] Phase 32 - 2026-06-16 - Staged Block Dialogue Retry Timing

**Scope:** Stagger the closed-question retry sequence so repeated questions do not appear at the same time as Marek's confusion message.

- Added a `retryPhase` state machine to `BlockDialoguePage.tsx`: `idle`, `waiting`, `confusion`, and `repeating`.
- First wrong answer on a closed question now keeps the wrong feedback flow, waits 600ms, shows Marek's confusion bubble, then waits another 800ms before re-showing the same question and choices.
- The confusion bubble remains visible while the repeated question appears, matching the chat-style pacing used elsewhere in the app.
- Added timeout cleanup so retry timers are cleared on navigation reset and unmount.
- Open questions and correct-answer advance behavior are unchanged.
- Ran `npx.cmd tsc --noEmit` from `client/`; TypeScript completed with zero errors.

---

### [Claude Code review of Codex Phase 30, 31, 32]

**Verdict:** Matches the claims across all three phases. Verified independently against the actual files, not just the journal descriptions.

- Re-ran `npx tsc --noEmit` from `client/` myself — clean, zero errors.
- **Phase 30:** Confirmed `isOpenQuestion: boolean` added to `BlockDialogueExchange` in `types/blockDialogue.ts`. Read `block2-dialogue.json` directly — `ex1` and `ex8` have `isOpenQuestion: false` with exactly 1 `isCorrect: true` choice each; `ex2`–`ex7` have `isOpenQuestion: true` with all 4 choices `isCorrect: true`. Matches the claim exactly. Confirmed `block-dialogues/index.ts` imports and wires in `block2Dialogue` alongside `block1DialogueData`.
- **Phase 31 & 32:** Read the full `BlockDialoguePage.tsx`. Traced the retry logic by hand: `handleContinue` only re-triggers the retry path when `!currentExchange.isOpenQuestion && !selectedChoice.isCorrect`, increments `wrongAttemptsRef` capped so a second wrong answer always falls through to `advanceToNextExchange()` — no infinite loop possible. `willRetryClosedQuestion` (button label "Try Again" vs "Continue") checks the counter *before* increment, so the label correctly previews what `handleContinue` will do on click. `retryPhase` state machine (`idle → waiting → confusion → repeating`) is timed via two `setTimeout`s (600ms, then +800ms) and cleaned up both on `location.key` change and on unmount — no leaked timers. `showConfusionBubble` / `showCurrentExchange` / `showChoices` gating confirmed consistent with the claimed staged reveal.
- Confirmed `animate-msg-in` (used on the new confusion bubble) is an existing CSS class already defined in `index.css` and used elsewhere in the app — not a dangling class reference.
- **Minor consistency note (not a bug):** `block1-dialogue.json` exchanges have no `isOpenQuestion` field at all, relying on `undefined` being falsy so they're treated as closed questions — which is correct behavior since all of Block 1's exchanges are single-correct-answer by design, but it's implicit rather than explicit, and only passes typecheck because `data/block-dialogues/index.ts` casts via `as unknown as BlockDialogue`. Worth adding `isOpenQuestion: false` explicitly to Block 1's exchanges for consistency with Block 2, next time that file is touched — not blocking.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 33 — 2026-06-16 — Tidy: Explicit isOpenQuestion on Block 1

**Scope:** Address the consistency note from the Phase 30–32 review above.

- Added `"isOpenQuestion": false` explicitly to all 6 exchanges in `block1-dialogue.json` — matches the pattern already used in `block2-dialogue.json`, removes the implicit reliance on `undefined` being falsy.
- No behavior change — Block 1 exchanges were already treated as closed questions at runtime; this just makes it explicit in the data instead of implicit via the type cast.
- Ran `npx tsc --noEmit` from `client/`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Codex] Phase 34 - 2026-06-16 - Stage 1 Cardinal Numbers Lesson Replacement

**Scope:** Replace the local Stage 1 Cardinal & Ordinal Numbers lesson JSON with the user-provided file.

- Replaced `client/src/data/lessons/s1-cardinal-numbers.json` with `C:\Users\Ty\Downloads\s1-cardinal-numbers.json`.
- Confirmed the copied file matches the source byte-for-byte by SHA-256 hash.
- Confirmed `id: "s1-cardinal-numbers"`, `stageId: "survival"`, `coming_soon: false`, and 10 exercises.
- Ran `npx.cmd tsc --noEmit` from `client/`; TypeScript completed with zero errors.

---

### [Codex] Phase 35 - 2026-06-16 - Situational Choice Ordinal Display Guard

**Scope:** Prevent English ordinal choices from being corrupted by Slovak number display conversion.

- Updated `SituationalChoiceExercise.tsx` so `displayChoice` skips `slovakifyNumbers` for English ordinal choices matching `/\b\d+(st|nd|rd|th)\b/i`.
- Left global `slovakifyNumbers` unchanged because other components depend on its current behavior for Slovak-facing text.
- Verified the `tretie poschodie` scenario displays `1st floor`, `2nd floor`, `3rd floor`, and `5th floor` unchanged.
- Verified numeric euro choices such as `100 eur` still display as Slovak words where applicable.
- Verified the stamps scenario remains unchanged with Slovak word choices.
- Ran `npx.cmd tsc --noEmit` from `client/`; TypeScript completed with zero errors.

---

### [Claude Code review of Codex Phase 34 & 35]

**Verdict:** Matches both claims. Verified independently, including reproducing the actual bug Codex fixed.

- **Phase 34:** Read `s1-cardinal-numbers.json` directly — `id: "s1-cardinal-numbers"`, `stageId: "survival"`, `coming_soon: false`, exactly 10 exercises. Matches the claim exactly. Re-ran `tsc --noEmit` myself — clean.
- **Phase 35:** Read `SituationalChoiceExercise.tsx` — confirmed the `displayChoice` guard (`/\b\d+(st|nd|rd|th)\b/i`) is exactly as described, and the global `slovakifyNumbers` in `utils/numberToSlovak.ts` was left untouched.
- **Reproduced the bug Codex fixed**, not just trusted the description: extracted the real `slovakifyNumbers` regex and ran it against the actual `s1-cardinal-numbers.json` floor scenario (`choices: ["1st floor", "2nd floor", "3rd floor", "5th floor"]`). Without the guard, the digit-boundary regex in `numberToSlovak.ts` (`(?<!\d)([1-9]\d{0,3})(?!\d)`) matches the leading digit in "1st" (not preceded/followed by another digit) and corrupts it to `"jedenst floor"`, `"dvand floor"`, `"trird floor"`, `"päťth floor"`. With Codex's guard applied, all four ordinals pass through unchanged.
- Confirmed the guard is correctly scoped: `"100 eur"` / `"10 eur"` / `"1000 eur"` (no ordinal suffix) still convert to `"sto eur"` / `"desať eur"` / `"tisíc eur"` as intended — the fix doesn't disable Slovak-number conversion globally, only for English ordinal patterns. This is consistent with the project's standing number-display rule (all Slovak-facing digits render as words; this exercise also displays genuine English text, which the rule was never meant to cover).
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 36 — 2026-06-16 — Playwright E2E Setup

**Scope:** Give Claude Code (and future sessions) the ability to drive the running app in a real browser the same way the user does locally, instead of only reading source and tracing logic by hand.

**Investigation — how the existing dev bypass works:**
- It is `const isDev = import.meta.env.DEV;`, Vite's built-in flag — automatically `true` under `vite dev` / `npm run dev`, `false` in a production build. Not a query param, not a stored flag, not a button.
- Used in `HomePage.tsx`, `PracticeDialoguePage.tsx`, `ForeignerExclusivePage.tsx` to bypass stage/block/sequential lesson unlock gating, Block Dialogue and Block Race gating, and the stage-locked banner. The only thing it never bypasses is `lesson.coming_soon`.
- Conclusion: no setup is required to get the bypass active — any Playwright session pointed at the dev server already has it.

**Installed:**
- `@playwright/test` as a dev dependency in `client/` (`npm install -D @playwright/test`)
- Chromium browser binary only (`npx playwright install chromium`) — not WebKit/Firefox, to keep the install light

**New files:**
- `client/playwright.config.ts` — `webServer` auto-launches `npm run dev` on port 5173 (reuses one already running); `use` emulates `devices['Pixel 7']`
- `client/e2e/smoke.spec.ts` — navigates to `/#/`, clicks the first lesson card, confirms arrival on `/#/lesson/s1-first-words` with real exercise content visible

**Two real obstacles found and fixed (both are *correct app behavior*, not bugs):**
1. **`DesktopBlock` gate** (`App.tsx:449`, `if (!isMobile) return <DesktopBlock />;`) — the entire app renders nothing but a "use your phone" splash (`DesktopPageRedircting.png` + a QR/url overlay) for any viewport wider than 768px or non-mobile user agent. Playwright's default desktop viewport triggered this every time. Fixed by emulating `devices['Pixel 7']` (Chromium-based — `iPhone 13` would have required installing WebKit too) instead of the default desktop context.
2. **GDPR `ConsentPopup`** — its capture-phase one-shot click listener swallows the very first click anywhere on the page and shows the consent modal instead of letting the click reach its target, exactly as documented in Phase 11. This ate the first click on the lesson card. Fixed by seeding `localStorage` via `page.addInitScript` before navigation: `consentAccepted`, `consentVersion`, **and** `lastConsentShown` — the last one matters because `ConsentPopup.shouldShow()` re-prompts guests every 24h based on it, so seeding only the first two still showed the popup.
- `.gitignore` updated with `/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`.
- Ran the smoke test 3× in a row — passes consistently. `tsc --noEmit` unaffected, clean.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 37 — 2026-06-16 — QA Pass: Stage 1 Lessons, Block Dialogues, Block Race

**Scope:** Full content/UI QA pass over 12 Stage 1 lessons (First Words through Food), Block 1 & Block 2 Dialogues, and the Block Race for Block 1. Findings logged in the new **`docs/TestingResults.md`** — a living QA log, not a one-off report; future fixes update entries there in place rather than creating new files.

**Tooling built:**
- `client/qa-walk-lessons.cjs` — jumps to every exercise in a lesson via the DEV jump bar (`LessonPage.tsx`), screenshotting + full-text-dumping each one; scans for mojibake and suspect tokens (`undefined`, `NaN`, `[object Object]`) automatically.
- `client/qa-walk-dialogues-race.cjs` — drives Block 1/2 Dialogue end-to-end (guided → unguided → completion, always correct choice) and the Block Race for Block 1 (idle → running → real-time finish) through the actual UI.
- `client/qa-make-contactsheets.cjs` / `client/qa-resize-for-review.cjs` — tiling/downscaling utilities to make screenshot review tractable; the chat image viewer rejects images taller than ~2000px and gets stricter as more images accumulate in a session, so raw Pixel-7-scale screenshots (1082×2202) needed a downscaled `-review` copy.
- Screenshots/logs are gitignored (`qa-screenshots/`, `qa-*-log.json`) — regenerate by re-running the walker scripts.

**Result: 110/110 lesson exercises and 70/70 dialogue+race captures passed the automated text-corruption scan** (zero mojibake, zero suspect tokens, zero console/page errors), and manual visual review across all 8 exercise types, both dialogues, and the race found no layout bugs. Specifically reconfirmed Codex's Phase 35 ordinal-display fix live in the browser (`s1-cardinal-numbers` ex8 — "1st/2nd/3rd/5th floor" render as plain English, not corrupted by `slovakifyNumbers`).

**One real bug found — not in content, in navigation (`TestingResults.md` Finding #1):**
`LessonPage.tsx` has no `key` tied to `:lessonId`, so navigating directly from `/lesson/A` to a different `/lesson/B` without passing through another route reuses the existing component instance instead of remounting it, throwing `Rendered fewer hooks than expected` and leaving a blank page. Found because my own first version of `qa-walk-lessons.cjs` chained `page.goto` calls between lesson URLs back-to-back and hit this exact crash for 10 of 12 lessons (looked like a script timeout at first — the dev jump bar never rendered because the page was blank). Confirmed via `pageerror` listener, reproduced minimally in isolation, then worked around it in the walker by routing through Home between every lesson (which is also what real navigation always does — `HomePage.tsx:181` is the only in-app code path to `/lesson/:id`, and Home is a different route component, so it always force-unmounts `LessonPage` first). **Not reachable via any in-app button** — only via direct URL/hash editing or a stale-tab deep link. Reported only, not fixed, per task instructions; suggested fix noted in `TestingResults.md` (a `key={lessonId}`, matching the pattern already used for `BlockDialoguePage`'s `location.key` reset in Phase 28).

**Two non-bugs also logged for the record:** a UTF-8 BOM on 7 lesson JSON files (harmless — Vite's JSON loader tolerates it; only breaks naive `JSON.parse` in ad hoc scripts) and a coverage gap where the dev-jump-bar method can't exercise the *populated* `WORD_MATCH_REVIEW` state per lesson (the empty state was verified everywhere it appeared; the populated UI was read from source and is generic/data-driven).

Left everything uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 38 — 2026-06-16 — Stage 1 Money Lesson Content Replacement

**Scope:** Replace `client/src/data/lessons/s1-money.json` with a user-provided file (`C:\Users\Ty\Downloads\s1-money.json`).

- The file as pasted into chat displayed as double-encoded mojibake (`"Stage 1 Â· Survival"`, `"ÃÄet"` for `Účet`, `"ð¶"` for the icon) — the same corruption pattern as Phase 10's `temporary-residence.json` fix. Did **not** assume the real file was corrupted just because the chat rendering of it was.
- Read the actual file's raw bytes directly (`fs.readFileSync(..., 'utf8')` on the real Downloads path) and confirmed it is correctly encoded UTF-8 — `"Stage 1 · Survival"`, icon `"💶"`, all diacritics intact. The mojibake was an artifact of the document-paste pipeline, not present in the file on disk.
- Copied the real file directly into `client/src/data/lessons/s1-money.json`; verified byte-for-byte via SHA-256 hash match between source and destination.
- Confirmed `id: "s1-money"`, `stageId: "survival"`, `coming_soon: false`, 8 exercises (`VOCABULARY_TABLE` ×2, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`).
- `s1-money` was already imported in `lessons/index.ts` and referenced in `stageBlocks.ts` (Block 3 — Numbers & Time) from the in-progress lesson restructuring; this was a content-only swap, no wiring changes needed.
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 39 — 2026-06-16 — Stage 1 Times of the Day Lesson Content Replacement

**Scope:** Replace `client/src/data/lessons/s1-times-of-day.json`, pasted directly in chat (not a file attachment, so the Phase 38 paste-corruption risk didn't apply here — confirmed diacritics were already correct in the message text).

- Previous content was a `coming_soon: true` placeholder shell with `exercises: []`.
- Replaced with the full 9-exercise lesson: `VOCABULARY_TABLE` ×3 (parts of the day, asking/telling time, the hours), `LISTEN_AND_PICK` ×2 (Slovak + English audio direction), `PICK_TRANSLATION`, `SITUATIONAL_CHOICE` (8 scenarios covering `Koľko je hodín?` vs `O koľkej?`, AM/PM via `ráno`/`večer`, `Dobrú noc!` vs `Dobrý večer`), `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`.
- Verified diacritics round-tripped correctly after writing (`Večer`, `Koľko je hodín?`, etc.) and `coming_soon` flipped to `false`.
- Already imported in `lessons/index.ts` (`s1TimesOfDay`) and referenced in `stageBlocks.ts` Block 3 — content-only swap, no wiring changes.
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 40 — 2026-06-16 — Fix: English am/pm Choices Corrupted by slovakifyNumbers

**Scope:** Same bug class as Codex's Phase 35 ordinal fix, different suffix pattern. User caught it live in the browser: the Phase 39 "shop opening hours" scenario (`s1-times-of-day.json` ex6) rendered choices `8pm` / `8am` / `10am` as `osempm` / `osemam` / `desaťam`.

- **Root cause:** `SituationalChoiceExercise.tsx`'s `displayChoice` guard only matched English ordinal suffixes (`/\b\d+(st|nd|rd|th)\b/i`, added in Phase 35). `8pm`/`8am`/`10am` don't match that pattern, so they fell through to `slovakifyNumbers`, which extracts the bare digit and converts it to a Slovak word while leaving the suffix glued on (`8` → `osem` + `pm` = `osempm`).
- **Fix:** added a second guard, `isEnglishClockTimeChoice = /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i`, alongside the existing ordinal guard in `displayChoice`. Both guards now skip `slovakifyNumbers` and return the choice unchanged.
- Verified by running the actual regex/conversion logic standalone: `8pm`/`8am`/`10am`/`5:30pm` now pass through unchanged; ordinals (`1st floor`) still work; genuine Slovak numbers (`100 eur` → `sto eur`) still convert — the fix doesn't disable real number conversion, same scoping discipline as Phase 35.
- Checked the rest of the lesson set for the same exposure: grepped all lesson JSON for `\d{1,2}(am|pm)` — `s1-emergency.json` and `s1-food.json` matched, but only in `situation`/`instruction` text (never run through `displayChoice`), not inside `choices` arrays. `s1-times-of-day.json` was the only live instance.
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 41 — 2026-06-16 — Stage 1 Days of the Week Lesson Content Replacement

**Scope:** Replace `client/src/data/lessons/s1-days-of-week.json`, pasted directly in chat.

- Previous content was a `coming_soon: true` placeholder shell with `exercises: []`.
- Replaced with the full 9-exercise lesson: `VOCABULARY_TABLE` ×3 (days Monday–Sunday, today/tomorrow/yesterday, useful phrases), `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE` (8 scenarios — `Dnes je streda`, `V piatok`, `Zajtra`/`Včera`, `Víkend` vs `Pracovný deň`, shop-hours sign reading), `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`.
- Verified diacritics (`Štvrtok`, `Nedeľa`, `Včera`) round-tripped correctly and `coming_soon` flipped to `false`.
- Proactively scanned all `SITUATIONAL_CHOICE` choices in the file for the digit-suffix bug class just fixed in Phase 40 (`/\d/` over every choice) — none contain digits, so that exposure doesn't apply to this lesson.
- Already imported in `lessons/index.ts` (`s1DaysOfWeek`) and referenced in `stageBlocks.ts` Block 3 — content-only swap, no wiring changes.
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 42 — 2026-06-16 — Stage 1 Weeks of the Month Lesson Content Replacement

**Scope:** Replace `client/src/data/lessons/s1-weeks-of-month.json`, pasted directly in chat.

- Previous content was a `coming_soon: true` placeholder shell with `exercises: []`.
- Replaced with the full 8-exercise lesson: `VOCABULARY_TABLE` ×2 (week/month basics, ordinal weeks within a month — "1st week"/"2nd week"/"3rd week" labels), `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE` (6 scenarios — rent/salary timing, `minulý`/`budúci`/`každý týždeň`, ordinal week-of-month phrasing), `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`.
- Verified diacritics (`Minulý týždeň`, `Tretí týždeň`) round-tripped correctly and `coming_soon` flipped to `false`.
- Checked the ex2 row labels "1st week" / "2nd week" / "3rd week" against the Phase 40 digit-suffix bug — not at risk, since `VocabularyTableExercise.tsx` renders `row.label` as plain text and only runs `slovakifyNumbers` on `row.slovak`. Also scanned all `SITUATIONAL_CHOICE` choices for digits — none found.
- Already imported in `lessons/index.ts` (`s1WeeksOfMonth`) and referenced in `stageBlocks.ts` Block 3 — content-only swap, no wiring changes.
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 43 — 2026-06-16 — Stage 1 Months of the Year Lesson Content Replacement

**Scope:** Replace `client/src/data/lessons/s1-months-of-year.json`, pasted directly in chat.

- Previous content was a `coming_soon: true` placeholder shell with `exercises: []`.
- Replaced with the full 9-exercise lesson: `VOCABULARY_TABLE` ×3 (January–June, July–December, talking about months — `tento`/`minulý`/`budúci mesiac`, `od marca`), `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE` (8 scenarios — residence permit expiry, birthdays, contract start dates via `od + month`, recurring renewals), `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`.
- Verified diacritics (`Február`, `Máj`, `Minulý mesiac`) round-tripped correctly and `coming_soon` flipped to `false`.
- Scanned all `SITUATIONAL_CHOICE` choices for the Phase 40 digit-suffix bug class — none contain digits (month names are spelled out, not numbered).
- Already imported in `lessons/index.ts` (`s1MonthsOfYear`) and referenced in `stageBlocks.ts` Block 3 — content-only swap, no wiring changes. This completes all 6 lessons in Block 3 (Numbers & Time).
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 44 — 2026-06-16 — QA Pass: Block 3 (Numbers & Time)

**Scope:** Full content/UI QA pass over all 6 Block 3 lessons (Cardinal & Ordinal Numbers, Money, Times of the Day, Days of the Week, Weeks of the Month, Months of the Year) and the Block Race for Block 3. No Block 3 dialogue exists yet (`block-dialogues/` only has Block 1 and Block 2), so this pass covers lessons + race only. Findings appended to `docs/TestingResults.md` under a new "Block 3 — Numbers & Time" section.

**Tooling changes:**
- `qa-walk-lessons.cjs` made reusable: now accepts `node qa-walk-lessons.cjs <scopeName> <lessonId>...` to scope output to its own subfolder/log instead of always overwriting the original 12-lesson results. No-args invocation still runs the original default set.
- New `qa-walk-block3-race.cjs` — same pattern as the existing dialogue/race walker but for the Block 3 race route (`/race/survival/stage1-block3`), since the existing script's race-walking function was hardcoded to Block 1.
- `qa-resize-for-review.cjs` generalized: previously only walked the hardcoded `lessons/` and `dialogues-race/` folders for downscaling; now iterates every subdirectory of `qa-screenshots/` automatically, so it picks up new scoped output without editing the script each time.

**Result: 53/53 lesson exercises and 12/12 race captures passed the automated text-corruption scan** (zero mojibake, zero suspect tokens, zero console/page errors). Full-resolution visual review confirmed:
- Phase 38's `s1-money.json` mojibake fix renders correctly live in-browser (`Účet`, `Účtenka`, `Hotovosť`).
- Phase 40's am/pm display fix renders correctly live in-browser (`s1-times-of-day` ex7 — `8pm`/`10am`/`Noon`/`8am`).
- `s1-weeks-of-month` ex2's longer "Posledný týždeň mesiaca" row wraps to 3 lines with no overflow/cutoff.
- Block Race for Block 3 idle screen correctly interpolates the block name ("Block Race — Numbers & Time"); the question pool is confirmed cumulative across Blocks 1–3 (matches `getCumulativeLessonIds()` by design, not a bug).
- No new issues found. Cardinal & Ordinal Numbers was re-verified with no regressions.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Codex] Phase 45 — 2026-06-16 — Block 3 Dialogue Added + Multi-Speaker Support

**Scope:** Add the provided Block 3 dialogue and extend Block Dialogue rendering to support multiple incoming speakers while preserving Block 1/2 fallback behavior.

- Added `client/src/data/block-dialogues/block3-dialogue.json` from the provided file and registered it in `client/src/data/block-dialogues/index.ts`.
- Added optional `speakers?: Record<string, BlockDialogueSpeaker>` support to `BlockDialogue`, keeping `contact` as the required default/fallback speaker and header contact.
- Added the Block 3 speaker map: `waitress` resolves to `W` / Waitress, `marek` resolves to `M` / Marek.
- Updated `BlockDialoguePage.tsx` so each exchange bubble resolves `dialogue.speakers?.[exchange.speaker] ?? dialogue.contact`; the header and retry confusion bubble still use `dialogue.contact`.
- Verified Block 3 ex1-ex3 resolve to waitress and ex4 resolves to Marek.
- Ran `npx.cmd tsc --noEmit`; zero TypeScript errors.
- Left uncommitted for Claude Code review.

---

### [Codex] Phase 46 — 2026-06-16 — Block Dialogue Multi-Speaker Visual Verification

**Scope:** Regression-check and complete the visible speaker rendering for multi-speaker block dialogues.

- Updated `BlockDialoguePage.tsx` so exchanges with an explicit `speakers` map entry show the speaker avatar in the bubble badge plus a small `Name (Initial)` label inside the incoming bubble.
- Preserved Block 1/2 rendering behavior: because they have no `speakers` map, they continue to fall back to `dialogue.contact` and do not show the new speaker label.
- Verified in Playwright with a temporary spec, then removed the spec:
  - Block 1 and Block 2 show no `Marek (M)` or `Waitress (W)` speaker label.
  - Block 3 ex1-ex3 show `Waitress (W)` and the waitress avatar.
  - After advancing through ex3, Block 3 ex4 shows `Marek (M)` and the Marek avatar.
  - Block 3 header still shows Marek / Your friend as the main contact.
- Ran `npx.cmd tsc --noEmit`; zero TypeScript errors.
- Left uncommitted for Claude Code review.

---

### [Codex] Phase 47 — 2026-06-16 — Block 3 Dialogue Payment/Receipt Answer Corrections

**Scope:** Apply user-requested content corrections to Block 3 dialogue exchanges 2 and 3.

- Updated `block3-dialogue.json` ex2 so the waitress asks whether the learner pays by card or cash: `Platíte kartou alebo v hotovosti?`
- Replaced the free/irrelevant answer tile with `Platím v hotovosti.` and marked both `Platím v hotovosti.` and `Platím kartou.` as correct.
- Updated ex2 prompt and feedback to match the card/cash choice.
- Updated ex3 so both `Nie, ďakujem.` and `Áno, môžem dostať účtenku?` are correct receipt answers.
- Updated ex3 prompt and feedback so the situation is neutral rather than saying the learner definitely wants a receipt.
- Parsed the JSON and verified the correct-choice sets for ex2/ex3.
- Ran `npx.cmd tsc --noEmit`; zero TypeScript errors.
- Left uncommitted for Claude Code review.

---

### [Codex] Phase 48 — 2026-06-16 — Stage 1 My Address Lesson Replacement

**Scope:** Replace the local Stage 1 My Address lesson JSON with the user-provided file.

- Replaced `client/src/data/lessons/s1-my-address.json` with `C:\Users\Ty\Downloads\s1-my-address.json`.
- Verified the copied file matches the source byte-for-byte by SHA-256 hash.
- Confirmed `id: "s1-my-address"`, `stageId: "survival"`, `coming_soon: false`, and 8 exercises.
- Exercise sequence: `VOCABULARY_TABLE` ×2, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`.
- Ran `npx.cmd tsc --noEmit`; zero TypeScript errors.
- Left uncommitted for Claude Code review.

---

### [Claude Code review of Codex Phase 45, 46, 47 & 48]

**Verdict:** All four match their claims. Verified independently — read the diff, ran the app live, didn't just trust the descriptions.

- **Phase 45/46 (multi-speaker support):** Read `types/blockDialogue.ts` — `BlockDialogueSpeaker` and optional `speakers?: Record<string, BlockDialogueSpeaker>` added exactly as described, `contact` still required. Read the full `BlockDialoguePage.tsx` — `getExchangeSpeaker()` resolves `dialogue.speakers?.[exchange.speaker] ?? dialogue.contact` with an `isExplicitSpeaker` flag, used consistently in history bubbles and the current-exchange bubble; the header and the retry confusion bubble intentionally still use `dialogue.contact` always (a reasonable simplification Codex's note already flagged, not a gap). Confirmed no leftover temp Playwright spec (`e2e/` only has my own `smoke.spec.ts`).
  - **Live-verified, not just read**: drove Block 3 through the real UI to ex4. My first verification attempt falsely reported the speaker label missing — turned out to be a bug in *my own check*, not the app: `page.locator('body').innerText()` reflects the CSS `text-transform: uppercase` on the label (`"WAITRESS (W)"` not `"Waitress (W)"`), so a case-sensitive string match against the lowercase claim failed. Re-checked via screenshot: ex1–3 correctly show a "WAITRESS (W)" label + 👩 avatar, ex4 switches mid-conversation to "MAREK (M)" + 👨 avatar, all while the header still shows Marek as the main contact throughout — exactly as claimed. Confirmed Block 1 shows no speaker label at all (plain `M` avatar, no label line), fallback fully preserved.
- **Phase 47 (payment/receipt content fix):** Read `block3-dialogue.json` directly — ex2 choices now include both `Platím v hotovosti.` and `Platím kartou.` marked `isCorrect: true`, ex3 has both `Nie, ďakujem.` and `Áno, môžem dostať účtenku?` marked correct. Confirmed the existing `isOpenQuestion: false` + multi-correct-choice combination works correctly with the retry logic in `handleContinue` (`shouldRetryClosedQuestion` only checks `!selectedChoice.isCorrect`, indifferent to how many choices are correct) — no special-casing needed, already verified live via the screenshot in the bullet above (ex2/ex3 history both show green "correct" styling for the actual choices picked).
- **Phase 48 (My Address lesson):** Verified independently — `id: "s1-my-address"`, `stageId: "survival"`, `coming_soon: false`, 8 exercises, exact type sequence matches. Checked the file for the Phase 38-style paste corruption (BOM + mojibake regex on the raw bytes) — clean, no BOM, no mojibake. No digit-suffix choices in any `SITUATIONAL_CHOICE`, so the Phase 40 bug class doesn't apply. Already wired into `lessons/index.ts` and `stageBlocks.ts` Block 4 (`Where You Are`, renamed earlier today).
- Re-ran `npx tsc --noEmit` myself across all four — clean.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 49 — 2026-06-16 — Block 4 Dialogue Added (with Encoding Reconstruction)

**Scope:** Add `client/src/data/block-dialogues/block4-dialogue.json` ("Something Happened" — a witnessed accident: calling emergency services, then explaining to Marek), registered in `block-dialogues/index.ts` the same way as Blocks 1–3.

**The encoding problem was worse than Phase 38/39's:** the pasted content showed the same double-encoded mojibake pattern (`"Stage 1 Â· Survival"`, `"TiesÅovÃ¡ linka"`), but unlike `s1-money.json` and `s1-my-address.json` there was no file on disk to read real bytes from — this arrived as inline chat text only. Ran the standard cp1252-reversal decode (map each character back to its Windows-1252 byte, redecode as UTF-8) and it left **38 unrecoverable `�` replacement characters** across the file. Diagnosis: some double-encoded character *pairs* (e.g. `ň` → UTF-8 `C5 88` → mojibake `Å` + `ˆ`) arrived in the chat with only the first half present — information was already lost before reaching me, not just shifted. Flagged this to the user and asked for a real file; user said to continue without one.

**Resolution — reconstructed from context, not guessed blindly:** every one of the 38 gaps was resolvable with high confidence because (a) every sentence ships with an English translation as ground truth, and (b) the missing letters were almost always the same predictable Slovak diacritics already well-established in this app's content (`č`/`Č`, `ď`/`Ď`, `ň`, `š`/`Š`, `á`/`Á`) plus the `—` em-dash already used in every other block dialogue's `"Phrase — explanation"` feedback pattern. Example: `"Ties�ová linka"` + translation "Emergency line" + known word *tiesňová* → `"Tiesňová linka"`. The decorative emoji (icon/avatar fields) were not recoverable this way (no translation to anchor them) and were replaced with sensible equivalents (🚨 dialogue icon, 📞 dispatcher avatar, 👨 Marek avatar — matching his avatar in Blocks 1–3 exactly).
- Added `BlockDialogueSpeaker` multi-speaker entries for `dispatcher` and `marek` (reusing Codex's Phase 45/46 mechanism) — ex1–6 are the dispatcher, ex7–10 switch to Marek.
- Verified the reconstructed file: 0 remaining `�`, JSON valid, `isOpenQuestion`/correct-choice-count pattern consistent with Blocks 1–3 (ex2 is the only open question, 4/4 correct; all others closed, 1/4 correct).
- **Live-verified, not just statically checked**: drove the full guided pass through the real UI end-to-end (all 10 exchanges, picking the correct choice each time) — zero page errors, every reconstructed line of Slovak rendered correctly on screen, the dispatcher→Marek speaker-label switch at ex7 displays correctly mid-conversation, reached the guided completion screen cleanly.
- Ran `npx tsc --noEmit`; zero errors.
- Left uncommitted per user instruction ("we hold everything till I say commit").

### [Claude Code] Phase 50 — 2026-06-16 — Hide Settling/Advanced in Production, Keep in Dev

**Scope:** Stage 1 (Survival) is production-ready with the new block system; Stage 2 (Settling) and Stage 3 (Advanced) belong to the old system and must stay fully functional in dev (for reference/rework) but be completely invisible to production users, with a "more coming soon" teaser instead of a dead end.

**Step 1 — investigation (reported to user before any changes):**
- `HomePage.tsx` is the primary surface: stage banners (always render, kept as teaser per the task), lesson nodes + stage-level race button for non-`survival` groups (the `else` branch of the `group.stageId === 'survival' ? ... : ...` ternary), and an XP-cost "🔐 Unlock for N XP" banner with a real working button.
- **Found two things not in the original task description, surfaced to the user before touching them:** `ProfilePage.tsx` has its own `STAGE_NAMES`/`ALL_STAGE_IDS` driving a "Stage progress" card that lists `Stage 2 — Settling In 🔒 Locked` / `Stage 3 — Advanced 🔒 Locked` for everyone, and a "Stages unlocked: 1/3" stat — both leak the existence of hidden stages. User's response ("hide the banners then if leave them visible create an issue") confirmed gating the XP-unlock banner; gated `ProfilePage.tsx` on my own judgment since leaving it contradicted the stated goal, flagged clearly rather than silently expanding scope.
- `SnailRacePage.tsx` auto-fires `store.unlockStage('settling')` on Block 6 Turbo Snail — confirmed the gate **cannot** key off `unlockedStages`, since that will legitimately become true for any production user who finishes Stage 1. Gating had to be an unconditional `isDev` check on the stage group, independent of unlock state.
- `useProgressStore.ts` (cost map, `isPrevStageComplete`, `sanitizeUnlockedStages`) and `PracticeDialoguePage.tsx`'s `TIER_LABELS` were investigated and ruled out — both are generic/unrelated to lesson-stage gating, no changes needed (confirmed the "don't touch data/logic" requirement was already naturally satisfiable).

**Step 2 — implementation:**
- Added `PRODUCTION_VISIBLE_STAGES = ['survival']` to `config/stageBlocks.ts` — a single shared allowlist instead of duplicating the gate logic/list in two files. Extending production to a rebuilt Stage 2 later is a one-line change.
- `HomePage.tsx`: added `isStageHiddenInProd = !isDev && !PRODUCTION_VISIBLE_STAGES.includes(group.stageId)`. The stage-group ternary gained a third branch — when hidden, renders a `🚧 More coming soon!` card instead of lesson nodes/race button. The XP-unlock banner condition gained `&& PRODUCTION_VISIBLE_STAGES.includes(nextStageId)` so it can never fire for a stage that isn't production-ready, in either mode.
- `ProfilePage.tsx`: `ALL_STAGE_IDS` now filters through the same `PRODUCTION_VISIBLE_STAGES` allowlist when `!isDev`.
- No files, imports, or lesson data removed — purely a rendering-layer gate, exactly as instructed.

**Step 3 — resolved as a natural consequence of Step 2, not a special case:** Since `isStageHiddenInProd` depends only on `isDev` + `stageId` (not completion status), the Stage 2/3 teaser banners + "coming soon" cards are visible to production users from the very start of the app, not just at the moment Stage 1 is finished. This means there's no special "what happens right when you finish Block 6" interstitial to build — continuity is already there before and after completion, which avoids the "abrupt cutoff" feeling more robustly than a one-time message would.

**Caught and fixed a real, pre-existing build-breaking bug along the way:** `npx tsc --noEmit` (what I used to validate Codex's Phase 45/46 multi-speaker work) passed clean, but the actual production build command `npm run build` (which runs `tsc -b`, the stricter project-references mode Vercel actually uses — already documented in this journal's Deployment Pipeline section) failed with two errors in `BlockDialoguePage.tsx`:
1. `handleComplete()` accessed `dialogue.xpReward` without a null-check, even though it's declared before the component's `if (!dialogue) return` guard — `tsc -b` doesn't carry the later narrowing back into an earlier-declared closure. Fixed: `if (!blockId || !dialogue) return;`.
2. `currentSpeaker = currentExchange ? getExchangeSpeaker(currentExchange) : dialogue.contact;` — the ternary's two branches had different types (`ResolvedExchangeSpeaker` vs plain `BlockDialogueContact`), so the union lost `isExplicitSpeaker` on one side. Fixed: `{ ...dialogue.contact, isExplicitSpeaker: false }`.
- This corrects my own Phase 45/46 review — I verified Codex's work with the wrong command. Lesson applied immediately: validated this entire task with `npm run build` via an actual `vite preview` production server, not just `tsc --noEmit`.

**Verification — live-tested both modes, not just statically checked:**
- Built the real production bundle and served it with `vite preview` (the only way to get `import.meta.env.DEV === false` outside of an actual deploy). Confirmed: Settling/Advanced banner text visible, "More coming soon!" visible, "Unlock for" XP banner absent, no Settling/Advanced lesson titles present anywhere, dev jump bar absent, Profile page loads without crashing.
- Re-checked dev mode against the live dev server (unchanged): Settling/Advanced banners, lesson titles (unambiguous ones — `"Talking About Myself"`, `"At the Foreign Police"` — to rule out Stage-1-name collisions), and full content all still present exactly as before.
- Ran `npx tsc --noEmit` **and** `npx tsc -b` clean at the end.
- Left uncommitted per user instruction ("we hold everything till I say commit").

---

### [Claude Code] Phase 51 — 2026-06-16 — block4-dialogue.json: Diff Verification Against a Second "Original," Closed

**Scope:** User supplied a second copy of `block4-dialogue.json`, labeled `block4-dialogue-ORIGINAL.json` and described as "ground truth — regenerated directly from source content, not downloaded and re-uploaded through the pipeline that's been causing corruption." Asked for a line-by-line diff against the file on disk, and to overwrite if they matched.

- Did not take the "ground truth" label at face value — the pasted content itself showed the identical mojibake markers (`Â·`, `Å`, `Ã¡`, `â`, `ð`) as the corrupted paste reconstructed in Phase 49.
- Ran a real `diff -u` between the two files: **67 changed lines**, every single one being the Phase 49 reconstruction (correct diacritics, em-dashes, emoji) on disk vs. the newly-pasted copy (mojibake) — not the other way around.
- Reported this clearly instead of complying with the overwrite instruction by default: explained the diff showed the "original" was itself corrupted by the same chat paste pipeline, and declined to overwrite the verified-correct file on disk.
- **User confirmed:** the "original" was corrupted by the same chat upload/download pipeline — now confirmed as the actual recurring source of this corruption (not the underlying source files, not the reconstruction). `block4-dialogue.json` stays exactly as reconstructed in Phase 49. No file changes made this phase.
- Takeaway for future sessions: when content arrives via a chat paste/attachment (vs. a real file path read from disk), treat any claim of "this is clean" as unverified until the actual character content is inspected — labels on a paste don't override what the bytes show.

---

### [Codex] Phase 52 — 2026-06-17 — Block 5 Dialogue Registration + Speaker Verification

**Scope:** Register the existing Block 5 dialogue and verify its multi-speaker rendering.

- Registered `client/src/data/block-dialogues/block5-dialogue.json` in `client/src/data/block-dialogues/index.ts`, following the same import/array pattern as Blocks 1-4.
- Verified the Block 5 data has 10 exchanges: ex1-ex5 use `doctor`, ex6-ex10 use `pharmacist`.
- Verified the `speakers` map contains `doctor` (`Doctor`, `Dr`) and `pharmacist` (`Pharmacist`, `P`), so it uses the existing multi-speaker rendering path.
- Ran a temporary Playwright check through `/block-dialogue/stage1-block5`: confirmed the initial incoming bubble shows `Doctor (Dr)`, advanced through the doctor exchanges, then confirmed the next incoming bubble shows `Pharmacist (P)`.
- Removed the temporary Playwright spec after verification.
- Ran `npx.cmd tsc --noEmit`; zero TypeScript errors.
- Left uncommitted for Claude Code review.

### [Claude Code review of Codex Phase 52]

**Date:** 2026-06-17
**Verdict:** ✅ Clean — approved as-is, no corrections needed.

**What was checked:**

1. **`index.ts` diff** — confirmed `block5Dialogue` is imported and added to `blockDialogues[]` array at position 5, exactly following the established pattern for blocks 1–4.

2. **`block5-dialogue.json` structure** — read and verified in full:
   - `blockId: "stage1-block5"` matches the `stageBlocks.ts` entry.
   - `speakers` map contains `doctor` (`Dr`, 👩‍⚕️) and `pharmacist` (`P`, 👨‍⚕️) — both fields complete and valid.
   - 10 exchanges total: ex1–ex5 all `"speaker": "doctor"`, ex6–ex10 all `"speaker": "pharmacist"`. Codex's claim is accurate.
   - `isOpenQuestion: true` on ex1 only (open symptom pick — any of 4 is correct). All others `false` with exactly one `"isCorrect": true` choice.
   - Slovak diacritics spot-checked throughout: Čo, Rozumiem, ďakujem, Dovidenia, uzdravte, vedľa, predpis, Áno, Ďakujem, Výborne, náplasť — all correct.

3. **`npm run build` (tsc -b)** — PASS. Zero TypeScript errors. Note: Codex ran `npx.cmd tsc --noEmit`; I re-verified with the stricter `npm run build` which is the production command. Both pass, consistent with prior phases.

**Minor content note (non-blocking):** ex7 prompt says "You want to confirm" but the correct answer is *asking* for instructions ("Ako to mám užívať?" = "How should I take it?"). The pharmacist asked if you *know* the instructions, so the player is actually saying they want them repeated — calling this "confirm" is slightly ambiguous. The Slovak answer is correct and pedagogically sound; only the English prompt phrasing is mildly fuzzy. Not worth a fix now.

**Overall:** Codex's registration work is clean. The dialogue content is solid Slovak with a natural two-scene flow (doctor → pharmacist). Multi-speaker wiring is correct.

---

### [Claude Code] Phase 53 — 2026-06-17 — QA Pass: Block 4 & Block 5 Dialogues

**Scope:** Full end-to-end user test of Block 4 (Emergency Call — Dispatcher + Marek) and Block 5 (Doctor → Pharmacist) before the pending commit, to confirm both dialogues are production-ready.

**Method:** Playwright (`devices['Pixel 7']`) against `localhost:5173` (dev mode). Custom QA walker: `client/qa-walk-block4-block5.cjs`. Progress store seeded with all lessons marked complete to unlock both dialogue buttons. Each dialogue walked in full: guided pass → completion/transition screen → unguided pass → XP screen. 84 total captures.

**Results:**
- Zero encoding corruption across all 84 body-text dumps (programmatic CORRUPT_RE scan).
- **Block 4 multi-speaker:** DISPATCHER (D) labels on ex1–6, MAREK (M) labels from ex7 onward — confirmed by automated label collector and verified via full-resolution screenshot at ex7. History bubble stack, speaker label rendering, and avatar display all correct.
- **Block 5 multi-speaker:** DOCTOR (DR) on ex1–5, PHARMACIST (P) from ex6 — same verification. Scene transition at ex6 correctly reflects the setting change from doctor's office to pharmacy, both speaker labels visually distinct.
- Slovak diacritics spot-checked in both blocks at the transition exchanges: `Počul som sirény`, `peňaženku`, `Záchranná`, `lekárne`, `Vedľa banky`, `Dovidenia`, `predpis`, `náplasť` — all intact in live browser renders.
- Both guided and unguided completion flows navigate correctly back to Home.
- `npm run build` (tsc -b) passed clean before the QA run (verified in Codex Phase 52 review).

**Verdict:** Block 4 and Block 5 dialogues are production-ready. All changes from this session are uncommitted and ready for the user to trigger a commit.

---

### [Claude Code] Phase 54 — 2026-06-17 — Remove Stage 2/3 from Production, Add End-of-Feed Message

**Scope:** Steps 1 & 2 of a 3-part production UX cleanup. Step 3 is investigate-only (see report below).

**Files changed:** `client/src/pages/HomePage.tsx` only.

#### Step 1 — Stage 2/3 banners fully removed from production

Added `if (isStageHiddenInProd) return null;` at the top of the `groups.map()` callback, immediately after computing `isStageHiddenInProd`. This early return eliminates the stage banner, all stage content, and all connectors for that group. Previously only the content was gated; the stage banner (`🏆 Stage 2 · Settling In`) and the old "More coming soon" teaser block still rendered. Both are now gone in production.

Existing guards already ensured no stage-gate XP-unlock button renders for hidden stages (Phase 50). The dashed connector after Stage 1 was already suppressed by `(isDev || !nextStageLocked)` being false. No connector or spacing artefacts remain.

In dev mode: no change — Stage 2/3 still fully visible.

#### Step 2 — End-of-feed overscroll message

Added a sentinel div at the bottom of the skill-path column (production only). An IntersectionObserver (500ms mount delay to avoid false-trigger on initial layout) watches it; when it enters the viewport (user scrolls to the bottom), `hasReachedEnd` is set to true and the message fades in (`opacity-0 → opacity-100`, `translate-y-1 → translate-y-0`, 500ms CSS transition).

Two message variants driven by `allAvailableLessonsComplete`:
- **Not complete**: `"Complete the already loaded lessons on your feed first"` — fires when any non-`coming_soon` Stage 1 lesson is still undone, or Block 6 race not yet passed.
- **All complete**: `"New lessons on the way soon"` — fires when every non-`coming_soon` survival lesson is in `completedLessons` AND `passedBlocks.includes('stage1-block6')`.

Visual treatment: `text-xs text-gray-400 font-medium tracking-wide` — same quiet tone as a native "you're all caught up" message. No banner, no icon, not visible until the user deliberately scrolls past the last item.

**Verification:**
- `npm run build` (tsc -b): zero TypeScript errors.
- Playwright production-preview check:
  - `Stage2Banner: false` ✓
  - `Stage3Banner/Advanced: false` ✓
  - `"More coming soon": false` ✓
  - `Stage1: true` ✓
  - `SentinelInDOM: true` ✓
  - `SentinelParentOpacity: 0` (hidden on initial load, before scroll) ✓
- Screenshot confirms feed shows only "Stage 1 · Survival" banner, Core Communication block, First Words lesson available, subsequent lessons locked — no Stage 2/3 content anywhere.

#### Step 3 — Stage 1 Completion Moment: Investigation Report (no code changes)

**Current behaviour** (when Block 6 race is passed as the last block — `isLastBlock(blockId!) && isTurboSnail`):
- User lands on the standard Turbo Snail finished screen, same layout as every other block race.
- A small green banner appears: `"🎉 Stage 1 complete! Stage 2 is now unlocked."` — now **misleading** since Stage 2 is hidden in production.
- `store.unlockStage('settling')` is still called in the store (line 161, `SnailRacePage.tsx`) even in production — Stage 2 silently unlocks in Zustand state but is invisible. Not a bug today; worth noting for when Stage 2 goes live.
- "Continue" button navigates to `/` (Home). The user lands on a feed of all-completed lessons with no forward motion visible.

**What needs strengthening:**

1. **Fix the stale message immediately**: Change `'🎉 Stage 1 complete! Stage 2 is now unlocked.'` to `'🎉 Stage 1 complete! New lessons are on the way.'` — a one-line change in `SnailRacePage.tsx` that removes the misleading Stage 2 reference.

2. **Dedicated `Stage1CompletePage`** (`/stage1-complete` route): A full-screen celebration page, not just a banner. Navigation changes: after passing Block 6 race (`blockPassed && isLastBlock(blockId!)`), navigate to `/stage1-complete` instead of leaving the user on the race finished screen.

3. **Confetti**: `canvas-confetti` is already installed (used in `XpCelebrationPage`). A celebratory burst on mount would work here.

4. **Stage 1 Journey summary**: A brief stats card — "X lessons completed · 5 conversations had · 6 Block Races passed · Y XP earned" — so the user feels the scale of what they finished.

5. **Human-language message**: Short, warm, focused on what they can now DO in Slovak rather than abstract "you completed Stage 1." Something like: *"You can now survive daily life in Slovakia — in Slovak. That's real progress."*

6. **CTA**: Since no next stage is visible, the CTA should point to the Review feature (keep skills sharp) rather than going back to the completed feed with no forward motion.

**Recommended implementation order:** Fix the stale message (item 1) first — it's one line and it's currently incorrect. Stage1CompletePage (item 2-6) can be a separate phase.
