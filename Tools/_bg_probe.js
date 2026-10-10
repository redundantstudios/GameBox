/* For games where _bg_survey found nothing: what background actually paints?
 * Looks at the body/html rule, then any full-bleed fill the canvas or a root
 * container uses, and reports the candidates so a bannerBg can be chosen from
 * evidence rather than picked at random.
 * Run: node Tools/_bg_probe.js <game> [game...]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');
const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
if (!ids.length) { console.error('usage: node _bg_probe.js <game> [game...]'); process.exit(2); }

for (const g of ids) {
  const f = path.join(GAMES, g, 'index.html');
  const src = fs.readFileSync(f, 'utf8');

  // Every distinct hex in the file, most frequent first: the page background is
  // almost always one of the top few.
  const freq = new Map();
  for (const m of src.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const c = m[0].toLowerCase();
    freq.set(c, (freq.get(c) || 0) + 1);
  }
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  console.log('=== ' + g + ' ===');
  console.log('  top hex: ' + top.map(([c, n]) => c + 'x' + n).join('  '));

  // A canvas fill is what the player actually sees behind the game.
  const fill = /fillStyle\s*=\s*['"](#[0-9a-fA-F]{3,8})['"]/g;
  const fills = new Map();
  let m;
  while ((m = fill.exec(src)) !== null) {
    const c = m[1].toLowerCase();
    fills.set(c, (fills.get(c) || 0) + 1);
  }
  console.log('  canvas fills: ' + [...fills.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([c, n]) => c + 'x' + n).join('  '));

  const theme = /--bg\s*:\s*(#[0-9a-fA-F]{3,8})/g;
  const th = [];
  while ((m = theme.exec(src)) !== null) th.push(m[1]);
  console.log('  --bg decls: ' + (th.join(' ') || '-'));
  console.log('');
}