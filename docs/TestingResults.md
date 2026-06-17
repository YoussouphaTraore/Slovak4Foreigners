# Testing Results — Living QA Log

> **Purpose:** Persistent record of content/UI QA findings. This is not a one-time report — when a fix is implemented for an issue logged here, come back and update that entry's **Status** (and add a **Fixed** line with the date and what changed) rather than deleting it.
>
> **Status legend:** 🔴 Open · 🟡 Investigating · 🟢 Fixed · ⚪ Won't fix / not a bug

---

## Methodology

- Driven with Playwright (`client/playwright.config.ts`, `devices['Pixel 7']`) against the local `npm run dev` server, GDPR consent pre-seeded via `localStorage`.
- **Lessons** were reviewed by jumping directly to each exercise via the **DEV jump bar** (`LessonPage.tsx`, visible only under `import.meta.env.DEV`) rather than playing through retry/mastery loops. This gives a clean initial render of every exercise's content (all choices, vocabulary rows, sentences) without the noise of randomized retry ordering. One screenshot + a full text dump was captured per exercise; text was also scanned programmatically for mojibake (`Ã.`, `â€.`, `�`) and suspicious tokens (`undefined`, `NaN`, `[object Object]`) across **all 110 exercise instances** in the 12 lessons — not a sample.
  - **Caveat:** `WORD_MATCH_REVIEW` exercises pull their pairs from words failed earlier in the *same play session* (`reviewPairs`). Jumping directly to them shows the "Nothing to Review — You Nailed Everything!" empty state, not real matched pairs, since no failures were recorded via the jump-bar path. A populated run was sampled separately (see Finding #3 note) and the empty-state screen itself renders correctly everywhere it appeared.
- **Block Dialogues** (Block 1 & Block 2) were driven through the real UI end-to-end: guided mode → transition screen → unguided mode → XP completion screen, always picking the correct choice to avoid the retry/confusion loop and reach every screen once. Screenshot + text captured at every prompt and every feedback state (70 captures total across both walkthroughs + the race).
- **Block Race for Block 1** was driven through the real UI: idle screen → Start Race → several real questions (first choice clicked each round, regardless of correctness, to also sample the wrong-answer freeze state) → real-time wait for the 60s timer to finish → finished screen.
- Full-resolution screenshots were reviewed individually for layout/visual issues across a representative sample covering every exercise type, both dialogues, and the race; the automated text scan covered 100% of exercises for corrupted/garbled text.
- QA driver scripts live in `client/qa-walk-lessons.cjs`, `client/qa-walk-dialogues-race.cjs`, `client/qa-make-contactsheets.cjs`, `client/qa-resize-for-review.cjs`. Screenshots/logs are gitignored (`qa-screenshots/`, `qa-*-log.json`) — regenerate by running the walker scripts with `npm run dev` already up.

**Result summary:** 110/110 lesson exercises and 70/70 dialogue+race captures passed the automated corruption scan (zero mojibake, zero suspect tokens, zero console/page errors). Visual spot-checks across all 8 exercise types, both dialogues, and the race found no layout bugs, no overlapping elements, no cut-off text, and correct diacritic rendering throughout. **One real bug was found** — not in lesson content, but in lesson *navigation* (Finding #1).

---

## Lessons

### First Words (`s1-first-words`)
**Status:** 🟢 Pass — 10/10 exercises clean (LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, WORD_MATCH_REVIEW ×2, LISTEN_AND_IDENTIFY ×2, FILL_IN_BLANK_PICK ×2). Reviewed full-resolution: ex1 (LISTEN_AND_PICK), ex3 (PICK_TRANSLATION), ex5 (WORD_MATCH_REVIEW empty state), ex6 (LISTEN_AND_IDENTIFY). All diacritics (Ďakujem, Prepáčte, Rozumiete?) render correctly.

### Most Common Verbs (`s1-verbs`)
**Status:** 🟢 Pass — 10/10 exercises clean (VOCABULARY_TABLE ×3, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE ×2, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW).

### Greetings (`s1-greetings`)
**Status:** 🟢 Pass — 8/8 exercises clean (VOCABULARY_TABLE, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, WORD_MATCH_REVIEW, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW).

### How Are You (`s1-how-are-you`)
**Status:** 🟢 Pass — 8/8 exercises clean (VOCABULARY_TABLE ×2, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW).

### I Don't Understand (`s1-dont-understand`)
**Status:** 🟢 Pass — 9/9 exercises clean (VOCABULARY_TABLE, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE ×2, WORD_MATCH_REVIEW ×2, FILL_IN_BLANK_PICK).

### Who I Am (`s1-who-i-am`)
**Status:** 🟢 Pass — 9/9 exercises clean (VOCABULARY_TABLE ×2, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, WORD_MATCH_REVIEW ×2, FILL_IN_BLANK_PICK).

### Describing Yourself (`s1-describing-yourself`)
**Status:** 🟢 Pass — 8/8 exercises clean (VOCABULARY_TABLE, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, WORD_MATCH_REVIEW, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW).

### Parts of the Body (`s1-body-parts`)
**Status:** 🟢 Pass — 11/11 exercises clean (VOCABULARY_TABLE ×3, LISTEN_AND_PICK ×4, PICK_TRANSLATION, SITUATIONAL_CHOICE, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW). Reviewed full-resolution: ex1 ("Head & Face" table — Hlava, Vlasy, Tvár, Oko/Oči, Ucho/Uši all render with correct diacritics, 8-row table fits cleanly with "8 more to go" pill), ex10 (FILL_IN_BLANK_PICK, "Boli ma ___. Mám teplotu." renders correctly with 4 body-part choices).

### Colors (`s1-colors`)
**Status:** 🟢 Pass — 8/8 exercises clean (VOCABULARY_TABLE ×2, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW).

### Family (`s1-family`)
**Status:** 🟢 Pass — 9/9 exercises clean (VOCABULARY_TABLE ×3, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW).

### Cardinal & Ordinal Numbers (`s1-cardinal-numbers`)
**Status:** 🟢 Pass — 10/10 exercises clean (VOCABULARY_TABLE ×3, NUMBER_TO_WORDS, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW). Reviewed full-resolution: ex1 ("Numbers 0–10" vocabulary table — nula, jeden, dva, tri, štyri, päť, šesť, sedem all correct), ex4 (NUMBER_TO_WORDS — digit "3" with word choices dva/tri/štyri/päť, correct caron rendering on päť), ex8 (the floor-ordinal SITUATIONAL_CHOICE — **confirms Codex's Phase 35 fix live in-browser**: "1st floor / 2nd floor / 3rd floor / 5th floor" choices render as plain English ordinals, not corrupted by `slovakifyNumbers`).

### Food (`s1-food`)
**Status:** 🟢 Pass — 10/10 exercises clean (VOCABULARY_TABLE ×4, LISTEN_AND_PICK ×2, PICK_TRANSLATION, SITUATIONAL_CHOICE, FILL_IN_BLANK_PICK, WORD_MATCH_REVIEW). Reviewed full-resolution: ex4 ("Dietary Needs" table) — initially looked like the English/Slovak columns were being CSS-truncated ("Allergic to...", "Nejem...", "I am allergic to... (m/f)"), but cross-checked against `s1-food.json` directly and confirmed the `...` is literal authored content (intentional sentence-starter pattern for "I am allergic to ___" / "I don't eat ___"), not a rendering bug. No truncation artifacts found.

---

## Block Dialogues

### Block 1 Dialogue (`stage1-block1`)
**Status:** 🟢 Pass — Full guided pass (6/6 exchanges, prompt + feedback for each) → transition screen ("Ready for the real thing?") → full unguided pass (6/6 exchanges) → XP completion screen ("+20 XP"), all reviewed. Guided mode correctly shows translations under both Marek's lines and the user's choices; unguided mode correctly hides them while keeping the same layout. Feedback banners, the chat-bubble layout, and the "Let's Go" / "Continue" buttons all render correctly at every step.

### Block 2 Dialogue (`stage1-block2`)
**Status:** 🟢 Pass — Full guided pass (8/8 exchanges) → transition → full unguided pass (8/8 exchanges) → XP completion screen ("Your First Conversation — Part 2", "+20 XP"), all reviewed. Specifically checked the **open-question exchanges** (ex2–ex7, all 4 choices marked `isCorrect: true`) — all 4 choices render normally as selectable options with no visual difference from closed questions, and any of them advances the conversation correctly (verified by clicking the first-listed choice, which differs per exchange).

---

## Block Race — Block 1

**Status:** 🟢 Pass — Idle screen (rules, attempts counter, "Start Race!") → running phase (timer, ✓/✗ counters, snail progress bar, 2-choice-row question grid) → wrong-answer freeze state (pink flash + "⏸ 2s" pause indicator, timer correctly paused) → correct-answer bonus (+3s, green flash) → real-time finish after the 60s timer elapsed → finished screen ("Snail Pace...", correct/wrong/accuracy stats, XP earned, best score, "Race Again!" / "Back to home"). All screens rendered cleanly; no layout issues across 8 sampled questions of varying prompt length.

---

## Findings Index

### Finding #1 — Navigating directly between two lesson pages crashes the app
**Status:** 🔴 Open
**Severity:** Medium (not reachable via any in-app button; reachable via direct URL/hash editing or a stale tab)
**Where:** `client/src/pages/LessonPage.tsx`

**Description:** `LessonPage` is mounted on the route `/lesson/:lessonId` with no `key` tied to `lessonId`. If the app navigates from `/lesson/A` directly to a different `/lesson/B` **without** passing through another route in between, React does not remount the component — it re-renders the existing instance with new props. This throws:

```
Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
```

...and the page goes blank (confirmed via `pageerror` listener + empty `document.body.innerText()`). Once crashed, the app does not recover on subsequent navigations within the same tab.

**Reproduction (confirmed twice, isolated from the rest of this QA pass):**
1. Open `/#/lesson/s1-first-words` (loads fine).
2. Without going through Home, navigate directly to `/#/lesson/s1-verbs` (e.g. by editing the URL hash, or via `page.goto` in a script/test).
3. App crashes to a blank page.

**Why it slipped past this QA pass initially:** My own lesson-walker script originally chained `page.goto` calls between lesson URLs back-to-back and hit this exact crash for 10 of the 12 lessons (visible as `locator.click: Timeout 5000ms exceeded` on the dev jump bar, because the bar never rendered — the page was blank). I caught it by checking `pageerror` events directly rather than trusting the timeout message, confirmed the React error, then reproduced it minimally and re-ran the walker by routing through Home between every lesson (matching real navigation) to get clean results.

**Why real users are very unlikely to hit this today:** the only in-app code path that navigates to `/lesson/:id` is the lesson-card click on `HomePage.tsx:181`, and `HomePage` is a different route component — going through it always force-unmounts `LessonPage` first. It's reachable via: manually editing the address bar/hash while a lesson is open, or potentially a bookmarked/shared deep link opened while another lesson is already on screen in the same tab (PWA "open in app" type flows).

**Suggested next step (not implemented — reporting only, per instructions):** give `<Route element={<LessonPage />} />` (or the `LessonPage` element itself) a `key={lessonId}` so a `:lessonId` param change always forces a clean remount, matching the pattern already used for `BlockDialoguePage` (`location.key`-driven reset effect, Phase 28).

---

### Finding #2 — Minor: BOM byte at the start of 7 lesson JSON files
**Status:** ⚪ Not a bug (informational)
**Where:** `s1-first-words.json`, `s1-verbs.json`, `s1-greetings.json`, `s1-how-are-you.json`, `s1-dont-understand.json`, `s1-who-i-am.json`, `s1-describing-yourself.json`

**Description:** These 7 files start with a UTF-8 BOM (`EF BB BF`), which breaks plain `JSON.parse` (e.g. in a quick Node script) but does **not** affect the app — Vite/esbuild's JSON loader tolerates the BOM fine, confirmed by these exact lessons rendering correctly in-browser throughout this QA pass. Noting only because it's inconsistent with the other 5 lesson files in scope (no BOM) and could trip up any future tooling that does its own `JSON.parse` on these files directly (as my own QA script did before I added a strip-BOM step).

---

### Finding #3 — Coverage gap: `WORD_MATCH_REVIEW` populated state not exercised per-lesson
**Status:** ⚪ Not a bug (methodology note)

Jumping to a `WORD_MATCH_REVIEW` exercise via the dev bar always shows the empty "Nothing to Review" state (see Methodology). A populated run was sampled once outside the main 12-lesson pass (forced wrong answers in `s1-first-words` ex3, then jumped to ex5) but didn't actually land on a populated state within a reasonable number of attempts, since the choice shuffle made the deliberately-first-clicked choice land correct most rounds. The matching UI itself (`WordMatchReview.tsx`) was read in full and is generic/data-driven with no lesson-specific rendering logic, so this is a low-risk gap — but if a future pass wants to specifically verify it, a real play-through (not jump-bar) with intentionally wrong answers is needed.

---

### Finding #4 — English am/pm choices corrupted by `slovakifyNumbers`
**Status:** 🟢 Fixed — 2026-06-16
**Severity:** High while present (visible, broken-looking answer text in a live exercise)
**Where:** `client/src/components/exercises/SituationalChoiceExercise.tsx`

**Description:** Same bug class as Finding from Codex's Phase 35 (ordinal floors), different trigger. The `displayChoice` guard only excluded English ordinals (`1st`, `2nd`, ...) from `slovakifyNumbers`; English clock times slipped through. In `s1-times-of-day.json` ex6 ("A shop's opening hours sign says it opens 'o ôsmej ráno.' What time does it open?"), the choices `8pm` / `8am` / `10am` / `Noon` rendered as `osempm` / `Noon` / `osemam` / `desaťam` — caught live by the user in-browser (screenshot attached in chat) on the lesson added in Phase 39.

**Fix:** added a second guard in `displayChoice` — `/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i` — alongside the existing ordinal regex. Both now skip `slovakifyNumbers`. Verified `8pm`/`8am`/`10am`/`5:30pm` pass through unchanged, ordinals still work, and genuine Slovak numbers (`100 eur` → `sto eur`) still convert.

**Swept for the same exposure elsewhere:** grepped all lesson JSON for `\d{1,2}(am|pm)` — only `s1-emergency.json` and `s1-food.json` matched besides `s1-times-of-day.json`, and only in `situation`/`instruction` text (never passed through `displayChoice`), not inside any `choices` array. No other lessons affected.

---

## Lessons — Added After the Main Pass

### Times of the Day (`s1-times-of-day`)
**Status:** 🟢 Pass (after Finding #4 fix) — not part of the original 12-lesson scope; content was added in Phase 39 after this document's first compilation. 9 exercises (`VOCABULARY_TABLE` ×3, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`). The am/pm choice corruption in ex6 (Finding #4) was found and fixed same-day; re-verified clean in the Block 3 pass below — `8pm`/`10am`/`Noon`/`8am` now render correctly.

---

## Block 3 — Numbers & Time (full pass)

**Status:** 🟢 Pass — all 6 lessons in `stage1-block3` plus the Block Race for Block 3. No Block 3 dialogue exists yet (`block-dialogues/` only has Block 1 and Block 2), so this section covers lessons + race only.

Methodology matches the main pass: DEV jump bar per exercise, full automated text-corruption scan (53/53 lesson exercises + 12/12 race captures, zero mojibake, zero suspect tokens, zero console/page errors), full-resolution visual spot-check across every exercise type.

### Cardinal & Ordinal Numbers (`s1-cardinal-numbers`)
**Status:** 🟢 Pass — re-verified, no regressions since the original pass (Finding #4 doesn't touch this lesson; its ordinal-floor fix from Codex Phase 35 was already confirmed separately).

### Money (`s1-money`)
**Status:** 🟢 Pass — 8/8 exercises clean (`VOCABULARY_TABLE` ×2, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`). Reviewed full-resolution: ex1 ("Money & Payment Words" — confirms the Phase 38 mojibake-fix content renders correctly live: `Účet`, `Účtenka`, `Hotovosť` all display with correct diacritics, no corruption), ex6 (SITUATIONAL_CHOICE — "Môžem dostať účet?" restaurant-bill scenario), ex7 (FILL_IN_BLANK_PICK — "Päť eur" euro-amount sentence, no digit-conversion issues).

### Days of the Week (`s1-days-of-week`)
**Status:** 🟢 Pass — 9/9 exercises clean (`VOCABULARY_TABLE` ×3, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`).

### Weeks of the Month (`s1-weeks-of-month`)
**Status:** 🟢 Pass — 8/8 exercises clean (`VOCABULARY_TABLE` ×2, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`). Reviewed full-resolution: ex2 ("Weeks Within a Month" — ordinal week labels "1st week"/"2nd week"/"3rd week" with `Prvý týždeň`/`Druhý týždeň`/`Tretí týždeň`; the longer "Posledný týždeň mesiaca" row wraps to 3 lines cleanly with no overflow/cutoff).

### Months of the Year (`s1-months-of-year`)
**Status:** 🟢 Pass — 9/9 exercises clean (`VOCABULARY_TABLE` ×3, `LISTEN_AND_PICK` ×2, `PICK_TRANSLATION`, `SITUATIONAL_CHOICE`, `FILL_IN_BLANK_PICK`, `WORD_MATCH_REVIEW`). Reviewed full-resolution: ex7 (residence-permit-expiry SITUATIONAL_CHOICE — `Platí do januára.` / `Platí do marca.` / `Platí do júna.` / `Platí do decembra.` all render correctly).

### Block Race — Block 3
**Status:** 🟢 Pass — idle screen ("Block Race — Numbers & Time", correct block name interpolation) → running phase (10 sampled questions) → wrong-answer freeze state → finished screen ("Snail Pace...", stats, XP, "Race Again!"). Confirmed the question pool is cumulative (mixes content from Blocks 1, 2, and 3 — e.g. saw "Leg / Foot" from Parts of the Body and "Last week (of something)" from Weeks of the Month in the same run), matching `getCumulativeLessonIds()` by design — not a bug.

---

## Block 4 & Block 5 Dialogues (Phase 53 QA Pass — 2026-06-17)

**Methodology:** `client/qa-walk-block4-block5.cjs` — Playwright on `devices['Pixel 7']`, dev server `localhost:5173`. Progress store seeded so all lessons marked complete (to unlock Block 4 and Block 5 dialogue buttons). Both blocks walked in full: guided pass → transition/completion screen → unguided pass → XP completion screen. Correct choice always picked (first choice for open questions, single `isCorrect: true` choice for closed questions). 84 total captures across both dialogues (both passes).

**Automated checks:** programmatic scan of all 84 `body.innerText()` dumps for mojibake sequences (`Ã.`, `â€.`, `U+FFFD`). Zero corruption detected. Speaker labels (`p.text-[10px]` elements) collected at every step and verified against expected speaker per exchange.

### Block 4 Dialogue (`stage1-block4`) — Emergency Call
**Status:** 🟢 Pass — 10/10 exchanges × guided + unguided = 40 exchange captures, plus 2 completion screens. Zero corruption.

**Multi-speaker check:** DISPATCHER (D) labels present on exchanges 1–6; MAREK (M) labels appear from exchange 7 onward. Transition confirmed visually: ex7 screenshot shows history correctly labelled DISPATCHER (D) for all prior bubbles, and the incoming bubble for ex7 bears the "MAREK (M)" amber label above it with avatar 👨. Speaker handoff is pixel-perfect.

**Slovak content spot-check (full-resolution screenshot ex7):** history bubbles show `Záchranná je na ceste.`, `Zostanete s ním.`, `Som vedľa lekárne.` — all diacritics correct. Marek's incoming line: `Ahoj! Počul som sirény pri tvojej budove. Čo sa stalo?` — fully intact. Choices visible: `Niekto spadol a bol zranený.` / `Bol tu požiar.` / `Ukradli mi peňaženku.` / `Nič sa nestalo.`

**Completion screens:** guided complete renders cleanly; unguided XP screen reached and Continue button navigated back to Home without error.

### Block 5 Dialogue (`stage1-block5`) — Doctor, Then Pharmacy
**Status:** 🟢 Pass — 10/10 exchanges × guided + unguided = 40 exchange captures, plus 2 completion screens. Zero corruption.

**Multi-speaker check:** DOCTOR (DR) labels on exchanges 1–5; PHARMACIST (P) labels from exchange 6 onward. Transition confirmed visually: ex6 screenshot shows all prior doctor exchanges in history with DOCTOR (DR) labels, and the incoming pharmacist bubble bears "PHARMACIST (P)" in amber. The scene change (doctor office → pharmacy) is clear and correctly rendered.

**Slovak content spot-check (full-resolution screenshot ex6):** history tail shows `Vedľa banky.` (doctor direction) and `Dovidenia, ďakujem veľmi pekne!` (farewell) — all diacritics intact. Pharmacist opening line: `Dobrý deň. Ako vám môžem pomôcť?` — correct. Answer choices: `Mám predpis od doktora.` / `Je potrebný predpis?` / `Máte niečo na nádchu?` / `Koľko je hodín?` — all intact.

**Completion screens:** guided complete and unguided XP screen both clean. Full run end-to-end without error on both passes.

**QA script:** `client/qa-walk-block4-block5.cjs`. Screenshots in `client/qa-screenshots/block4-block5/` (gitignored). Log at `client/qa-block4-block5-log.json` (gitignored).
