# User Testing Guide — Slovak for Foreigners

> **Audience:** Codex (and future AI collaborators). This guide teaches you to run Playwright-based user tests the same way Claude Code does. Read this before writing any QA script.
>
> **Authority:** Claude Code owns the QA methodology. If you see a discrepancy between this guide and a newer QA script, trust the script and update this guide.

---

## 1. What User Testing Is (and Is Not)

**User testing in this project means:** Drive the running app as a user would — navigate to pages, click buttons, fill in choices, watch the UI respond — and capture what you observe as evidence.

**It is NOT:**
- Running `tsc --noEmit` or `npm run build` (that's a type check / build check — always do it, but separately, before the QA run)
- Importing internal functions and calling them in isolation
- Reading source code and inferring correctness from logic alone

**The goal:** Confirm that what a real user would see and experience matches what was intended. Build passes are necessary but not sufficient. The QA run is what catches rendering bugs, navigation breaks, encoding corruption, and wrong exercise answers reaching the user.

---

## 2. Scope: What Triggers a User Test

Run user tests when any of the following change:

| Change type | What to test |
|---|---|
| New lesson JSON added or `coming_soon` flipped to `false` | Walk the lesson (all exercise types visible, no corruption, choices/answers correct) |
| New block dialogue JSON added or registered | Walk the full dialogue (all exchanges, speaker labels at transitions) |
| `stageBlocks.ts` modified (block added, renamed, reordered) | Verify homepage block structure (correct names, no old names, correct order) |
| `HomePage.tsx` modified | Check the affected section in both dev and prod |
| `SnailRacePage.tsx` modified | Navigate to the race and verify the affected state |
| End-of-feed / completion logic changed | Test both "incomplete" and "complete" variants in production |
| `coming_soon` status changes | Confirm newly live lessons appear unlocked; still-locked lessons show as locked |

---

## 3. Server Setup

The project has two server modes. Know which tests need which.

### Dev server — `http://localhost:5173`
- Run with: `cd client && npm run dev`
- Used for: lesson walking, dialogue walking, block structure in dev mode
- Shows **all** stages including Stage 2/3 (dev bypasses production guards)
- Lessons render with hot-reload — changes to JSON are picked up automatically

### Production preview — `http://localhost:4200`
- Run with: `cd client && npm run build && npm run preview -- --port 4200`
- Used for: production-specific checks (Stage 2/3 hidden, end-of-feed sentinel, completion variants)
- Serves the **built** `dist/` folder — you must rebuild before testing production behavior
- Always rebuild before running prod tests: `npm run build` produces a new `dist/`

### Checking if servers are already running
```bash
netstat -ano | findstr ":5173 \|:4200 " 2>nul | findstr LISTENING
```

If the port is occupied, the server is running. If not, start it. The QA scripts assume both are up — if a test will only hit dev, you only need dev running.

---

## 4. Playwright Setup

### Device
Always emulate `devices['Pixel 7']`. This matches what most real users have, and it bypasses the `DesktopBlock` gate that the app shows on desktop viewports.

```javascript
const { chromium, devices } = require('@playwright/test');
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
```

### Output directory
Save screenshots under `client/qa-screenshots/<phase-name>/`. These are gitignored. Create the directory at the top of the script:

```javascript
const OUT = path.join(__dirname, 'qa-screenshots', 'phase55-56');
fs.mkdirSync(OUT, { recursive: true });
```

### Screenshot helper
Keep screenshots named descriptively so a reviewer can find the right frame without running the script again:

```javascript
async function shot(page, name) {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}`);
}
```

Use `fullPage: false` (viewport only) for most screenshots — it captures what the user actually sees. Use `fullPage: true` only when you need to see content below the fold.

---

## 5. Seeding — The Most Critical Section

Every test requires a specific app state. You set this state by writing to `localStorage` **before the page loads**. Getting this wrong is the most common source of false failures.

### The Zustand store format

The app uses Zustand v4 with the `persist` middleware. The localStorage key is `'slovak-progress'`. The format is:

```javascript
{
  "state": { /* all store fields */ },
  "version": 15   // ← MUST match the store's current version
}
```

**The version number is critical.** If you write `version: 0` (or anything other than the current version), Zustand runs the `migrate()` function, which may overwrite or strip fields like `passedBlocks`. Always check the current version in `client/src/store/useProgressStore.ts`:

```bash
grep "version:" client/src/store/useProgressStore.ts | head -5
```

At the time of writing, the version is **15**. If it has changed since, use the new number.

### Seeding with `addInitScript`

Use `context.addInitScript()` to inject localStorage **before** the page JavaScript runs. This is the correct approach when you want the store fully hydrated on first load:

```javascript
async function seedConsent(context) {
  await context.addInitScript(() => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
  });
}
```

**Always seed consent.** Without it, the consent modal blocks all page interaction.

### Full progress seed (for testing unlocked content)

```javascript
const ALL_NON_COMING_SOON_LESSON_IDS = [
  // Block 1 — Core Communication
  's1-first-words', 's1-verbs', 's1-greetings', 's1-how-are-you', 's1-dont-understand',
  // Block 2 — Identity
  's1-who-i-am', 's1-describing-yourself', 's1-body-parts', 's1-colors', 's1-family',
  // Block 3 — Numbers & Time
  's1-cardinal-numbers', 's1-money', 's1-times-of-day', 's1-days-of-week',
  's1-weeks-of-month', 's1-months-of-year',
  // Block 4 — Where You Are
  's1-my-address', 's1-directions', 's1-positions', 's1-emergency',
  // Block 5 — Emergency
  's1-hospital', 's1-pharmacy',
  // Block 6 — Food & Getting Around (all live)
  's1-food', 's1-ordering-food', 's1-transport', 's1-tram-bus', 's1-taxi',
  // Block 7 — At Home (only s1-flat-items is live; rest are coming_soon)
  's1-flat-items',
  // ADD new non-coming_soon lesson IDs here as they are released
];

