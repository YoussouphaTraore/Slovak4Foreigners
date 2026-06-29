type DeferredPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALLED_KEY     = 'install_prompt_installed';
const LAST_SHOWN_KEY    = 'install_prompt_last_shown';
const DISMISS_COUNT_KEY = 'install_prompt_dismiss_count';

const COOLDOWN_FIRST_MS  = 24 * 60 * 60 * 1000;       // 24 hours after first dismiss
const COOLDOWN_REPEAT_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days after second+ dismiss

let deferredPrompt: DeferredPrompt | null = null;

function getDismissCount(): number {
  try { return Number(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0'); } catch { return 0; }
}

function getCooldown(): number {
  const count = getDismissCount();
  if (count === 0) return 0;                    // never dismissed — no cooldown
  if (count === 1) return COOLDOWN_FIRST_MS;
  return COOLDOWN_REPEAT_MS;
}

export function isIOS(): boolean {
  return /iP(ad|hone|od)/.test(navigator.userAgent);
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
    window.matchMedia('(max-width: 768px)').matches;
}

export function isInStandaloneMode(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return ('standalone' in navigator) && (navigator as { standalone?: boolean }).standalone === true;
}

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
    if (isInStandaloneMode()) return false;
  } catch { /* */ }
  return true;
}

export function shouldAutoShow(): boolean {
  if (!canInstall()) return false;
  if (!isMobileDevice()) return false;
  try {
    const last = Number(localStorage.getItem(LAST_SHOWN_KEY) ?? '0');
    return Date.now() - last >= getCooldown();
  } catch { return true; }
}

export function shouldShowIOSPrompt(): boolean {
  if (!isIOS() || isInStandaloneMode()) return false;
  if (!isMobileDevice()) return false;
  try {
    if (localStorage.getItem(INSTALLED_KEY) === 'true') return false;
    const last = Number(localStorage.getItem(LAST_SHOWN_KEY) ?? '0');
    return Date.now() - last >= getCooldown();
  } catch { return true; }
}

export function markDismissed() {
  try {
    const count = getDismissCount() + 1;
    localStorage.setItem(DISMISS_COUNT_KEY, String(count));
    localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
  } catch { /* */ }
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
