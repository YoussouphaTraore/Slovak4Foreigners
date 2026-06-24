#!/usr/bin/env node
/**
 * AGENT_QA file watcher.
 * Alerts the current agent whenever docs/AGENT_QA.md changes and has a new
 * addressed entry that may need action or a seen mark. Fires a Windows toast
 * + terminal notice.
 *
 * Usage:
 *   node scripts/watch-agent-qa.mjs --agent "Claude Code"
 *   node scripts/watch-agent-qa.mjs --agent "Codex"
 *   node scripts/watch-agent-qa.mjs --agent "GitHub Copilot"
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

// â”€â”€ Paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROOT       = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WATCH_FILE = path.join(ROOT, 'docs', 'AGENT_QA.md');
const STATE_DIR  = path.join(ROOT, '.agents');
const STATE_FILE = path.join(STATE_DIR, 'agent-qa-watch-state.json');

const DEBOUNCE_MS = 600;

// â”€â”€ CLI arg â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const flagIdx = process.argv.indexOf('--agent');
if (flagIdx === -1 || !process.argv[flagIdx + 1]) {
  console.error('Usage: node scripts/watch-agent-qa.mjs --agent "<Name>"');
  console.error('  Valid names: "Claude Code"  |  "Codex"  |  "GitHub Copilot"');
  process.exit(1);
}
const AGENT = process.argv[flagIdx + 1];

// â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { notified: [] }; }
}

function saveState(state) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// â”€â”€ Parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function entryHash(status, title, target) {
  return crypto.createHash('sha256').update(`${status}|${title}|${target}`).digest('hex').slice(0, 16);
}

function targetsAgent(targetStr, agent) {
  if (targetStr.trim().toLowerCase() === 'all') return true;
  return targetStr.split(/\s*\+\s*/).some(t => t.trim().toLowerCase() === agent.toLowerCase());
}

function parseWatchEntries(content) {
  const results = [];
  // Matches addressed entries such as:
  // ### [OPEN] [Sender -> Target] - date
  // ### [DONE] [Sender -> Target] - date
  // Also handles arrow/en dash variants found in older entries.
  const watchStatuses = 'OPEN|DONE|DONE[^\\]]*PENDING REVIEW|APPROVED|REJECTED|ANSWERED';
  const headerRe = new RegExp(`^### \\[(${watchStatuses})\\] \\[.+?(?:â†’|->|Ã¢â€ â€™)(.+?)\\]\\s*(?:â€”|-|Ã¢â‚¬â€)`, 'gm');
  let m;
  while ((m = headerRe.exec(content)) !== null) {
    const status = m[1].trim();
    const targetStr = m[2].trim();
    if (!targetsAgent(targetStr, AGENT)) continue;

    const rest = content.slice(m.index + m[0].length);
    const reMatch = rest.match(/\*\*Re:\*\*\s*(.+)/);
    const title = reMatch ? reMatch[1].trim() : '(untitled task)';

    results.push({ status, title, target: targetStr, hash: entryHash(status, title, targetStr) });
  }
  return results;
}

// â”€â”€ Toast (Windows, best-effort) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function sendToast(title, body) {
  // Pass title/body via env vars to avoid any escaping issues in the PS script
  const ps = `
try {
  [void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]
  $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(
    [Windows.UI.Notifications.ToastTemplateType]::ToastText02
  )
  $xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode($env:TOAST_TITLE)) | Out-Null
  $xml.GetElementsByTagName('text')[1].AppendChild($xml.CreateTextNode($env:TOAST_BODY))  | Out-Null
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AGENT_QA').Show(
    [Windows.UI.Notifications.ToastNotification]::new($xml)
  )
} catch {}
`;
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], {
    env: { ...process.env, TOAST_TITLE: title, TOAST_BODY: body },
    timeout: 8000,
    encoding: 'utf8',
  });
}

// â”€â”€ Main check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function check() {
  let content;
  try { content = fs.readFileSync(WATCH_FILE, 'utf8'); }
  catch (e) { console.error(`[AGENT_QA] Cannot read file: ${e.message}`); return; }

  const state   = loadState();
  const entries = parseWatchEntries(content);
  let changed   = false;

  for (const entry of entries) {
    if (state.notified.includes(entry.hash)) continue;

    console.log(`\nðŸ””  AGENT_QA [${entry.status}] for ${AGENT}`);
    console.log(`    Task   : ${entry.title}`);
    console.log(`    Target : ${entry.target}`);
    console.log(`    â†’ Open docs/AGENT_QA.md\n`);

    sendToast(`AGENT_QA [${entry.status}] â†’ ${AGENT}`, entry.title);

    state.notified.push(entry.hash);
    changed = true;
  }

  if (changed) saveState(state);
}

// â”€â”€ Watcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let debounceTimer = null;

function onChanged() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(check, DEBOUNCE_MS);
}

console.log(`[AGENT_QA Watcher] Agent : ${AGENT}`);
console.log(`[AGENT_QA Watcher] File  : ${WATCH_FILE}`);
console.log(`[AGENT_QA Watcher] State : ${STATE_FILE}`);
console.log(`[AGENT_QA Watcher] Ready â€” Ctrl+C to stop.\n`);

check(); // scan immediately on startup

// fs.watchFile uses stat-based polling â€” reliable on Windows where atomic saves
// (write-to-temp â†’ rename) fire a 'rename' event that fs.watch silently drops.
fs.watchFile(WATCH_FILE, { persistent: true, interval: 300 }, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs) onChanged();
});
