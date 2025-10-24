#!/usr/bin/env node
/**
 * Post-build script to remove TypeScript's auto-generated `export {};`
 * from compiled JavaScript files. These are added when files contain
 * `import type` statements, but we want plain IIFE scripts, not modules.
 */

const fs = require('fs');
const path = require('path');

const distAssets = path.join(__dirname, '..', 'dist', 'assets');
const files = fs.readdirSync(distAssets).filter(f => f.endsWith('.js'));

let count = 0;
files.forEach(file => {
  const filePath = path.join(distAssets, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  
  // Remove standalone `export {};` lines (with optional whitespace/comments)
  content = content.replace(/\nexport\s*\{\s*\}\s*;\s*$/gm, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Stripped export from ${file}`);
    count++;
  }
});

console.log(`\nStripped exports from ${count} file(s)`);
