#!/usr/bin/env node
/**
 * AGENT_QA file watcher.
 * Alerts the current agent whenever docs/AGENT_QA.md changes and has a new
 * [OPEN] entry addressed to them. Fires a Windows toast + terminal notice.
 *
 * Usage:
 *   node scripts/watch-agent-qa.mjs --agent "Claude Code"
 *   node scripts/watch-agent-qa.mjs --agent "Codex"
 *   node scripts/watch-agent-qa.mjs --agent "Copilot Studio"
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

// ── Paths ─────────────────────────────────────────────────────────────────────

const ROOT       = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WATCH_FILE = path.join(ROOT, 'docs', 'AGENT_QA.md');
const STATE_DIR  = path.join(ROOT, '.agents');
const STATE_FILE = path.join(STATE_DIR, 'agent-qa-watch-state.json');

const DEBOUNCE_MS = 600;

// ── CLI arg ───────────────────────────────────────────────────────────────────

const flagIdx = process.argv.indexOf('--agent');
if (flagIdx === -1 || !process.argv[flagIdx + 1]) {
  console.error('Usage: node scripts/watch-agent-qa.mjs --agent "<Name>"');
  console.error('  Valid names: "Claude Code"  |  "Codex"  |  "Copilot Studio"');
  process.exit(1);
}
const AGENT = process.argv[flagIdx + 1];

// ── State ─────────────────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return { notified: [] }; }
}

function saveState(state) {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function entryHash(title, target) {
  return crypto.createHash('sha256').update(`${title}|${target}`).digest('hex').slice(0, 16);
}

function targetsAgent(targetStr, agent) {
  if (targetStr.trim().toLowerCase() === 'all') return true;
  return targetStr.split(/\s*\+\s*/).some(t => t.trim().toLowerCase() === agent.toLowerCase());
}

function parseOpenEntries(content) {
  const results = [];
  // Matches: ### [OPEN] [Sender → Target] — date   (→ or ->)
  const headerRe = /^### \[OPEN\] \[.+?(?:→|->)(.+?)\] —/gm;
  let m;
  while ((m = headerRe.exec(content)) !== null) {
    const targetStr = m[1].trim();
    if (!targetsAgent(targetStr, AGENT)) continue;

    const rest = content.slice(m.index + m[0].length);
    const reMatch = rest.match(/\*\*Re:\*\*\s*(.+)/);
    const title = reMatch ? reMatch[1].trim() : '(untitled task)';

    results.push({ title, target: targetStr, hash: entryHash(title, targetStr) });
  }
  return results;
}

// ── Toast (Windows, best-effort) ─────────────────────────────────────────────

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

// ── Main check ────────────────────────────────────────────────────────────────

function check() {
  let content;
  try { content = fs.readFileSync(WATCH_FILE, 'utf8'); }
  catch (e) { console.error(`[AGENT_QA] Cannot read file: ${e.message}`); return; }

  const state   = loadState();
  const entries = parseOpenEntries(content);
  let changed   = false;

  for (const entry of entries) {
    if (state.notified.includes(entry.hash)) continue;

    console.log(`\n🔔  AGENT_QA [OPEN] for ${AGENT}`);
    console.log(`    Task   : ${entry.title}`);
    console.log(`    Target : ${entry.target}`);
    console.log(`    → Open docs/AGENT_QA.md\n`);

    sendToast(`AGENT_QA → ${AGENT}`, entry.title);

    state.notified.push(entry.hash);
    changed = true;
  }

  if (changed) saveState(state);
}

// ── Watcher ───────────────────────────────────────────────────────────────────

let debounceTimer = null;

function onChanged() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(check, DEBOUNCE_MS);
}

console.log(`[AGENT_QA Watcher] Agent : ${AGENT}`);
console.log(`[AGENT_QA Watcher] File  : ${WATCH_FILE}`);
console.log(`[AGENT_QA Watcher] State : ${STATE_FILE}`);
console.log(`[AGENT_QA Watcher] Ready — Ctrl+C to stop.\n`);

check(); // scan immediately on startup

// fs.watchFile uses stat-based polling — reliable on Windows where atomic saves
// (write-to-temp → rename) fire a 'rename' event that fs.watch silently drops.
fs.watchFile(WATCH_FILE, { persistent: true, interval: 300 }, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs) onChanged();
});
