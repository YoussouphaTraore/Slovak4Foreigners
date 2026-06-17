// QA walker: jumps to every exercise in a list of lessons using the DEV jump
// bar (LessonPage.tsx, import.meta.env.DEV block) instead of simulating real
// gameplay. This avoids retry-queue loops entirely and gives a clean initial
// render of every exercise for content/UI review.
const { chromium, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const DEFAULT_LESSONS = [
  's1-first-words',
  's1-verbs',
  's1-greetings',
  's1-how-are-you',
  's1-dont-understand',
  's1-who-i-am',
  's1-describing-yourself',
  's1-body-parts',
  's1-colors',
  's1-family',
  's1-cardinal-numbers',
  's1-food',
];

// Usage: node qa-walk-lessons.cjs [scopeName lessonId1 lessonId2 ...]
// With no args, runs the original 12-lesson pass. With args, scopes the
// output to its own subfolder/log so it doesn't clobber prior results.
const argv = process.argv.slice(2);
const scopeName = argv.length > 0 ? argv[0] : null;
const LESSONS = argv.length > 1 ? argv.slice(1) : DEFAULT_LESSONS;

const OUT_DIR = path.join(__dirname, 'qa-screenshots', scopeName ? `lessons-${scopeName}` : 'lessons');
const LOG_PATH = path.join(__dirname, scopeName ? `qa-lessons-${scopeName}-log.json` : 'qa-lessons-log.json');

function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
function loadLesson(id) {
  const file = path.join(__dirname, 'src/data/lessons', `${id}.json`);
  return JSON.parse(stripBOM(fs.readFileSync(file, 'utf8')));
}

// Crude mojibake heuristic: double-encoded UTF-8 markers or the replacement char.
const MOJIBAKE_RE = /Ã[\x80-\xBF]|â€[\x80-\x9F]|�/;
const SUSPECT_RE = /\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b/;

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
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push({ where: 'pageerror', message: String(err) }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ where: 'console.error', message: msg.text() });
  });

  const findings = [];

  for (const lessonId of LESSONS) {
    const lesson = loadLesson(lessonId);
    const exCount = lesson.exercises.length;
    const lessonDir = path.join(OUT_DIR, lessonId);
    fs.mkdirSync(lessonDir, { recursive: true });

    console.log(`\n=== ${lessonId} (${lesson.title}) — ${exCount} exercises ===`);
    // Route through Home first. LessonPage never remounts on a bare :lessonId
    // param change (no key tied to it), which crashes React ("Rendered fewer
    // hooks than expected") if you jump from one /lesson/:id straight to a
    // different one. Going through Home (a different route/component) forces
    // a real unmount+remount, same as real in-app navigation always does.
    await page.goto('http://localhost:5173/#/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    await page.goto(`http://localhost:5173/#/lesson/${lessonId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    for (let i = 0; i < exCount; i++) {
      const ex = lesson.exercises[i];
      const errCountBefore = consoleErrors.length;

      const jumpBtn = page.getByRole('button', { name: String(i + 1), exact: true });
      try {
        await jumpBtn.click({ timeout: 5000 });
      } catch (e) {
        findings.push({ lessonId, exerciseIndex: i + 1, type: ex.type, error: `jump button click failed: ${e.message}` });
        continue;
      }
      await page.waitForTimeout(450);

      const bodyText = await page.locator('body').innerText();
      const shotPath = path.join(lessonDir, `ex${String(i + 1).padStart(2, '0')}-${ex.type}.png`);
      await page.screenshot({ path: shotPath });

      const newErrors = consoleErrors.slice(errCountBefore);

      findings.push({
        lessonId,
        lessonTitle: lesson.title,
        exerciseIndex: i + 1,
        type: ex.type,
        mojibake: MOJIBAKE_RE.test(bodyText),
        suspectToken: SUSPECT_RE.test(bodyText),
        consoleErrors: newErrors,
        textSnapshot: bodyText.slice(0, 1200),
        screenshot: path.relative(__dirname, shotPath),
      });

      console.log(`  ex${i + 1} [${ex.type}] -> ${path.basename(shotPath)}${newErrors.length ? '  !! console errors' : ''}`);
    }
  }

  fs.writeFileSync(LOG_PATH, JSON.stringify(findings, null, 2));
  console.log(`\nWrote ${findings.length} findings to ${LOG_PATH}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
