// QA walker: Block 4 Dialogue (Emergency Call) and Block 5 Dialogue (Doctor → Pharmacist)
// Walks both guided and unguided passes for each, checks multi-speaker labels,
// diacritic integrity, and open-question handling.
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'qa-screenshots', 'block4-block5');
const LOG_PATH = path.join(__dirname, 'qa-block4-block5-log.json');

const MOJIBAKE_RE = /Ã[\x80-\xBF]|â€[\x80-\x9F]|[^\x00-\x7FÀ-ž’–—“”�]/u;
// More targeted: look for the specific double-encoded sequences and the replacement char
const CORRUPT_RE = /Ã[\x80-\xBF]|â€[\x80-\x9F]|�/;

function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
function loadDialogue(id) {
  const file = path.join(__dirname, 'src/data/block-dialogues', `${id}.json`);
  return JSON.parse(stripBOM(fs.readFileSync(file, 'utf8')));
}

async function shot(page, dir, name, findings, meta) {
  const shotPath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: shotPath });
  const text = await page.locator('body').innerText();
  const hasCorruption = CORRUPT_RE.test(text);
  // Check for speaker labels (multi-speaker blocks)
  const speakerLabels = [];
  const labelEls = await page.locator('p.text-\\[10px\\]').allInnerTexts().catch(() => []);
  speakerLabels.push(...labelEls);

  const entry = {
    ...meta,
    corruption: hasCorruption,
    speakerLabels,
    screenshot: path.relative(__dirname, shotPath),
    textSnapshot: text.slice(0, 800),
  };
  findings.push(entry);
  const flag = hasCorruption ? ' ⚠️  CORRUPTION' : '';
  console.log(`  ${name}${flag}`);
  if (speakerLabels.length) console.log(`    speakers: ${speakerLabels.join(', ')}`);
  return entry;
}

async function walkDialogue(page, dialogueData, findings) {
  const dir = path.join(OUT_DIR, dialogueData.blockId);
  fs.mkdirSync(dir, { recursive: true });

  const passes = ['guided', 'unguided'];

  for (const mode of passes) {
    console.log(`\n  ── ${mode} ──`);

    // Navigate home and click the dialogue button
    await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const dialogueBtn = page.locator(`button:has-text("${dialogueData.title}")`).first();
    await dialogueBtn.click({ timeout: 8000 });
    await page.waitForTimeout(600);

    // If guided pass, first screen shows the guided intro
    // If unguided pass, it should skip straight to exchanges (dialogue already completed)

    for (let i = 0; i < dialogueData.exchanges.length; i++) {
      const exchange = dialogueData.exchanges[i];

      await shot(page, dir, `${mode}-ex${i + 1}-prompt`, findings, {
        blockId: dialogueData.blockId, mode, exchangeIndex: i + 1, phase: 'prompt',
        exchangeSpeaker: exchange.speaker, isOpen: exchange.isOpenQuestion,
      });

      // For open questions, all choices are correct; pick first. For closed, pick the correct one.
      const correctChoice = exchange.isOpenQuestion
        ? exchange.choices[0]
        : exchange.choices.find((c) => c.isCorrect) ?? exchange.choices[0];

      const choiceBtn = page.locator(`button:has-text("${correctChoice.text}")`).first();
      await choiceBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);

      await shot(page, dir, `${mode}-ex${i + 1}-feedback`, findings, {
        blockId: dialogueData.blockId, mode, exchangeIndex: i + 1, phase: 'feedback',
        exchangeSpeaker: exchange.speaker, isOpen: exchange.isOpenQuestion,
      });

      const continueBtn = page.getByRole('button', { name: /Continue|Try Again/ }).first();
      await continueBtn.click({ timeout: 5000 });
      await page.waitForTimeout(400);
    }

    // Completion screen
    await shot(page, dir, `${mode}-complete`, findings, {
      blockId: dialogueData.blockId, mode, phase: 'complete',
    });

    if (mode === 'guided') {
      // Guided complete → "Let's Go" → unguided
      const letsGoBtn = page.getByRole('button', { name: /Let's Go|Continue/ }).first();
      await letsGoBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
    } else {
      // Unguided complete → "Continue" → back to home
      const continueBtn = page.getByRole('button', { name: 'Continue' }).first();
      await continueBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  await context.addInitScript(() => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
    // Unlock Block 4 and Block 5 completion prerequisites via progress store
    // We don't pre-complete lessons; the dev bypass handles lesson gating.
    // Block dialogues are gated on their block's lessons being complete.
    // Use the dev bypass by setting the store to have enough XP + completed lessons.
    const stored = JSON.parse(localStorage.getItem('slovak-progress') || 'null');
    if (!stored) return;
    // Mark all survival lessons complete so blocks unlock
    if (stored.state && stored.state.lessonProgress) {
      Object.keys(stored.state.lessonProgress).forEach((id) => {
        stored.state.lessonProgress[id].completed = true;
        stored.state.lessonProgress[id].strength = 100;
      });
      stored.state.xp = 500;
      stored.state.level = 3;
      localStorage.setItem('slovak-progress', JSON.stringify(stored));
    }
  });
  const page = await context.newPage();

  // Seed progress store after page loads (addInitScript can't read existing localStorage reliably for timing)
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' });

  // Directly set progress in localStorage via evaluate
  await page.evaluate(() => {
    const raw = localStorage.getItem('slovak-progress');
    const stored = raw ? JSON.parse(raw) : null;
    if (!stored || !stored.state) return;
    // Mark all lessons complete
    const lp = stored.state.lessonProgress || {};
    Object.keys(lp).forEach((id) => {
      lp[id] = { ...lp[id], completed: true, strength: 100 };
    });
    stored.state.lessonProgress = lp;
    stored.state.xp = 500;
    stored.state.level = 3;
    localStorage.setItem('slovak-progress', JSON.stringify(stored));
  });

  // Reload to pick up store changes
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const findings = [];

  console.log('\n=== Block 4 Dialogue (Emergency Call) ===');
  const block4 = loadDialogue('block4-dialogue');
  await walkDialogue(page, block4, findings);

  console.log('\n=== Block 5 Dialogue (Doctor → Pharmacist) ===');
  const block5 = loadDialogue('block5-dialogue');
  await walkDialogue(page, block5, findings);

  // Summary
  const corrupted = findings.filter((f) => f.corruption);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total snapshots: ${findings.length}`);
  console.log(`Corruption detected: ${corrupted.length}`);
  if (corrupted.length) {
    corrupted.forEach((f) => console.log(`  ⚠️  ${f.screenshot}`));
  } else {
    console.log('  ✅ No encoding corruption found');
  }

  // Speaker label summary
  const withLabels = findings.filter((f) => f.speakerLabels && f.speakerLabels.length > 0);
  const uniqueLabels = [...new Set(withLabels.flatMap((f) => f.speakerLabels))];
  console.log(`Speaker labels seen: ${uniqueLabels.join(', ') || '(none)'}`);

  fs.writeFileSync(LOG_PATH, JSON.stringify(findings, null, 2));
  console.log(`\nWrote ${findings.length} entries to ${LOG_PATH}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
