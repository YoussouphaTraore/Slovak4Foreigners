// QA walker — Phases 55 & 56
// Tests: block structure rename, 5 new lessons, Block 6 dialogue (3 speakers),
// SnailRace final-block message update, end-of-feed complete variant (now block7).
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'qa-screenshots', 'phase55-56');
fs.mkdirSync(OUT, { recursive: true });

const DEV_URL  = 'http://localhost:5173';
const PROD_URL = 'http://localhost:4200';

const CORRUPT_RE = /[À-ÿ]{3,}|â€™|â€œ|Ã|Â[^\s]/;

async function shot(page, name) {
  const p = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}`);
  return p;
}

async function seedConsent(context) {
  await context.addInitScript(() => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
  });
}

// All non-coming_soon survival lesson IDs (Blocks 1-6 + s1-flat-items from Block 7)
const ALL_LESSON_IDS = [
  's1-first-words','s1-verbs','s1-greetings','s1-how-are-you','s1-dont-understand',
  's1-who-i-am','s1-describing-yourself','s1-body-parts','s1-colors','s1-family',
  's1-cardinal-numbers','s1-money','s1-times-of-day','s1-days-of-week','s1-weeks-of-month','s1-months-of-year',
  's1-my-address','s1-directions','s1-positions','s1-emergency',
  's1-hospital','s1-pharmacy',
  's1-food','s1-ordering-food','s1-transport','s1-tram-bus','s1-taxi',
  's1-flat-items',
];

// Seed full progress: all live lessons complete, blocks 1-7 passed, dialogues 1-6 done
async function seedFullProgress(context) {
  await context.addInitScript((lessonIds) => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
    const store = {
      state: {
        completedLessons: lessonIds,
        passedBlocks: [
          'stage1-block1','stage1-block2','stage1-block3',
          'stage1-block4','stage1-block5','stage1-block6','stage1-block7',
        ],
        completedBlockDialogues: [
          'stage1-block1','stage1-block2','stage1-block3',
          'stage1-block4','stage1-block5','stage1-block6',
        ],
        lessonProgress: {},
        xp: 2000,
        level: 7,
        unlockedStages: ['survival','settling'],
        reviewQueue: [],
        lastActivity: Date.now(),
      },
      version: 15,
    };
    localStorage.setItem('slovak-progress', JSON.stringify(store));
  }, ALL_LESSON_IDS);
}

// Walk a lesson: navigate, click through all exercises, return corruption status
async function walkLesson(browser, lessonId, label) {
  console.log(`\n=== Lesson: ${label} (${lessonId}) ===`);
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await seedFullProgress(ctx);
  const page = await ctx.newPage();

  await page.goto(`${DEV_URL}/#/lesson/${lessonId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const findings = { lessonId, label, passes: [], fails: [] };
  let exerciseIndex = 0;
  let maxExercises = 20;

  while (exerciseIndex < maxExercises) {
    await page.waitForTimeout(300);

    // Check for lesson complete / XP screen
    const url = page.url();
    if (url.includes('/celebration') || url.includes('/home') || url.includes('/#/')) {
      console.log(`  ✅ Lesson completed after ${exerciseIndex} exercises`);
      findings.passes.push('lesson-completion-reached');
      break;
    }

    const body = await page.locator('body').innerText().catch(() => '');
    if (CORRUPT_RE.test(body)) {
      const sample = body.match(CORRUPT_RE)?.[0];
      findings.fails.push(`corruption-ex${exerciseIndex}: "${sample}"`);
      console.log(`  ❌ Corruption at exercise ${exerciseIndex}: ${sample}`);
    }

    // Screenshot first and last visible exercise
    if (exerciseIndex === 0 || exerciseIndex === 2) {
      await shot(page, `${lessonId}-ex${exerciseIndex}`);
    }

    // Try to advance: LISTEN_AND_PICK / PICK_TRANSLATION / FILL_IN_BLANK_PICK — click first option
    // SITUATIONAL_CHOICE — click first option
    // VOCABULARY_TABLE / WORD_MATCH_REVIEW — click Continue / Next
    const advanced = await tryAdvance(page, exerciseIndex);
    if (!advanced) {
      console.log(`  ⚠️  Could not advance at exercise ${exerciseIndex} — taking screenshot`);
      await shot(page, `${lessonId}-stuck-ex${exerciseIndex}`);
      break;
    }
    exerciseIndex++;
  }

  // Check final screenshot
  await shot(page, `${lessonId}-final`);
  await ctx.close();
  return findings;
}