async function seedFullProgress(context) {
  await context.addInitScript((lessonIds) => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
    const store = {
      state: {
        completedLessons: lessonIds,
        passedBlocks: [
          'stage1-block1', 'stage1-block2', 'stage1-block3',
          'stage1-block4', 'stage1-block5', 'stage1-block6', 'stage1-block7',
          // ADD new block IDs here as they are added to stageBlocks.ts
        ],
        completedBlockDialogues: [
          'stage1-block1', 'stage1-block2', 'stage1-block3',
          'stage1-block4', 'stage1-block5', 'stage1-block6',
          // ADD new dialogue IDs here as block dialogues are added
        ],
        lessonProgress: {},
        xp: 2000,
        level: 7,
        unlockedStages: ['survival', 'settling'],
        reviewQueue: [],
        lastActivity: Date.now(),
      },
      version: 15,  // ← Keep this in sync with useProgressStore.ts
    };
    localStorage.setItem('slovak-progress', JSON.stringify(store));
  }, lessonIds);
}
```

**Call `seedFullProgress(ctx)` before `ctx.newPage()`**, so the script runs before the page initializes:

```javascript
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
await seedFullProgress(ctx);      // ← before newPage
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
```

### Alternative: seed via `page.evaluate()` + reload

For tests where you need to modify an already-loaded store (e.g. simulating progress being saved mid-session), use `page.evaluate()` after the page loads, then reload:

```javascript
await page.evaluate((lessonIds) => {
  const raw = localStorage.getItem('slovak-progress');
  const stored = raw ? JSON.parse(raw) : null;
  if (!stored?.state) return;
  stored.state.completedLessons = lessonIds;
  stored.state.passedBlocks = ['stage1-block1', /* ... */];
  localStorage.setItem('slovak-progress', JSON.stringify(stored));
}, lessonIds);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
```

This approach **preserves the existing version number** (read from the live store), so it is safe from the version mismatch issue. Use it when you want the app to load first with default state and then update it.

### Seeding partial progress (for "incomplete" variant tests)

For tests that need a fresh/empty user state (e.g. testing that the "incomplete" end-of-feed message shows):

```javascript
async function seedConsentOnly(context) {
  await context.addInitScript(() => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
    // Do NOT set 'slovak-progress' — let the store initialize fresh
  });
}
```

A missing `'slovak-progress'` key causes Zustand to use all defaults (empty `completedLessons`, empty `passedBlocks`), which is a fresh-user state.

---

## 6. Corruption Detection

Every time you read page body text, check it for encoding corruption. Use this regex:

```javascript
const CORRUPT_RE = /[À-ÿ]{3,}|â€™|â€œ|Ã|Â[^\s]/;
```

This catches:
- Multi-byte UTF-8 decoded as Latin-1 (e.g. `Ã¡` for `á`)
- Smart-quote mojibake (`â€™` for `'`, `â€œ` for `"`)
- Stray `Ã` or `Â` from broken encoding chains

