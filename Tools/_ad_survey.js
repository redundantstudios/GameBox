/* Survey: what ad wiring does each game already have?
 * Run: node Tools/_ad_survey.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

function manifest(src) {
  const lines = src.split(/\r?\n/);
  const mi = lines.findIndex(l => l.includes('STUDIO_GAME_MANIFEST'));
  const p = {};
  if (mi < 0) return p;
  const block = [];
  for (let i = mi + 1; i < lines.length; i++) {
    if (lines[i].includes('STUDIO_GAME_MANIFEST')) break;
    block.push(lines[i]);
    if (block.length >= 20) break;
  }
  for (const l of block) {
    const q = l.split(':');
    if (q.length >= 2) p[q[0].trim()] = q.slice(1).join(':').trim();
  }
  return p;
}

const count = (src, re) => (src.match(re) || []).length;
const pad = (s, n) => String(s).padEnd(n);

const rows = [];
for (const g of fs.readdirSync(GAMES).sort()) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const m = manifest(src);
  const shim = /banner:function\(\)\{\}/.test(src) ? 'STUB'
    : /banner:function\(show\)/.test(src) ? 'ok' : 'none';
  rows.push({
    game: g,
    orient: m.orientation || '?',
    banner: m.banner || '-',
    shim: shim,
    inter: count(src, /ads\.interstitial\(/g),
    rew: count(src, /ads\.rewarded\(/g),
    // Games that drive ads through the CrazyGames shim instead of Studio.ads.
    crazy: /requestAd\(/.test(src) ? 'Y' : '-',
    over: count(src, /gameOver|GAME_OVER|gameover|levelComplete|LEVEL_COMPLETE|winModal|youWin|YouWin|victory/gi),
  });
}

const cols = [['game', 20], ['orient', 7], ['banner', 7], ['shim', 5], ['inter', 6], ['rew', 4], ['crazy', 6], ['overWords', 10]];
console.log(cols.map(c => pad(c[0], c[1])).join(''));
console.log('-'.repeat(cols.reduce((a, c) => a + c[1], 0)));
for (const r of rows) {
  console.log(cols.map(([k, n]) => pad(k === 'overWords' ? r.over : r[k], n)).join(''));
}