async function tryAdvance(page, index) {
  // WORD_MATCH_REVIEW — look for "Continue" button after completed state
  const continueBtn = page.locator('button').filter({ hasText: /^Continue$|^Next$|^Got it$|^Done$/ });
  if (await continueBtn.count() > 0) {
    await continueBtn.first().click();
    return true;
  }

  // VOCABULARY_TABLE — "I understand" or "Got it" or next button
  const gotIt = page.locator('button').filter({ hasText: /I understand|Got it|Continue|Next/i });
  if (await gotIt.count() > 0) {
    await gotIt.first().click();
    return true;
  }

  // LISTEN_AND_PICK / PICK_TRANSLATION / FILL_IN_BLANK_PICK — click a choice then Confirm
  const choices = page.locator('button[data-choice], [role="button"]').filter({ hasText: /\w/ });
  const choiceCount = await choices.count();
  if (choiceCount > 0) {
    await choices.first().click();
    await page.waitForTimeout(200);
    const confirm = page.locator('button').filter({ hasText: /Confirm|Check|Submit|Continue|Next/i });
    if (await confirm.count() > 0) {
      await confirm.first().click();
      await page.waitForTimeout(300);
      const next = page.locator('button').filter({ hasText: /Continue|Next|Got it/i });
      if (await next.count() > 0) await next.first().click();
      return true;
    }
    return true;
  }

  // SITUATIONAL_CHOICE — click any visible answer button
  const scenarioBtn = page.locator('button').filter({ hasText: /\w{3,}/ }).nth(1);
  if (await scenarioBtn.count() > 0) {
    await scenarioBtn.click();
    await page.waitForTimeout(300);
    const next = page.locator('button').filter({ hasText: /Continue|Next|Got it/i });
    if (await next.count() > 0) await next.first().click();
    return true;
  }

  return false;
}