Usage in a loop:
```javascript
const body = await page.locator('body').innerText().catch(() => '');
if (CORRUPT_RE.test(body)) {
  const sample = body.match(CORRUPT_RE)?.[0];
  console.log(`  ❌ Corruption detected: "${sample}"`);
}
```

**Zero tolerance.** Any corruption is an immediate ❌ fail for that test. Slovak diacritics that should be present include: `á, é, í, ó, ú, ý, ä, ô, ú, č, š, ž, ř, ď, ť, ň, ľ, ĺ, ŕ`. If these appear garbled, it's corruption.

---

## 7. Walking a Lesson

Lessons navigate to `/#/lesson/:lessonId`. When a lesson is already in `completedLessons`, the app redirects immediately back to home — you can't re-walk it from the lesson URL in that state.

### Two strategies

**Strategy A — Walk from scratch (lesson NOT in completedLessons)**

Seed partial progress: all prerequisite blocks passed (so the lesson is unlocked) but do NOT include the target lesson in `completedLessons`. The lesson page will load in its full interactive state.

```javascript
// Seed: all blocks passed but this lesson excluded from completedLessons
const lessonIdsExceptTarget = ALL_NON_COMING_SOON_LESSON_IDS.filter(id => id !== 's1-ordering-food');
// Pass these to seedFullProgress as lessonIds
```

**Strategy B — Content check only (no interactive walk)**

When you only need to verify that the JSON is correct (choices match answers, diacritics are clean), do a static content review in Node without Playwright:

```javascript
const lesson = require('./src/data/lessons/s1-ordering-food.json');
// Check every SITUATIONAL_CHOICE answer exists in choices
lesson.exercises.filter(e => e.type === 'SITUATIONAL_CHOICE').forEach(ex => {
  ex.scenarios.forEach(s => {
    const valid = s.choices.includes(s.answer);
    console.log(`${valid ? '✅' : '❌'} "${s.answer}" in choices`);
  });
});
// Check every FILL_IN_BLANK_PICK answer exists in choices
lesson.exercises.filter(e => e.type === 'FILL_IN_BLANK_PICK').forEach(ex => {
  ex.items.forEach(item => {
    const valid = item.choices.includes(item.answer);
    console.log(`${valid ? '✅' : '❌'} "${item.answer}" in choices`);
  });
});
```

This is fast and catches the most common content errors (wrong answer key, typo in answer vs choice).

### Exercise type navigation patterns

Each exercise type requires different interaction. Use Playwright's locator chaining to target elements:

| Exercise type | How to advance |
|---|---|
| `VOCABULARY_TABLE` | Click "I understand" / "Got it" / "Continue" button |
| `LISTEN_AND_PICK` | Click an audio/choice button, then Confirm |
| `PICK_TRANSLATION` | Click a translation button, then Confirm |
| `SITUATIONAL_CHOICE` | Click a scenario answer button, then Continue |
| `FILL_IN_BLANK_PICK` | Click a word/phrase button to fill the blank, then Confirm |
| `WORD_MATCH_REVIEW` | Match all pairs, then Continue (or it auto-advances) |

