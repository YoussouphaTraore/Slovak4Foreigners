type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALLED_KEY   = 'install_prompt_installed';
const LAST_SHOWN_KEY  = 'install_prompt_last_shown';
const COOLDOWN_MS     = 10_000; // 10 seconds (testing) — change back to 24 * 60 * 60 * 1000

let deferredPrompt: DeferredPrompt | null = null;

export function setDeferredPrompt(e: Event) {
  deferredPrompt = e as DeferredPrompt;
  window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
}

export function canInstall(): boolean {
  if (!deferredPrompt) return false;
  try {
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return false;
    if (window.matchMedia('(display-mode: standalone)').matches) return false;
  } catch { /* */ }
  return true;
}

export function shouldAutoShow(): boolean {
  if (!canInstall()) return false;
  try {
    const last = Number(localStorage.getItem(LAST_SHOWN_KEY) ?? '0');
    return Date.now() - last >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markShown() {
  try { localStorage.setItem(LAST_SHOWN_KEY, String(Date.now())); } catch { /* */ }
}

export function markInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch { /* */ }
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const p = deferredPrompt;
  deferredPrompt = null;
  await p.prompt();
  const { outcome } = await p.userChoice;
  return outcome;
}
