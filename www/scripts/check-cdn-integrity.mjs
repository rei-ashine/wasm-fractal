// Checks that every file index.html loads with an integrity hash (Subresource Integrity) is
// served by its CDN with that hash. A file that differs would be refused by the browser, and
// the site would lose its styles or its formulas.
// Run with: node scripts/check-cdn-integrity.mjs
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const tags = html.match(/<(?:script|link)\b[^>]*\bintegrity="[^"]+"[^>]*>/g) ?? [];
if (tags.length === 0) throw new Error('No tag with an integrity hash in index.html');

let failed = false;
for (const tag of tags) {
  const url = tag.match(/\b(?:src|href)="([^"]+)"/)[1];
  const integrity = tag.match(/\bintegrity="([^"]+)"/)[1];
  const [algorithm, expected] = integrity.split('-', 2);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const actual = createHash(algorithm).update(Buffer.from(await response.arrayBuffer())).digest('base64');
  const ok = actual === expected;
  // The browser refuses a cross-origin file with an integrity hash unless it is fetched with CORS
  const cors = /\bcrossorigin\b/.test(tag);
  console.log(`${ok && cors ? 'ok  ' : 'FAIL'} ${url}${ok ? '' : ` (served ${algorithm}-${actual})`}${cors ? '' : ' (no crossorigin)'}`);
  if (!ok || !cors) failed = true;
}
if (failed) process.exit(1);