General "advance" pattern (robust fallback):

```javascript
async function tryAdvance(page) {
  // 1. Check for explicit Continue/Next/Got it buttons first
  const continueBtn = page.locator('button').filter({
    hasText: /^Continue$|^Next$|^Got it$|^I understand$/i
  });
  if (await continueBtn.count() > 0) {
    await continueBtn.first().click();
    return true;
  }

  // 2. Try clicking a choice (for exercises that require selection)
  const choices = page.locator('button[data-choice], [role="button"]').filter({ hasText: /\w/ });
  if (await choices.count() > 0) {
    await choices.first().click();
    await page.waitForTimeout(200);
    // After selection, look for Confirm button
    const confirm = page.locator('button').filter({
      hasText: /Confirm|Check|Submit/i
    });
    if (await confirm.count() > 0) {
      await confirm.first().click();
      await page.waitForTimeout(300);
    }
    // After confirm, look for Continue
    const next = page.locator('button').filter({ hasText: /Continue|Next|Got it/i });
    if (await next.count() > 0) await next.first().click();
    return true;
  }
  return false;
}
```

**Important:** Always `await page.waitForTimeout(300-500)` between actions. The app has animations and state updates that need time to settle. Without waits, locators find elements before they're interactive.

---

## 8. Walking a Block Dialogue

Dialogues navigate to `/#/block-dialogue/:blockId`.

### Guided vs unguided mode

The dialogue page checks `location.state.guided` to determine mode. When navigating directly via URL (not from the home page button), `location.state` is null, so `isGuided` defaults to `false` — the user gets **unguided mode** (must pick the correct answer, not just any answer).

To test in guided mode, navigate programmatically with state:

```javascript
// This runs in page context to navigate with state
await page.evaluate(() => {
  window.location.hash = '/block-dialogue/stage1-block6';
  // OR use React Router's navigate — harder from Playwright
});
// Simpler: just use unguided mode (direct URL navigation) for most tests
```

For QA purposes, **unguided mode is more valuable to test** — it's the harder path and confirms the correct answers actually work.

### Walking all exchanges

```javascript
for (let ex = 0; ex < 15; ex++) {  // 15 = safe upper bound
  await page.waitForTimeout(400);
  
  // Check if we've left the dialogue page
  if (!page.url().includes('block-dialogue')) break;
  
  const body = await page.locator('body').innerText().catch(() => '');
  if (CORRUPT_RE.test(body)) { /* log corruption */ }
  
  // Try to click the correct answer
  // Strategy: look for the known correct text from the JSON
  const correctBtn = page.locator('button').filter({
    hasText: /known correct text pattern/i
  }).first();
  
  if (await correctBtn.count() > 0) {
    await correctBtn.click();
  } else {
    // Fallback: click first substantive button
    await page.locator('button').filter({ hasText: /\w{4,}/ }).first().click();
  }
  
  await page.waitForTimeout(400);
  
  // After clicking, wait for feedback overlay, then Continue
  const nextBtn = page.locator('button').filter({ hasText: /Continue|Next|Ďalej/i }).first();
  if (await nextBtn.count() > 0) await nextBtn.click();
  
  exchangeCount++;
}
```

### Checking speaker labels

Speaker labels appear as small text above or near each exchange bubble. Collect them during the walk:

```javascript
const speakerLabel = await page.locator('[class*="speaker"], [class*="label"]')
  .filter({ hasText: /SpeakerName|Initials/ })
  .first()
  .innerText()
  .catch(() => null);
if (speakerLabel) speakersSeen.add(speakerLabel.trim());
```

**What to verify:**
- At least as many distinct speaker labels as there are distinct speakers in the dialogue JSON
- Speaker transitions happen at the correct exchange numbers (check the JSON: `exchanges[N].speaker`)
- No speaker key resolves to `undefined` or shows raw key names like "marek" instead of "Marek"

### Screenshot at speaker transitions

