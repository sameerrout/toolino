/**
 * Bundle budget check.
 *
 * Run with:  node scripts/check-bundle-size.mjs
 *
 * Enforces the performance requirement that the homepage must ship under 150 KB
 * of gzipped JavaScript. Works on both Next.js server builds (.next) and static export (out).
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'out');
const NEXT_DIR = join(ROOT, '.next');

/** Budget for the JavaScript the homepage loads before it is interactive. */
const INITIAL_JS_BUDGET_KB = 150;

let htmlPath = null;
let staticBase = null;

if (existsSync(join(OUT_DIR, 'index.html'))) {
  htmlPath = join(OUT_DIR, 'index.html');
  staticBase = OUT_DIR;
} else if (existsSync(join(NEXT_DIR, 'server', 'app', 'index.html'))) {
  htmlPath = join(NEXT_DIR, 'server', 'app', 'index.html');
  staticBase = NEXT_DIR;
} else {
  console.warn('check-bundle-size: neither out/ nor .next/ build outputs found. Run `npm run build` first.');
  process.exit(0);
}

const html = readFileSync(htmlPath, 'utf8');

/** Every script file the homepage pulls in. */
function collectScriptSources(source) {
  const found = new Set();

  // <script src="..."> (ignoring nomodule scripts that modern browsers do not download)
  for (const match of source.matchAll(/<script\b(?![^>]*\bnomodule\b)[^>]*\bsrc="([^"]+)"/gi)) {
    if (match[1]) found.add(match[1]);
  }
  // <link rel="preload" as="script" href="...">
  for (const match of source.matchAll(
    /<link[^>]+rel="preload"[^>]+as="script"[^>]+href="([^"]+)"/g
  )) {
    if (match[1]) found.add(match[1]);
  }
  // <link rel="modulepreload" href="...">
  for (const match of source.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)) {
    if (match[1]) found.add(match[1]);
  }

  return [...found];
}

const sources = collectScriptSources(html).filter((src) => src.startsWith('/'));

if (sources.length === 0) {
  console.warn('check-bundle-size: found no local scripts in index.html.');
  process.exit(0);
}

let rawTotal = 0;
let gzipTotal = 0;
const rows = [];

for (const source of sources) {
  const cleanPath = source.replace(/^\//, '').split('?')[0];
  let filePath = join(staticBase, cleanPath);
  if (!existsSync(filePath) && cleanPath.startsWith('_next/')) {
    filePath = join(NEXT_DIR, cleanPath.replace(/^_next\//, ''));
  }
  if (!existsSync(filePath)) continue;

  const stat = statSync(filePath);
  if (!stat.isFile()) continue;

  const contents = readFileSync(filePath);
  const gzipped = gzipSync(contents, { level: 9 }).length;

  rawTotal += contents.length;
  gzipTotal += gzipped;
  rows.push({
    file: source,
    rawKb: contents.length / 1024,
    gzipKb: gzipped / 1024,
  });
}

rows.sort((a, b) => b.gzipKb - a.gzipKb);

console.log('check-bundle-size: initial JavaScript on the homepage\n');
for (const r of rows) {
  console.log(
    `  ${r.gzipKb.toFixed(1).padStart(6, ' ')} KB gzip` +
      `  ${r.rawKb.toFixed(1).padStart(6, ' ')} KB raw` +
      `   ${r.file}`
  );
}

const rawTotalKb = (rawTotal / 1024).toFixed(1);
const gzipTotalKb = (gzipTotal / 1024).toFixed(1);

console.log('\n  files      :', rows.length);
console.log('  raw total  :', rawTotalKb, 'KB');
console.log('  gzip total :', gzipTotalKb, 'KB');
console.log('  budget     :', INITIAL_JS_BUDGET_KB, 'KB\n');

if (gzipTotal / 1024 > INITIAL_JS_BUDGET_KB) {
  const overage = (gzipTotal / 1024 - INITIAL_JS_BUDGET_KB).toFixed(1);
  console.error(
    `check-bundle-size: FAILED - homepage exceeds initial JS budget by ${overage} KB.`
  );
  process.exit(1);
}

const headroom = (INITIAL_JS_BUDGET_KB - gzipTotal / 1024).toFixed(1);
console.log(`check-bundle-size: PASSED - ${gzipTotalKb} KB of ${INITIAL_JS_BUDGET_KB} KB used (${headroom} KB of headroom).\n`);
