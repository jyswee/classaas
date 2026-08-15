#!/usr/bin/env node
/**
 * Build script - obfuscates src/ into dist/ with strong protection.
 * Pattern: bgz-cli build (javascript-obfuscator)
 */
const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Every .js under src/ gets obfuscated. Walk the directory so the build cannot
// drift from reality: a hand-typed file list silently falls behind when a new
// command is added and ships to npm with no dist/ counterpart (crashes with
// MODULE_NOT_FOUND for every user, while working here because a dev tree still
// has src/).
const srcRoot = path.join(__dirname, '..', 'src');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [path.relative(srcRoot, full)] : [];
  });
}

const files = walk(srcRoot).sort();

// Ensure dist directories exist (mirror every subdirectory found under src/).
const distDir = path.join(__dirname, '..', 'dist');
for (const file of files) {
  const outDir = path.dirname(path.join(distDir, file));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
}

const flags = [
  '--compact true',
  '--control-flow-flattening true',
  '--control-flow-flattening-threshold 0.75',
  '--dead-code-injection true',
  '--dead-code-injection-threshold 0.4',
  '--string-array true',
  '--string-array-encoding rc4',
  '--string-array-threshold 1',
  '--string-array-rotate true',
  '--string-array-shuffle true',
  '--string-array-wrappers-count 2',
  '--string-array-wrappers-type function',
  '--rename-globals true',
  '--rename-properties false',
  '--self-defending false',
  '--identifier-names-generator hexadecimal',
  '--numbers-to-expressions true',
  '--simplify true',
  '--split-strings true',
  '--split-strings-chunk-length 5',
  '--transform-object-keys true',
  '--unicode-escape-sequence true',
  '--target node',
].join(' ');

console.log('Building caas CLI...');
for (const file of files) {
  const src = path.join(srcRoot, file);
  const out = path.join(distDir, file);
  console.log(`  Obfuscating ${file}...`);
  execSync(`javascript-obfuscator ${src} --output ${out} ${flags}`, { stdio: 'inherit' });
}

// Prove the artifact loads. Obfuscation succeeding says nothing about whether
// dist/ can actually be required, and a dev tree hides the answer because src/
// is still there to fall back on. Load every built module in a child process
// with no src/ available to rescue it.
console.log('Verifying dist/ loads...');
for (const file of files) {
  if (file === 'main.js') continue; // requiring main runs the CLI
  const out = path.join(distDir, file);
  try {
    execFileSync(process.execPath, ['-e', `require(${JSON.stringify(out)})`], { stdio: 'pipe' });
  } catch (err) {
    console.error(`\nBUILD FAILED: dist/${file} does not load\n${err.stderr}`);
    process.exit(1);
  }
}

console.log(`Build complete. ${files.length} files.`);
