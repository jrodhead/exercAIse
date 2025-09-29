#!/usr/bin/env node
/**
 * Build a local manifest of performed logs for the History view.
 * Outputs performed/index.json with an array of files or an object with metadata.
 */
const fs = require('fs');
const path = require('path');

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const performedDir = path.join(repoRoot, 'performed');
  const outPath = path.join(performedDir, 'index.json');
  if (!fs.existsSync(performedDir)) {
    console.error('No performed/ directory found at', performedDir);
    process.exit(1);
  }
  const entries = fs.readdirSync(performedDir);
  const files = [];
  for (const name of entries) {
    // Skip manifest itself and dotfiles
    if (name === 'index.json' || name.startsWith('.')) continue;
    const p = path.join(performedDir, name);
    try {
      const st = fs.statSync(p);
      if (!st.isFile()) continue;
      files.push({ name, path: `performed/${name}`, size: st.size, mtimeMs: st.mtimeMs });
    } catch (_) {}
  }
  files.sort((a, b) => {
    if (a.mtimeMs !== b.mtimeMs) return b.mtimeMs - a.mtimeMs;
    return a.name < b.name ? 1 : -1;
  });
  const out = { generatedAt: new Date().toISOString(), files };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Wrote', outPath, 'with', files.length, 'entries');
}

main();
