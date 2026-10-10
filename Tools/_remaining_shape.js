/* What shape is each remaining game's ad plumbing?
 * Run: node Tools/_remaining_shape.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
const list = ids.length ? ids : ['balloon-battle', 'last-balloon', 'chicken-chaos', 'egg-rush', 'ludo', 'kiro'];

for (const g of list) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) { console.log(g + ': MISSING'); continue; }
  const s = fs.readFileSync(f, 'utf8');

  const t = s.match(/^tileColor:.*$/m);
  const vocab = [...new Set(
    [...s.matchAll(/(?:let|var)\s+(?:state|STATE|phase|mode)\s*=\s*['"]([A-Za-z_-]+)['"]/g)].map(m => m[1])
  )];
  const assigned = [...new Set([...s.matchAll(/(?:state|STATE)\s*=\s*['"]([A-Za-z_-]+)['"]/g)].map(m => m[1]))];

  console.log('=== ' + g + ' ===');
  console.log('  Studio.ads      : ' + (/Studio\.ads/.test(s) ? 'yes' : 'NO'));
  console.log('  CrazyGames      : ' + (/CrazyGames/.test(s) ? 'yes' : 'no'));
  console.log('  NativeBridge    : ' + (/NativeBridge/.test(s) ? 'yes' : 'no'));
  console.log('  ads obj literal : ' + ((s.match(/ads\s*[:=]\s*\{/g) || []).length));
  console.log('  tileColor       : ' + (t ? t[0] : '-'));
  console.log('  state declared  : ' + (vocab.join(',') || '-'));
  console.log('  state assigned  : ' + (assigned.join(',') || '-'));
  console.log('  ads.interstitial: ' + ((s.match(/ads\.interstitial\(/g) || []).length));
  console.log('  ads.rewarded    : ' + ((s.match(/ads\.rewarded\(/g) || []).length));
  console.log('');
}