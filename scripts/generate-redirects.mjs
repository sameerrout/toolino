/**
 * Generates static redirect stubs for the legacy and alias URLs.
 *
 * Run with:  node scripts/generate-redirects.mjs   (also runs on `prebuild`)
 *
 * S3 cannot issue a 301 on its own, and CloudFront key-value stores are an extra
 * cost, so the cheapest correct approach for a static export is a tiny HTML file
 * per legacy path containing a canonical link, a meta refresh and a JavaScript
 * fallback, written to `public/<path>/index.html`.
 *
 * Google treats a page carrying `<link rel="canonical">` plus a meta refresh as a
 * permanent redirect signal. `deploy/cloudfront/README.md` documents how to
 * switch these to true CloudFront Function 301s if you prefer.
 *
 * The redirect map is derived from the tool registry's `legacyPaths`, so there is
 * one source of truth and a new alias cannot be forgotten.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const MANIFEST_PATH = join(PUBLIC_DIR, '_redirects.json');
const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const SITE_URL = (
  envUrl &&
  !envUrl.includes('toolino') &&
  !envUrl.includes('vercel.app') &&
  !envUrl.includes('toolnova') &&
  !envUrl.includes('localhost') &&
  !envUrl.includes('127.0.0.1')
    ? envUrl
    : 'https://www.toolforforever.com'
).replace(/\/+$/, '');

/**
 * Legacy paths that belong to the site rather than to a single tool: removed
 * features and retired sections.
 */
const SITE_REDIRECTS = [
  // PDF Summarizer was removed entirely; its addresses go to the PDF hub.
  { from: '/pdf-summarizer', to: '/tools/pdf-tools/' },
  { from: '/pdf-analyser', to: '/tools/pdf-tools/' },
  { from: '/pdf-analyzer', to: '/tools/pdf-tools/' },
  { from: '/summarize-pdf', to: '/tools/pdf-tools/' },
  // PDF to PowerPoint was removed; see README for how to restore it.
  { from: '/pdf-to-powerpoint', to: '/tools/pdf-tools/' },
  { from: '/pdf-to-pptx', to: '/tools/pdf-tools/' },
  { from: '/pdf2pptx', to: '/tools/pdf-tools/' },
  { from: '/pdf-to-word', to: '/tools/pdf-tools/' },
  { from: '/pdf-to-docx', to: '/tools/pdf-tools/' },
  // Removed tools: PDF Edit & PIN Code Lookup
  { from: '/edit-pdf', to: '/tools/pdf-tools/' },
  { from: '/pdf-editor', to: '/tools/pdf-tools/' },
  { from: '/editor-pdf', to: '/tools/pdf-tools/' },
  { from: '/tools/edit-pdf', to: '/tools/pdf-tools/' },
  { from: '/annotate-pdf', to: '/tools/pdf-tools/' },
  { from: '/write-on-pdf', to: '/tools/pdf-tools/' },
  { from: '/pin-code-lookup', to: '/tools/text-tools/' },
  { from: '/pincode-lookup', to: '/tools/text-tools/' },
  { from: '/pincode-finder', to: '/tools/text-tools/' },
  { from: '/india-pincode', to: '/tools/text-tools/' },
  { from: '/tools/pin-code-lookup', to: '/tools/text-tools/' },
  // Retired hub URLs folded into the new five-hub structure.
  { from: '/dashboard', to: '/' },
  { from: '/download', to: '/' },
  { from: '/document-tools', to: '/tools/pdf-tools/' },
  { from: '/utility-tools', to: '/tools/calculators/' },
  { from: '/qr-tools', to: '/tools/qr-code-generator/' },
  { from: '/guides', to: '/blog/' },
];

/**
 * Extracts `slug` + `legacyPaths` from the TypeScript registry without a TS
 * runtime. The registry is plain data, and
 * `tests/seo/registry.test.ts` asserts that this extraction matches the real
 * registry, so a drift fails the test suite rather than shipping a dead alias.
 */
function readRegistry() {
  const source = readFileSync(join(ROOT, 'src', 'data', 'toolRegistry.ts'), 'utf8');
  const blocks = source.split(/\n  \{\n/).slice(1);
  const entries = [];

  for (const block of blocks) {
    const slugMatch = /slug:\s*'([^']+)'/.exec(block);
    if (!slugMatch?.[1]) continue;

    const legacyMatch = /legacyPaths:\s*\[([^\]]*)\]/.exec(block);
    const legacyPaths = legacyMatch?.[1]
      ? [...legacyMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
      : [];

    entries.push({ slug: slugMatch[1], legacyPaths });
  }

  return entries;
}

/** The redirect stub: canonical + meta refresh + JS fallback, nothing else. */
function redirectHtml(target) {
  const absolute = `${SITE_URL}${target}`;
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Redirecting to ${target}</title>
<link rel="canonical" href="${absolute}">
<meta name="robots" content="noindex, follow">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
</head>
<body>
<p>This page has moved to <a href="${target}">${target}</a>.</p>
</body>
</html>
`;
}

// --------------------------------------------------------------------- main

const registry = readRegistry();

if (registry.length === 0) {
  throw new Error(
    'generate-redirects: could not parse any tools out of src/data/toolRegistry.ts. Refusing to write an empty redirect set.'
  );
}

const toolRedirects = registry.flatMap((tool) =>
  tool.legacyPaths.map((from) => ({ from, to: `/tools/${tool.slug}/` }))
);

const all = [...toolRedirects, ...SITE_REDIRECTS];

// A path claimed by two different targets would produce two files where one wins
// arbitrarily, so fail loudly instead.
const resolved = new Map();
for (const entry of all) {
  const existing = resolved.get(entry.from);
  if (existing && existing !== entry.to) {
    throw new Error(
      `generate-redirects: "${entry.from}" is claimed by both "${existing}" and "${entry.to}".`
    );
  }
  resolved.set(entry.from, entry.to);
}

const manifest = [];
for (const [from, to] of resolved) {
  const target = join(PUBLIC_DIR, from.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, redirectHtml(to), 'utf8');
  manifest.push({ from, to, status: 301 });
}

writeFileSync(
  MANIFEST_PATH,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), redirects: manifest }, null, 2)}\n`,
  'utf8'
);

console.log(`generate-redirects: wrote ${manifest.length} permanent redirect stubs`);
console.log('generate-redirects: manifest at public/_redirects.json');
console.log('generate-redirects: see deploy/cloudfront/README.md to serve these as true 301s');
