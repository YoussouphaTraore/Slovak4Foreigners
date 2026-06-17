import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    // The app is mobile-only: App.tsx renders <DesktopBlock /> instead of the
    // real app for any viewport wider than 768px or a non-mobile user agent
    // (src/components/DesktopBlock.tsx). Emulating a real phone here is what
    // makes the actual app render at all, not just a side effect of "looking
    // realistic". Pixel 7 (not iPhone 13) because it's Chromium-based — we
    // only installed the chromium browser binary, not webkit.
    ...devices['Pixel 7'],
  },
  // Reuses an already-running `npm run dev` if one is up; otherwise starts one.
  // Vite dev mode is what makes `import.meta.env.DEV` (the app's dev bypass) true.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