Take a screenshot at the exchange immediately after a speaker change so a reviewer can see the label visually:

```javascript
// If exchange 5 is where the waitress takes over, screenshot at ex5
if (ex === 4) await shot(page, 'dialogue-ex5-waitress-transition');
```

---

## 9. Checking Block Structure on the Homepage

When `stageBlocks.ts` changes (block added, renamed, or removed), verify the homepage reflects the change in both dev and prod.

```javascript
const body = await page.locator('body').innerText();

// Check new name is present
const hasNewName = /Food & Getting Around/.test(body);  // adapt to actual block name
// Check old name is gone
const hasOldName = /Daily Life/.test(body);
// Check new block appears
const hasBlock7 = /At Home/.test(body);

findings.push({
  test: 'block-structure',
  pass: hasNewName && hasBlock7 && !hasOldName,
});
```

**Always check both dev and prod.** Dev shows all blocks (including Stage 2/3); prod only shows `PRODUCTION_VISIBLE_STAGES`. A structural test that passes in dev can still fail in prod if the build isn't fresh.

---

## 10. Testing Production-Specific Behavior

Some features only activate in production (`!isDev`). Test these against the production preview server (`localhost:4200`), not the dev server.

**Rebuild before every production test run:**
```bash
cd client && npm run build
```

The production preview server serves the `dist/` folder. It does not hot-reload — if you change source files, you must rebuild.

### End-of-feed sentinel (IntersectionObserver)

The sentinel div only renders in production. The test flow:

```javascript
// 1. Navigate to production
await page.goto('http://localhost:4200/#/', { waitUntil: 'networkidle' });
// 2. Wait past the 500ms observer mount delay
await page.waitForTimeout(800);
// 3. Check sentinel is in DOM but hidden (opacity 0)
const sentinel = page.locator('p').filter({ hasText: /Complete the already loaded|New lessons on the way/ });
const opacity = await sentinel.first().evaluate(
  el => window.getComputedStyle(el.parentElement).opacity
).catch(() => 'err');
// opacity should be '0' before scrolling
// 4. Scroll to bottom
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(1000);  // wait for IntersectionObserver + CSS transition (500ms)
// opacity should now be '1'
```

### Stage 2/3 visibility

```javascript
const body = await page.locator('body').innerText();
const stage2Visible = /Stage 2/.test(body);  // should be false in production
const stage3Visible = /Stage 3|Advanced/.test(body);  // should be false in production
```

---

## 11. The `allAvailableLessonsComplete` Condition

This is the gate for the "complete" end-of-feed message variant. As of Phase 57, it requires:

1. Not dev mode (`!isDev`)
2. Every non-`coming_soon` survival lesson is in `completedLessons`
3. The last block in `stage1Blocks` is in `passedBlocks` (currently `stage1-block7`)

**To trigger the "complete" variant in a QA test:**
- Seed `completedLessons` with ALL non-coming_soon lesson IDs (check `client/src/data/lessons/*.json` for `coming_soon: false` + `stageId: "survival"`)
- Seed `passedBlocks` to include the final block ID from `stageBlocks.ts` (`stage1Blocks[stage1Blocks.length - 1].blockId`)

**When new lessons are released** (coming_soon flipped to false), you must add them to both the QA seed AND verify the condition still works. The `ALL_NON_COMING_SOON_LESSON_IDS` array in existing QA scripts will need updating.

---

## 12. Content Correctness Checks (Static)

Before running Playwright tests, do a quick static check on any new lesson JSON. These catches are faster than walking the whole lesson interactively:

### Check 1 — SITUATIONAL_CHOICE answers exist in choices

```javascript
const lesson = require('./path/to/lesson.json');
lesson.exercises
  .filter(e => e.type === 'SITUATIONAL_CHOICE')
  .forEach(ex => ex.scenarios.forEach(s => {
    if (!s.choices.includes(s.answer)) {
      console.log(`❌ Answer "${s.answer}" not found in choices: ${JSON.stringify(s.choices)}`);
    }
  }));
```