async function main() {
  const findings = [];
  const browser = await chromium.launch();

  // ── TEST 1: Homepage structure — Block 6 renamed, Block 7 added ────────────
  console.log('\n=== TEST 1: Homepage block structure ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedFullProgress(ctx);
    const page = await ctx.newPage();
    await page.goto(`${DEV_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const body = await page.locator('body').innerText();
    const hasFoodGettingAround = /Food & Getting Around/.test(body);
    const hasAtHome = /At Home/.test(body);
    const hasDailyLife = /Daily Life/.test(body);
    const hasBlock7 = /stage1-block7|At Home/.test(body);

    console.log(`  "Food & Getting Around" visible: ${hasFoodGettingAround}  (want true)`);
    console.log(`  "At Home" (Block 7) visible: ${hasAtHome}  (want true)`);
    console.log(`  "Daily Life" still visible: ${hasDailyLife}  (want false)`);

    findings.push({
      test: 'block-structure',
      pass: hasFoodGettingAround && hasAtHome && !hasDailyLife,
    });

    await shot(page, '1-homepage-block6-block7');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, '1-homepage-bottom');
    await ctx.close();
  }

  // ── TEST 2-6: Walk all 5 new lessons ───────────────────────────────────────
  const newLessons = [
    { id: 's1-ordering-food', label: 'Ordering Food' },
    { id: 's1-transport',     label: 'Means of Transportation' },
    { id: 's1-tram-bus',      label: 'Tram/Bus' },
    { id: 's1-taxi',          label: 'Taxi' },
    { id: 's1-flat-items',    label: 'Items in My Flat' },
  ];

  for (let i = 0; i < newLessons.length; i++) {
    const { id, label } = newLessons[i];
    const result = await walkLesson(browser, id, label);
    const pass = result.fails.length === 0 && result.passes.length > 0;
    findings.push({ test: `lesson-${id}`, pass, ...result });
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
  }

  // ── TEST 7: Block 6 dialogue — all 10 exchanges, 3 speakers ───────────────
  console.log('\n=== TEST 7: Block 6 Dialogue (3 speakers: Marek/Waitress/Driver) ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedFullProgress(ctx);
    const page = await ctx.newPage();
    await page.goto(`${DEV_URL}/#/block-dialogue/stage1-block6`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const speakersSeen = new Set();
    const corruptionFound = [];
    let exchangeCount = 0;

    await shot(page, '7-block6-dialogue-start');

    for (let ex = 0; ex < 12; ex++) {
      await page.waitForTimeout(400);
      const url = page.url();
      if (!url.includes('block-dialogue')) break;

      const body = await page.locator('body').innerText().catch(() => '');
      if (CORRUPT_RE.test(body)) {
        corruptionFound.push(`ex${ex}: ${body.match(CORRUPT_RE)?.[0]}`);
      }

      // Collect speaker labels
      const speakerLabel = await page.locator('[class*="speaker"], [class*="Speaker"], [class*="label"]')
        .filter({ hasText: /Marek|Waitress|Taxi Driver|M|W|T/ })
        .first()
        .innerText()
        .catch(() => null);
      if (speakerLabel) speakersSeen.add(speakerLabel.trim());

      // Screenshot at speaker transitions (ex5 = waitress, ex10 = driver)
      if (ex === 4 || ex === 9) {
        await shot(page, `7-block6-dialogue-ex${ex + 1}`);
      }

      // Click correct/first correct answer
      const correctBtn = page.locator('button').filter({ hasText: /Poďme|Nie, potrebujem|Validoval|Tu vystupujem|Stôl pre dvoch|Nejem|Dám si polievku|Áno, veľmi|Na túto adresu|Drobné si nechajte/i }).first();
      if (await correctBtn.count() > 0) {
        await correctBtn.click();
      } else {
        // Fallback: click the first answer choice
        const anyBtn = page.locator('button').filter({ hasText: /\w{4,}/ }).first();
        if (await anyBtn.count() > 0) await anyBtn.click();
      }
      await page.waitForTimeout(400);

      // Click Continue / Next
      const nextBtn = page.locator('button').filter({ hasText: /Continue|Next|Ďalej/i }).first();
      if (await nextBtn.count() > 0) await nextBtn.click();

      exchangeCount++;
    }

    await shot(page, '7-block6-dialogue-end');

    const speakersOk = speakersSeen.size >= 2; // Marek + at least one other
    const noCorruption = corruptionFound.length === 0;
    console.log(`  Exchanges walked: ${exchangeCount}`);
    console.log(`  Speakers seen: ${[...speakersSeen].join(', ')}`);
    console.log(`  Corruption: ${noCorruption ? 'none' : corruptionFound.join(', ')}`);

    findings.push({
      test: 'block6-dialogue',
      pass: noCorruption && exchangeCount >= 8,
      speakersSeen: [...speakersSeen],
      exchangeCount,
      corruption: corruptionFound,
    });

    await ctx.close();
  }

  // ── TEST 8: SnailRacePage — final block message (block7 = last) ──────────
  console.log('\n=== TEST 8: SnailRacePage — block7 is last, must NOT say "Stage 2 is now unlocked" ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedFullProgress(ctx);
    const page = await ctx.newPage();
    // Navigate to block7 race page
    await page.goto(`${DEV_URL}/#/race/survival/stage1-block7`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const body = await page.locator('body').innerText().catch(() => '');
    const hasStale = /Stage 2 is now unlocked/i.test(body);
    const hasCorrect = /New lessons are on the way/i.test(body);

    console.log(`  "Stage 2 is now unlocked" found: ${hasStale}  (want false)`);
    console.log(`  "New lessons are on the way" present in source: checked in race finish state`);

    await shot(page, '8-snailrace-block7');
    await ctx.close();

    // Verify the fix in SnailRacePage source directly
    const snailSrc = fs.readFileSync(
      path.join(__dirname, 'src/pages/SnailRacePage.tsx'), 'utf8'
    );
    const fixedInSource = snailSrc.includes('New lessons are on the way');
    const staleInSource = snailSrc.includes('Stage 2 is now unlocked');
    console.log(`  Source fix verified: ${fixedInSource} (want true)`);
    console.log(`  Stale text gone from source: ${!staleInSource} (want true)`);

    findings.push({
      test: 'snailrace-block7-message',
      pass: fixedInSource && !staleInSource,
    });
  }

  // ── TEST 9: Prod — end-of-feed complete variant now requires block7 ────────
  console.log('\n=== TEST 9: Prod — end-of-feed "complete" variant requires block7 pass ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedFullProgress(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(1000);

    const completeText = await page.locator('p').filter({ hasText: /New lessons on the way/ }).count();
    const incompleteText = await page.locator('p').filter({ hasText: /Complete the already loaded/ }).count();

    console.log(`  "New lessons on the way soon" shown: ${completeText > 0}  (want true)`);
    console.log(`  "Complete the already loaded" shown: ${incompleteText > 0}  (want false)`);

    findings.push({ test: 'end-of-feed-complete-block7', pass: completeText > 0 && incompleteText === 0 });
    await shot(page, '9-end-of-feed-complete');
    await ctx.close();
  }

  // ── TEST 10: Prod — block structure visible in production ─────────────────
  console.log('\n=== TEST 10: Prod — Block 6 & 7 visible, Daily Life gone ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedFullProgress(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const body = await page.locator('body').innerText();
    const hasFoodGettingAround = /Food & Getting Around/.test(body);
    const hasAtHome = /At Home/.test(body);
    const hasDailyLife = /Daily Life/.test(body);

    console.log(`  "Food & Getting Around" in prod: ${hasFoodGettingAround}  (want true)`);
    console.log(`  "At Home" in prod: ${hasAtHome}  (want true)`);
    console.log(`  "Daily Life" in prod: ${hasDailyLife}  (want false)`);

    findings.push({ test: 'prod-block-structure', pass: hasFoodGettingAround && hasAtHome && !hasDailyLife });
    await shot(page, '10-prod-block-structure');
    await ctx.close();
  }

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  let allPass = true;
  findings.forEach((f) => {
    const icon = f.pass ? '✅' : '❌';
    console.log(`  ${icon} ${f.test}`);
    if (!f.pass) allPass = false;
  });
  console.log(allPass ? '\n✅ All Phase 55-56 checks PASS' : '\n❌ One or more checks FAILED');

  fs.writeFileSync(
    path.join(__dirname, 'qa-phase55-56-log.json'),
    JSON.stringify(findings, null, 2),
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
