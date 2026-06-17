// Downscales all QA screenshots to fit under the chat viewer's image size
// limit (max dimension ~1900px) into a parallel "-review" tree, leaving the
// originals untouched for archival/full-res reference.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const MAX_DIM = 1900;

async function walk(srcRoot, dstRoot) {
  fs.mkdirSync(dstRoot, { recursive: true });
  for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    const srcPath = path.join(srcRoot, entry.name);
    const dstPath = path.join(dstRoot, entry.name);
    if (entry.isDirectory()) {
      await walk(srcPath, dstPath);
    } else if (entry.name.endsWith('.png')) {
      const meta = await sharp(srcPath).metadata();
      if (meta.height > MAX_DIM || meta.width > MAX_DIM) {
        await sharp(srcPath).resize({ height: MAX_DIM, withoutEnlargement: true }).toFile(dstPath);
      } else {
        fs.copyFileSync(srcPath, dstPath);
      }
    }
  }
}

async function main() {
  const root = path.join(__dirname, 'qa-screenshots');
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.endsWith('-review') || entry.name === 'contactsheets') continue;
    await walk(path.join(root, entry.name), path.join(root, `${entry.name}-review`));
  }
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
