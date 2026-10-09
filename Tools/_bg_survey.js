/* What colour is each game actually? Used to pick bannerBg, which has to
 * match the game's OWN page background - not its launcher tile, which is
 * often a completely different colour.
 * Run: node Tools/_bg_survey.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const pad = (s, n) => String(s).padEnd(n);

for (const g of fs.readdirSync(GAMES).sort()) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');

  // The LAST html,body{...background:...} wins: games append themes later, and
  // the effective page background is the one that survives the cascade.
  let bodyBg = null;
  const bodyRe = /html\s*,\s*body\s*\{([^}]*)\}/g;
  let m;
  while ((m = bodyRe.exec(src)) !== null) {
    const bg = /background\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(m[1]);
    if (bg) bodyBg = bg[1];
  }

  const theme = /--bg\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(src);

  // The canvas the game actually paints into, if it fills one.
  const canvasRe = /<canvas[^>]*id=["']([^"']+)["'][^>]*>/g;
  const ids = [];
  let c;
  while ((c = canvasRe.exec(src)) !== null) ids.push(c[1]);

  console.log(pad(g, 20) + 'bodyBg=' + pad(bodyBg || '-', 10) +
    '--bg=' + pad(theme ? theme[1] : '-', 10) + 'canvases=' + ids.join(','));
}