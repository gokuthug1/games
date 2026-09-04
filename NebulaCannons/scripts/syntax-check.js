#!/usr/bin/env node
/**
 * syntax-check — runs `node --check` on every .js file in js/ so module
 * syntax errors are caught without needing a browser.
 *
 * Usage: node scripts/syntax-check.js
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const jsDir = join(root, 'js');

function collect(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collect(full));
    } else if (entry.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const files = collect(jsDir);
let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`ok   ${relative(root, file)}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${relative(root, file)}`);
    console.error(String(err.stderr || err.message).trim());
  }
}

console.log(`\n${files.length - failed}/${files.length} files passed syntax check.`);
if (failed > 0) process.exit(1);
