// QA walker — Phase 54: Stage 2/3 removal + end-of-feed message
// Tests: (1) prod hides Stage 2/3, (2) sentinel is hidden on load,
// (3) sentinel fades in on scroll, (4) correct variant per completion state,
// (5) dev still shows Stage 2/3.
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'qa-screenshots', 'phase54');
fs.mkdirSync(OUT, { recursive: true });

const PROD_URL = 'http://localhost:4200';
const DEV_URL  = 'http://localhost:5173';

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

// All non-coming_soon survival lesson IDs (verified from lesson JSON files)
// Block 6 only has s1-food as non-coming_soon; s1-ordering-food through
// s1-supermarket are all coming_soon:true placeholders.
const ALL_AVAILABLE_LESSON_IDS = [
  // Block 1
  's1-first-words', 's1-verbs', 's1-greetings', 's1-how-are-you', 's1-dont-understand',
  // Block 2
  's1-who-i-am', 's1-describing-yourself', 's1-body-parts', 's1-colors', 's1-family',
  // Block 3
  's1-cardinal-numbers', 's1-money', 's1-times-of-day', 's1-days-of-week',
  's1-weeks-of-month', 's1-months-of-year',
  // Block 4
  's1-my-address', 's1-directions', 's1-positions', 's1-emergency',
  // Block 5
  's1-hospital', 's1-pharmacy',
  // Block 6 (all live)
  's1-food', 's1-ordering-food', 's1-transport', 's1-tram-bus', 's1-taxi',
  // Block 7 (s1-pets, s1-beverages, s1-supermarket still coming_soon)
  's1-flat-items',
];

// Mark all survival non-shell lessons complete + pass block6 race
async function seedAllComplete(page) {
  await page.evaluate((lessonIds) => {
    const raw = localStorage.getItem('slovak-progress');
    const stored = raw ? JSON.parse(raw) : null;
    if (!stored || !stored.state) return;

    // completedLessons — set explicitly to all non-coming_soon survival lessons
    stored.state.completedLessons = lessonIds;

    // passedBlocks — pass all 7 blocks
    stored.state.passedBlocks = [
      'stage1-block1', 'stage1-block2', 'stage1-block3',
      'stage1-block4', 'stage1-block5', 'stage1-block6', 'stage1-block7',
    ];

    // completedBlockDialogues
    stored.state.completedBlockDialogues = [
      'stage1-block1', 'stage1-block2', 'stage1-block3',
      'stage1-block4', 'stage1-block5', 'stage1-block6',
    ];

    stored.state.xp = 1000;
    stored.state.level = 5;
    localStorage.setItem('slovak-progress', JSON.stringify(stored));
  }, ALL_AVAILABLE_LESSON_IDS);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}

