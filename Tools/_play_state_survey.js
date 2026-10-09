/* How does each game know it is playing, and does it already announce it?
 * The shim defines S.game.gameplayStart / gameplayStop as no-ops. If games
 * call them, the banner can be wired there ONCE instead of per game.
 * Run: node Tools/_play_state_survey.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');
const pad = (s, n) => String(s).padEnd(n);

const rows = [];
for (const g of fs.readdirSync(GAMES).sort()) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const n = re => (src.match(re) || []).length;

  // Initial values of the usual state holders, so we know the vocabulary.
  const vocab = new Set();
  let m;
  const v1 = /(?:let|var)\s+(?:state|STATE|gameState|phase)\s*=\s*['"]([A-Za-z_-]+)['"]/g;
  while ((m = v1.exec(src)) !== null) vocab.add(m[1]);
  const v2 = /(?:state|STATE)\s*=\s*['"]([A-Za-z_-]+)['"]/g;
  while ((m = v2.exec(src)) !== null) vocab.add(m[1]);

  rows.push({
    game: g,
    gs: n(/gameplayStart\s*\(/g),
    gp: n(/gameplayStop\s*\(/g),
    vocab: [...vocab].slice(0, 6).join(','),
    // Does the game already call Studio.ads.interstitial anywhere?
    inter: n(/ads\.interstitial\(/g),
    shim: /banner:function\(show\)/.test(src) ? 'ok' : (/banner:function\(\)\{\}/.test(src) ? 'STUB' : 'none'),
  });
}

console.log(pad('game', 20) + pad('gs', 4) + pad('gp', 4) + pad('shim', 6) + pad('inter', 7) + 'state vocabulary');
console.log('-'.repeat(80));
for (const r of rows) {
  console.log(pad(r.game, 20) + pad(r.gs, 4) + pad(r.gp, 4) + pad(r.shim, 6) + pad(r.inter, 7) + r.vocab);
}