# Slovak for Foreigners — Project Journal

> **Audience:** Junior developers joining this project. This document is the single source of truth.
> **Rule:** Every GitHub push must add an entry to the [Build History](#14-build-history) section.

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
│   │   │   └── ui/
│   │   │       └── BottomNav.tsx            # Fixed bottom navigation bar
│   │   ├── data/
│   │   │   ├── dialogues/
│   │   │   │   ├── index.ts                 # Exports all dialogues array
│   │   │   │   ├── dialogue-coffee-tier1.json
│   │   │   │   ├── dialogue-supermarket-tier1.json
│   │   │   │   ├── dialogue-bus-tier1.json
│   │   │   │   ├── dialogue-neighbor-tier1.json
│   │   │   │   └── dialogue-emergency-tier1.json
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
│   │   │       ├── progressSync.ts          # Cloud read/write helpers
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
│   │   │   ├── useAuthStore.ts              # Auth state + Google sign-in
│   │   │   └── useProgressStore.ts          # XP, lessons, streaks, sync — version 4
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

Each lesson record has a `strength` score (0–100). On app load, `decayLessonStrengths()` reduces strength based on days elapsed since `lastDecayedAt`.

| Strikes in last attempt | Decay rate | Starting strength on next completion |
|------------------------|-----------|--------------------------------------|
| 0 | 5%/day | 100 |
| 1–2 | 8%/day | 85 |
| 3–4 | 12%/day | 65 |
| 5+ | 20%/day | 40 |

Lessons with strength < 50 appear in `getWeakLessons()` and are surfaced as review suggestions on the Home page.

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
| `soft` | After 3rd exercise in lesson 3 or 5 | Yes (4h) | "You're making great progress!" |
| `hard_stage` | After completing the last Stage 1 lesson | No | "You've completed Stage 1! 🎉" |
| `hard_unlock` | When a guest tries to unlock Stage 2/3 | No | "Ready for Stage 2?" |
| `hard_dialogue` | When a guest taps dialogue 3, 4, or 5 | No | "Sign in to continue" |
| `regression` | On app open when ≥3 lessons complete (guest) | Yes (4h) | "Welcome back, Guest Learner!" |

"Hard" modals have a dark backdrop (bg-black/90) and no "Maybe Later" button. Tapping the backdrop does nothing. The user must sign in or close the browser.

### Soft modal timing (in `LessonPage.tsx`)

- Fires at the 3rd exercise completion (not start) of lesson session
- Only when `completedLessons.length === 2` (user just finished lesson 2, on lesson 3) or `completedLessons.length === 4` (user just finished lesson 4, on lesson 5)
- Once per session via `hasShownSoftModal` ref
- Respects 4-hour localStorage dismiss key (`save-modal-dismissed-soft`)
- **Pauses the lesson**: sets `pendingAdvance.current = true` and returns early from `handleAnswer`. A `useEffect` watching `isModalOpen` resumes the lesson (advances to next exercise) when the modal closes.

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
- **Site URL:** your production Vercel URL (e.g. `https://slovak4foreigners.vercel.app`)
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
- **Zustand persist version** — the store is at version 4. Adding new persisted fields requires bumping the version and writing a migration in the `migrate` function, otherwise old localStorage data will be missing the new fields and users will get `undefined` errors.
- **No offline mode** — the app works offline for exercises already loaded, but sync requires connectivity. There's no explicit offline state or retry queue.
- **Delete account is not implemented** — the Profile page shows a "Delete Account" option that opens a modal directing users to contact `support@learnslovakforforeigners.com`. No automated deletion flow exists yet.
- **Emergency dialogue** — `dialogue-emergency-tier1` uses a different data structure (`EmergencyDialogueSession` component) than standard dialogues. The `emergencyMode` flag on the dialogue object routes it to the correct component.

### Future work ideas

- Email/magic-link auth as a fallback (for users without Google)
- Leaderboard (Snail Race scores)
- Pronunciation scoring (Web Speech Recognition API)
- Push notifications for streak reminders (Web Push)
- More dialogue tiers (Tier 2 and Tier 3 scenarios)
- Offline-first with service worker

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
