import { test, expect } from '@playwright/test';

// Sanity check that Playwright can drive the app the same way the user does
// locally: dev server + HashRouter + the automatic `import.meta.env.DEV`
// bypass (no query params, no stored flags, no login needed).

test('home page loads and the dev bypass unlocks a lesson', async ({ page }) => {
  // Pre-accept the GDPR consent popup (ConsentPopup.tsx) the same way a
  // returning user's browser would have it already accepted. Without this,
  // the popup's capture-phase listener swallows the very first click on the
  // page — including our lesson-card click — and shows the modal instead.
  // For guests, shouldShow() also re-prompts every 24h via `lastConsentShown`,
  // so that has to be seeded too or it overrides `consentAccepted`.
  await page.addInitScript(() => {
    localStorage.setItem('consentAccepted', 'true');
    localStorage.setItem('consentVersion', '1.0');
    localStorage.setItem('lastConsentShown', String(Date.now()));
  });

  await page.goto('/#/');

  // BottomNav is always present once HomePage has rendered.
  await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();

  // First lesson card (id: s1-first-words). Its accessible title is the
  // lesson title only when unlocked — under the dev bypass it always is.
  const firstLessonNode = page.locator('button[title="First Words"]');
  await expect(firstLessonNode).toBeVisible();
  await firstLessonNode.click();

  // Should now be on the lesson page (HashRouter: /#/lesson/s1-first-words).
  await expect(page).toHaveURL(/#\/lesson\/s1-first-words/);

  // LessonPage chrome: exit button + progress bar confirm the page rendered,
  // not just an empty shell.
  await expect(page.getByRole('button', { name: '✕' })).toBeVisible();

  // First exercise in s1-first-words.json is LISTEN_AND_PICK with an English
  // option "Thank you" — confirms actual exercise content rendered.
  await expect(page.getByText('Thank you')).toBeVisible();
});
