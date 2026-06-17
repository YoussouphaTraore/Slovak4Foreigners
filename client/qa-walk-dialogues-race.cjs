// QA walker for Block 1 Dialogue, Block 2 Dialogue (guided -> unguided, full
// end-to-end flow, picking the correct choice each time), and the Block Race
// for Block 1 (idle -> running -> finished, real-time).
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'qa-screenshots', 'dialogues-race');
const LOG_PATH = path.join(__dirname, 'qa-dialogues-race-log.json');

function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
function loadDialogue(id) {
  const file = path.join(__dirname, 'src/data/block-dialogues', `${id}.json`);
  return JSON.parse(stripBOM(fs.readFileSync(file, 'utf8')));
}

const MOJIBAKE_RE = /Ã[\x80-\xBF]|â€[\x80-\x9F]|�/;

async function shotAndText(page, dir, name, findings, meta) {
  const shotPath = path.join(dir, `${name}.png`);
  await page.screenshot({ path: shotPath });
  const text = await page.locator('body').innerText();
  findings.push({
    ...meta,
    mojibake: MOJIBAKE_RE.test(text),
    textSnapshot: text.slice(0, 1000),
    screenshot: path.relative(__dirname, shotPath),
  });
  console.log(`  ${name}`);
}

async function walkDialogue(page, dialogueData, findings) {
  const dir = path.join(OUT_DIR, dialogueData.blockId);
  fs.mkdirSync(dir, { recursive: true });

  // ── Guided pass ────────────────────────────────────────────────────────
  await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const dialogueBtn = page.locator(`button:has-text("${dialogueData.title}")`).first();
  await dialogueBtn.click({ timeout: 5000 });
  await page.waitForTimeout(500);

  for (let i = 0; i < dialogueData.exchanges.length; i++) {
    const exchange = dialogueData.exchanges[i];
    await shotAndText(page, dir, `guided-ex${i + 1}-prompt`, findings, {
      blockId: dialogueData.blockId, mode: 'guided', exchangeIndex: i + 1, phase: 'prompt',
    });

    const correctChoice = exchange.choices.find((c) => c.isCorrect) ?? exchange.choices[0];
    await page.locator(`button:has-text("${correctChoice.text}")`).first().click({ timeout: 5000 });
    await page.waitForTimeout(400);

    await shotAndText(page, dir, `guided-ex${i + 1}-feedback`, findings, {
      blockId: dialogueData.blockId, mode: 'guided', exchangeIndex: i + 1, phase: 'feedback',
    });

    const continueBtn = page.getByRole('button', { name: /Continue|Try Again/ }).first();
    await continueBtn.click({ timeout: 5000 });
    await page.waitForTimeout(400);
  }

  // Guided completion / transition screen
  await shotAndText(page, dir, 'guided-complete', findings, {
    blockId: dialogueData.blockId, mode: 'guided', phase: 'complete',
  });
  await page.getByRole('button', { name: "Let's Go" }).click({ timeout: 5000 });
  await page.waitForTimeout(500);

  // ── Unguided pass ──────────────────────────────────────────────────────
  for (let i = 0; i < dialogueData.exchanges.length; i++) {
    const exchange = dialogueData.exchanges[i];
    await shotAndText(page, dir, `unguided-ex${i + 1}-prompt`, findings, {
      blockId: dialogueData.blockId, mode: 'unguided', exchangeIndex: i + 1, phase: 'prompt',
    });

    const correctChoice = exchange.choices.find((c) => c.isCorrect) ?? exchange.choices[0];
    await page.locator(`button:has-text("${correctChoice.text}")`).first().click({ timeout: 5000 });
    await page.waitForTimeout(400);

    await shotAndText(page, dir, `unguided-ex${i + 1}-feedback`, findings, {
      blockId: dialogueData.blockId, mode: 'unguided', exchangeIndex: i + 1, phase: 'feedback',
    });

    const continueBtn = page.getByRole('button', { name: /Continue|Try Again/ }).first();
    await continueBtn.click({ timeout: 5000 });
    await page.waitForTimeout(400);
  }

  // Final XP completion screen
  await shotAndText(page, dir, 'unguided-complete', findings, {
    blockId: dialogueData.blockId, mode: 'unguided', phase: 'complete',
  });
  await page.getByRole('button', { name: 'Continue' }).click({ timeout: 5000 });
  await page.waitForTimeout(500);
}

async function walkBlockRace(page, findings) {
  const dir = path.join(OUT_DIR, 'block-race-1');
  fs.mkdirSync(dir, { recursive: true });

  await page.goto('http://localhost:5173/#/race/survival/stage1-block1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shotAndText(page, dir, 'idle', findings, { section: 'block-race-1', phase: 'idle' });

  await page.getByRole('button', { name: 'Start Race!' }).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await shotAndText(page, dir, 'running-q1', findings, { section: 'block-race-1', phase: 'running', q: 1 });

  // Click through several questions (first choice each time) to sample content,
  // then let the real 60s timer run out for the finished screen.
  for (let q = 2; q <= 8; q++) {
    const choiceBtn = page.locator('button').filter({ hasText: /.+/ }).nth(0);
    try {
      // Choices are the buttons inside the grid; grab the first visible one.
      const choices = page.locator('div.grid.grid-cols-2 button');
      await choices.first().click({ timeout: 3000 });
    } catch (e) {
      console.log(`  (race click ${q} failed/finished early: ${e.message})`);
      break;
    }
    await page.waitForTimeout(900);
    await shotAndText(page, dir, `running-q${q}`, findings, { section: 'block-race-1', phase: 'running', q });
  }

  // Wait out the remaining real time for the race to finish naturally.
  console.log('  waiting for race timer to finish (real time)...');
  await page.waitForSelector('text=/Turbo Snail|Snail Pace/', { timeout: 75000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shotAndText(page, dir, 'finished', findings, { section: 'block-race-1', phase: 'finished' });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  await context.addInitScript(() => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
  });
  const page = await context.newPage();

  const findings = [];

  console.log('=== Block 1 Dialogue ===');
  const block1 = loadDialogue('block1-dialogue');
  await walkDialogue(page, block1, findings);

  console.log('=== Block 2 Dialogue ===');
  const block2 = loadDialogue('block2-dialogue');
  await walkDialogue(page, block2, findings);

  console.log('=== Block Race for Block 1 ===');
  await walkBlockRace(page, findings);

  fs.writeFileSync(LOG_PATH, JSON.stringify(findings, null, 2));
  console.log(`\nWrote ${findings.length} findings to ${LOG_PATH}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
