/* Which games already ASK for a banner? Those were only ever blocked by the
 * no-op shim, so they need a manifest opt-in and nothing else.
 * Run: node Tools/_banner_callsite.js
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

  const lines = src.split(/\r?\n/);
  const mi = lines.findIndex(l => l.includes('STUDIO_GAME_MANIFEST'));
  const p = {};
  if (mi >= 0) {
    const b = [];
    for (let i = mi + 1; i < lines.length; i++) {
      if (lines[i].includes('STUDIO_GAME_MANIFEST')) break;
      b.push(lines[i]); if (b.length >= 20) break;
    }
    for (const l of b) { const q = l.split(':'); if (q.length >= 2) p[q[0].trim()] = q.slice(1).join(':').trim(); }
  }

  const calls = (src.match(/ads\.banner\(/g) || []).length;
  const shim = /banner:function\(show\)/.test(src) ? 'ok' : (/banner:function\(\)\{\}/.test(src) ? 'STUB' : 'none');

  // Only worth flagging when the game calls banner() but has no opt-in yet.
  const needs = calls > 0 && !p.banner;
  console.log(pad(g, 20) + pad('shim=' + shim, 11) + pad('bannerCalls=' + calls, 15) +
    pad('manifest=' + (p.banner || '-'), 18) + (needs ? '  <-- wired but NOT opted in' : ''));
}