async function main() {
  const findings = [];
  const browser = await chromium.launch();

  // ── TEST 1: Production — Stage 2/3 banners absent ──────────────────────────
  console.log('\n=== TEST 1: Prod — Stage 2/3 banners must be gone ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedConsent(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const body = await page.locator('body').innerText();
    const stage2 = /Stage 2/.test(body);
    const stage3 = /Stage 3|Advanced/.test(body);
    const comingSoon = /More coming soon/.test(body);
    const stage1 = /Stage 1/.test(body);

    console.log(`  Stage 2 visible: ${stage2}  (want false)`);
    console.log(`  Stage 3/Advanced visible: ${stage3}  (want false)`);
    console.log(`  "More coming soon" visible: ${comingSoon}  (want false)`);
    console.log(`  Stage 1 visible: ${stage1}  (want true)`);

    findings.push({ test: 'prod-no-stage2', pass: !stage2 && !stage3 && !comingSoon && stage1 });

    await shot(page, '1-prod-initial-top');

    // Scroll to bottom to see full feed
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, '1-prod-initial-scrolled-bottom');

    await ctx.close();
  }

  // ── TEST 2: Prod — Sentinel hidden on initial load ──────────────────────────
  console.log('\n=== TEST 2: Prod — sentinel opacity=0 on fresh load ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedConsent(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const sentinelLocator = page.locator('p').filter({
      hasText: /Complete the already loaded|New lessons on the way/,
    });
    const inDom = await sentinelLocator.count() > 0;
    const opacity = inDom
      ? await sentinelLocator.first().evaluate(
          (el) => window.getComputedStyle(el.parentElement).opacity,
        ).catch(() => 'err')
      : 'not-found';

    console.log(`  Sentinel in DOM: ${inDom}  (want true)`);
    console.log(`  Sentinel opacity before scroll: ${opacity}  (want 0)`);
    findings.push({
      test: 'sentinel-hidden-on-load',
      pass: inDom && opacity === '0',
      opacity,
    });

    await ctx.close();
  }

  // ── TEST 3: Prod — Sentinel fades in when scrolled to bottom ───────────────
  console.log('\n=== TEST 3: Prod — sentinel fades in on scroll to bottom ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedConsent(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    // Wait past the 500ms observer-mount delay
    await page.waitForTimeout(800);

    // Scroll to absolute bottom
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(1000); // wait for IntersectionObserver + CSS transition

    const sentinelLocator = page.locator('p').filter({
      hasText: /Complete the already loaded|New lessons on the way/,
    });
    const opacityAfter = await sentinelLocator.first().evaluate(
      (el) => window.getComputedStyle(el.parentElement).opacity,
    ).catch(() => 'err');

    console.log(`  Sentinel opacity after scroll to bottom: ${opacityAfter}  (want 1)`);
    findings.push({ test: 'sentinel-visible-after-scroll', pass: opacityAfter === '1', opacity: opacityAfter });

    await shot(page, '3-prod-sentinel-visible');

    await ctx.close();
  }

  // ── TEST 4: Prod — "Incomplete" variant shown when lessons remain ───────────
  console.log('\n=== TEST 4: Prod — "incomplete" message variant (default no-progress state) ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedConsent(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(900);

    const text = await page.locator('p').filter({
      hasText: /Complete the already loaded/,
    }).count();
    const wrongText = await page.locator('p').filter({
      hasText: /New lessons on the way/,
    }).count();

    console.log(`  "Complete the already loaded" shown: ${text > 0}  (want true)`);
    console.log(`  "New lessons on the way" shown: ${wrongText > 0}  (want false)`);
    findings.push({ test: 'incomplete-variant', pass: text > 0 && wrongText === 0 });

    await shot(page, '4-prod-incomplete-variant');

    await ctx.close();
  }

  // ── TEST 5: Prod — "Complete" variant shown when all lessons done ───────────
  console.log('\n=== TEST 5: Prod — "complete" message variant (all lessons + block6 race passed) ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedConsent(ctx);
    const page = await ctx.newPage();
    await page.goto(`${PROD_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await seedAllComplete(page);

    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(900);

    const completeText = await page.locator('p').filter({
      hasText: /New lessons on the way/,
    }).count();
    const incompleteText = await page.locator('p').filter({
      hasText: /Complete the already loaded/,
    }).count();

    console.log(`  "New lessons on the way" shown: ${completeText > 0}  (want true)`);
    console.log(`  "Complete the already loaded" shown: ${incompleteText > 0}  (want false)`);
    findings.push({ test: 'complete-variant', pass: completeText > 0 && incompleteText === 0 });

    await shot(page, '5-prod-complete-variant');
    // Also screenshot top of feed to confirm Stage 2/3 still absent even in "all complete" state
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.waitForTimeout(400);
    await shot(page, '5-prod-complete-top');

    await ctx.close();
  }

  // ── TEST 6: Dev — Stage 2/3 still fully visible ────────────────────────────
  console.log('\n=== TEST 6: Dev — Stage 2/3 still visible in dev mode ===');
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    await seedConsent(ctx);
    const page = await ctx.newPage();
    await page.goto(`${DEV_URL}/#/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const body = await page.locator('body').innerText();
    const stage2 = /Stage 2/.test(body);
    const stage3 = /Stage 3|Advanced/.test(body);
    const noSentinel = await page.locator('p').filter({
      hasText: /Complete the already loaded|New lessons on the way/,
    }).count() === 0;

    console.log(`  Stage 2 visible in dev: ${stage2}  (want true)`);
    console.log(`  Stage 3/Advanced visible in dev: ${stage3}  (want true)`);
    console.log(`  Sentinel absent in dev: ${noSentinel}  (want true)`);
    findings.push({ test: 'dev-stages-visible', pass: stage2 && stage3 && noSentinel });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, '6-dev-stage2-3-visible');

    await ctx.close();
  }

  await browser.close();

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n=== SUMMARY ===');
  let allPass = true;
  findings.forEach((f) => {
    const icon = f.pass ? '✅' : '❌';
    console.log(`  ${icon} ${f.test}`);
    if (!f.pass) allPass = false;
  });
  console.log(allPass ? '\n✅ All Phase 54 checks PASS' : '\n❌ One or more checks FAILED');

  fs.writeFileSync(
    path.join(__dirname, 'qa-phase54-log.json'),
    JSON.stringify(findings, null, 2),
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