### Check 2 — FILL_IN_BLANK_PICK answers exist in choices

```javascript
lesson.exercises
  .filter(e => e.type === 'FILL_IN_BLANK_PICK')
  .forEach(ex => ex.items.forEach(item => {
    if (!item.choices.includes(item.answer)) {
      console.log(`❌ Answer "${item.answer}" not in choices: ${JSON.stringify(item.choices)}`);
    }
  }));
```

### Check 3 — Dialogue: exactly one isCorrect per non-open-question exchange

```javascript
const dialogue = require('./path/to/dialogue.json');
dialogue.exchanges.forEach(ex => {
  if (ex.isOpenQuestion) {
    const allCorrect = ex.choices.every(c => c.isCorrect);
    if (!allCorrect) console.log(`❌ ex${ex.id}: isOpenQuestion but not all choices isCorrect`);
  } else {
    const correctCount = ex.choices.filter(c => c.isCorrect).length;
    if (correctCount !== 1) console.log(`❌ ex${ex.id}: expected 1 isCorrect, found ${correctCount}`);
  }
});
```

### Check 4 — Dialogue: all exchange speaker keys exist in speakers map

```javascript
const speakerKeys = Object.keys(dialogue.speakers || {});
dialogue.exchanges.forEach(ex => {
  if (ex.speaker && !speakerKeys.includes(ex.speaker)) {
    console.log(`❌ ex${ex.id}: speaker "${ex.speaker}" not in speakers map`);
  }
});
```

### Check 5 — Slovak grammar spot-checks

These are the most common content errors found in lesson JSON:

- **Gender agreement on possessives:** `môj` is masculine, `moja` is feminine. Check nouns paired with possessives. Common feminine nouns: `posteľ`, `stolička`, `skriňa`, `práčka`, `chladnička`, `správa`, `zastávka`, `karta`.
- **Accusative case in ordering:** `Dám si polievku` (not `polievka`) — accusative of feminine nouns drops the `-a` suffix.
- **No raw digits in Slovak sentences** (unless 5+ digits): Numbers 1-9999 appearing as digits in Slovak lesson text should be written as Slovak words via `slovakifyNumbers()`. The function handles this at render time, so digits in JSON are technically fine — but the exercise `sentence` and `translation` fields should use words for readability if they're core vocabulary.

---

## 13. Writing the QA Script

### Naming convention

Scripts: `client/qa-walk-<scope>.cjs`

Examples:
- `qa-walk-block4-block5.cjs` — specific lessons/dialogues
- `qa-walk-phase54.cjs` — tied to a phase (production features)
- `qa-walk-phase55-56.cjs` — covering multiple phases

### Script structure

```javascript
// 1. Imports and config
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'qa-screenshots', 'phase-name');
fs.mkdirSync(OUT, { recursive: true });
const DEV_URL = 'http://localhost:5173';
const PROD_URL = 'http://localhost:4200';
const CORRUPT_RE = /[À-ÿ]{3,}|â€™|â€œ|Ã|Â[^\s]/;

// 2. Helper functions (shot, seedConsent, seedFullProgress, etc.)

// 3. main() — one test per section, clearly labelled
async function main() {
  const findings = [];
  const browser = await chromium.launch();

  // ── TEST 1: [description] ─────────────────────────────────────────────────
  console.log('\n=== TEST 1: [description] ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedFullProgress(ctx);
    const page = await ctx.newPage();
    await page.goto(`${DEV_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // ... test logic ...

    findings.push({ test: 'test-name', pass: /* boolean */ });
    await ctx.close();
  }

  // ... more tests ...

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  let allPass = true;
  findings.forEach(f => {
    console.log(`  ${f.pass ? '✅' : '❌'} ${f.test}`);
    if (!f.pass) allPass = false;
  });
  console.log(allPass ? '\n✅ All checks PASS' : '\n❌ One or more checks FAILED');

  fs.writeFileSync(
    path.join(__dirname, 'qa-<scope>-log.json'),
    JSON.stringify(findings, null, 2),
  );
}

