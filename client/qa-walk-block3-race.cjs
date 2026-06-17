// QA walker for the Block Race for Block 3 (Numbers & Time). No Block 3
// dialogue exists yet (only block1-dialogue.json / block2-dialogue.json),
// so this only covers the race.
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'qa-screenshots', 'dialogues-race-block3');
const LOG_PATH = path.join(__dirname, 'qa-block3-race-log.json');

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
  const dir = path.join(OUT_DIR, 'block-race-3');
  fs.mkdirSync(dir, { recursive: true });

  console.log('=== Block Race for Block 3 ===');
  await page.goto('http://localhost:5173/#/race/survival/stage1-block3', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shotAndText(page, dir, 'idle', findings, { section: 'block-race-3', phase: 'idle' });

  await page.getByRole('button', { name: 'Start Race!' }).click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await shotAndText(page, dir, 'running-q1', findings, { section: 'block-race-3', phase: 'running', q: 1 });

  for (let q = 2; q <= 10; q++) {
    try {
      const choices = page.locator('div.grid.grid-cols-2 button');
      await choices.first().click({ timeout: 3000 });
    } catch (e) {
      console.log(`  (race click ${q} failed/finished early: ${e.message})`);
      break;
    }
    await page.waitForTimeout(900);
    await shotAndText(page, dir, `running-q${q}`, findings, { section: 'block-race-3', phase: 'running', q });
  }

  console.log('  waiting for race timer to finish (real time)...');
  await page.waitForSelector('text=/Turbo Snail|Snail Pace/', { timeout: 75000 }).catch(() => {});
  await page.waitForTimeout(500);
  await shotAndText(page, dir, 'finished', findings, { section: 'block-race-3', phase: 'finished' });

  fs.writeFileSync(LOG_PATH, JSON.stringify(findings, null, 2));
  console.log(`\nWrote ${findings.length} findings to ${LOG_PATH}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
