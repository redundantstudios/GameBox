#!/usr/bin/env node
/**
 * Syntax gate for the games' inline scripts.
 *
 * Every game is one self-contained HTML file with inline <script> blocks, so a
 * typo would only show up as a dead game on the device. This extracts each
 * inline block and parses it, without executing anything.
 *
 *   node _check_js_syntax.js app/src/main/assets/games/chicken-chaos/index.html
 *   node _check_js_syntax.js <file> [file...]
 *
 * Exits non-zero and prints the failing block + message on any parse error.
 */
const fs = require('fs');
const vm = require('vm');

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node _check_js_syntax.js <html file> [more files]');
  process.exit(2);
}

let failed = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  let n = 0;
  let ok = 0;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;   // external file, nothing inline to parse
    const code = m[2];
    n += 1;
    try {
      new vm.Script(code, { filename: file + ' block ' + n });
      ok += 1;
      console.log('  block ' + n + ': OK (' + code.length + ' chars)');
    } catch (e) {
      failed += 1;
      console.error('  block ' + n + ': FAIL -> ' + e.message);
    }
  }
  console.log(file + ': ' + ok + '/' + n + ' inline script block(s) parsed');
}

if (failed) {
  console.error(failed + ' block(s) FAILED');
  process.exit(1);
}
console.log('ALL SCRIPTS PARSE OK');
