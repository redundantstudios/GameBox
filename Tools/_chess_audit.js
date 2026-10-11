'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chess/index.html', 'utf8');
const lines = s.split(/\r?\n/);

/* Every click handler, with the ad state of the one it belongs to. */
const rows = [];
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (!/addEventListener\(["']click["']|\.onclick\s*=/.test(t)) return;
  // grab a small window of context so we can judge what the handler does
  const ctx = lines.slice(i, i + 6).join(' ');
  const hasAd = /interstitial|rewarded/i.test(ctx);
  const label = t.replace(/\s*addEventListener.*$/, '').replace(/[=$()]/g, '').trim().slice(0, 26);
  rows.push({ line: i + 1, label, ad: hasAd, snippet: t.slice(0, 76) });
});

console.log('=== click handlers ===');
rows.forEach(r => console.log(String(r.line).padStart(5) + ' | ' + (r.ad ? 'AD    ' : 'no-ad ') + r.label));
console.log('\ntotal handlers:', rows.length, ' with ad nearby:', rows.filter(r => r.ad).length);

console.log('\n=== puzzle hub saving ===');
lines.forEach((l, i) => {
  const t = (l || '').trim();
  if (/pstats|puzzleStats|savePStats|loadPStats|persistP|pzStats/.test(t)) {
    console.log(String(i + 1).padStart(5) + ' | ' + t.slice(0, 90));
  }
});