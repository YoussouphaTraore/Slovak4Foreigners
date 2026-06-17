// Tiles per-exercise screenshots into one contact-sheet image per lesson
// (and per dialogue/race section) so they can be reviewed a few images at a
// time instead of one Read call per screenshot.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TILE_W = 280;
const COLS = 4;
const LABEL_H = 22;
const PAD = 6;

async function makeSheet(dir, outPath, label) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (files.length === 0) return;

  const tiles = [];
  for (const f of files) {
    const buf = await sharp(path.join(dir, f)).resize({ width: TILE_W }).toBuffer();
    const meta = await sharp(buf).metadata();
    tiles.push({ name: f.replace('.png', ''), buf, w: meta.width, h: meta.height });
  }

  const tileH = Math.max(...tiles.map((t) => t.h)) + LABEL_H;
  const rows = Math.ceil(tiles.length / COLS);
  const sheetW = COLS * (TILE_W + PAD) + PAD;
  const sheetH = rows * (tileH + PAD) + PAD + 30;

  const composite = [];
  const svgLabels = [];

  tiles.forEach((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (TILE_W + PAD);
    const y = PAD + 30 + row * (tileH + PAD);
    composite.push({ input: t.buf, left: x, top: y + LABEL_H });
    svgLabels.push(
      `<text x="${x}" y="${y + 14}" font-size="13" font-family="monospace" fill="#000">${t.name}</text>`
    );
  });

  const svg = `<svg width="${sheetW}" height="${sheetH}">
    <rect width="100%" height="100%" fill="white"/>
    <text x="${PAD}" y="20" font-size="16" font-family="sans-serif" font-weight="bold" fill="#222">${label}</text>
    ${svgLabels.join('\n')}
  </svg>`;

  const base = sharp({ create: { width: sheetW, height: sheetH, channels: 3, background: 'white' } });
  await base
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }, ...composite])
    .png()
    .toFile(outPath);
  console.log(`wrote ${outPath} (${tiles.length} tiles)`);
}

async function main() {
  const lessonsRoot = path.join(__dirname, 'qa-screenshots', 'lessons');
  const sheetsDir = path.join(__dirname, 'qa-screenshots', 'contactsheets');
  fs.mkdirSync(sheetsDir, { recursive: true });

  if (fs.existsSync(lessonsRoot)) {
    for (const lessonId of fs.readdirSync(lessonsRoot)) {
      const dir = path.join(lessonsRoot, lessonId);
      if (!fs.statSync(dir).isDirectory()) continue;
      await makeSheet(dir, path.join(sheetsDir, `${lessonId}.png`), lessonId);
    }
  }

  const drRoot = path.join(__dirname, 'qa-screenshots', 'dialogues-race');
  if (fs.existsSync(drRoot)) {
    for (const sub of fs.readdirSync(drRoot)) {
      const dir = path.join(drRoot, sub);
      if (!fs.statSync(dir).isDirectory()) continue;
      await makeSheet(dir, path.join(sheetsDir, `${sub}.png`), sub);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