main().catch(e => { console.error(e); process.exit(1); });
```

### Always close contexts

Use `await ctx.close()` at the end of every test block. Each test should have its own context (its own browser tab with clean state). Never reuse a context between tests.

### Use blocks (`{}`) to scope tests

Using JS block scoping (`{ const ctx = ... }`) prevents variable name collisions between tests and makes it immediately clear where each test starts and ends.

---

## 14. Running the Script

```bash
cd "C:\Users\Ty\Desktop\APPS\Slovak4Foreigners\client"
node qa-walk-<scope>.cjs
```

If it takes more than ~30 seconds and needs to run while you do other things, use Claude Code's `run_in_background: true` flag. But be aware that the output file grows incrementally — check it with Read to see progress.

---

## 15. Reporting Results

After a QA run, write a journal entry in `docs/PROJECT_JOURNAL.md` under the appropriate phase header. See existing Phase 53, 54, 57 entries for the format. Key elements:

- **Scope:** What you tested and why
- **Method:** Which script, which servers, how you seeded
- **Results:** Table of test names + pass/fail
- **Notes:** Any corrections you made, any caveats about what was NOT tested

Also update `docs/TestingResults.md` with the new QA section. Each section covers one QA run, with subsections for each major thing tested. See existing entries for format.

**Do not claim PASS if you couldn't actually observe the feature.** If a lesson redirected immediately because it was already marked complete, say "redirected — content correctness verified via JSON review" rather than marking it as a walk-pass.

---

## 16. Common Failure Modes and Fixes

| Failure | Likely cause | Fix |
|---|---|---|
| Test 5 (complete variant) shows "incomplete" | Zustand store version mismatch — seeded `version: 0` instead of `15`, migration wiped `passedBlocks` | Change `version:` in seed to match `useProgressStore.ts` |
| Lesson redirects to home immediately | Lesson is in `completedLessons` in the seed | Exclude the target lesson from the seed's `completedLessons` |
| Playwright can't find buttons | The app needs more time after navigation | Increase `waitForTimeout` after `goto()` to 800-1000ms |
| Speaker labels seen is empty `[]` | Speaker label selector doesn't match current HTML | Check the actual element in a screenshot and update the selector |
| Corruption detected | JSON file has UTF-8 BOM or was saved with wrong encoding | Open the file and remove the BOM (`﻿` at start); save as UTF-8 without BOM |
| `npm run build` fails before QA | TypeScript error introduced by a code change | Fix the TypeScript error first; never run QA on a broken build |
| Stage 2/3 visible in prod test | Testing against dev URL instead of prod URL, OR old dist still served | Rebuild (`npm run build`), confirm server is on `:4200`, not `:5173` |
| `allAvailableLessonsComplete` is false even with full seed | New lesson was released (`coming_soon` flipped) after seed was written | Add the new lesson ID to `ALL_NON_COMING_SOON_LESSON_IDS` in the seed |

---

## 17. The Checklist Before Leaving Work Uncommitted

When you finish implementing something and leave it for Claude Code to review, confirm all of these:

- [ ] `npm run build` (from `client/`) passes with zero TypeScript errors
- [ ] Every new lesson JSON: `SITUATIONAL_CHOICE` answers exist in choices; `FILL_IN_BLANK_PICK` answers exist in choices
- [ ] Every new dialogue JSON: exactly one `isCorrect: true` per non-open-question exchange; all `speaker` keys exist in `speakers` map
- [ ] If `stageBlocks.ts` changed: `isLastBlock()`, `getCumulativeLessonIds()`, `getNextBlock()` all derive from the array — no hardcoded block IDs anywhere else (search for `'stage1-block6'` etc. to catch strays)
- [ ] If a new block was added: the corresponding block dialogue will eventually need to be created and registered in `client/src/data/block-dialogues/index.ts`
- [ ] Journal entry added under your `[Codex]` tag, covering what you did, what you verified, and that you left it uncommitted for Claude Code review
