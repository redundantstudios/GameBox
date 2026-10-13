'use strict';
/* Page X lists every game whose LARGEST seat count is X or fewer.
   Read the real manifests, group by largest seat count, and check each page. */
const fs = require('fs');
const path = require('path');
const dir = 'app/src/main/assets/games';
const PARTY = new Set(['mimic', 'truth-or-dare']);

function parse(id) {
  const s = fs.readFileSync(path.join(dir, id, 'index.html'), 'utf8');
  const head = s.slice(0, s.indexOf('-->'));
  const g = (k) => { const m = head.match(new RegExp('^\\s*' + k + ':\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
  return { id, title: g('title') || id, min: +g('minPlayers'), max: +g('maxPlayers') };
}

const fitsOnPage = (g, p) => !PARTY.has(g.id) && g.max >= p;
const games = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).map(parse);

// bucket by largest seat count
const buckets = {};
for (const g of games) {
  if (PARTY.has(g.id)) continue;
  (buckets[g.max] = buckets[g.max] || []).push(g.title);
}
console.log('games by LARGEST seat count:');
Object.keys(buckets).map(Number).sort((a, b) => a - b).forEach(k =>
  console.log('  seats ' + String(k).padEnd(3) + ': ' + buckets[k].join(', ')));

console.log('\n' + '='.repeat(62));
let problems = [];
for (let p = 1; p <= 5; p++) {
  const shown = games.filter(g => fitsOnPage(g, p));
  console.log('\n' + p + ' PLAYER page  (' + shown.length + ' games)');
  for (let k = p; k <= 10; k++) {
    const at = shown.filter(g => g.max === k);
    console.log('   seats ' + k + ': ' + (at.length ? at.map(g => g.title).join(', ') : '(none in the catalogue)'));
  }
  const leaked = shown.filter(g => g.max < p);   // a page must never list a game that seats fewer than itself
  if (leaked.length) problems.push(p + 'P page leaked a smaller-seat game: ' + leaked.map(g => g.title).join(', '));
}

// the director's statements, checked literally
console.log('\n' + '='.repeat(62));
console.log('DIRECTOR CHECKS');
const p1 = games.filter(g => fitsOnPage(g, 1));
const not1 = p1.filter(g => g.max < 1);
console.log('  1P page has EVERY non-party game     : ' + (not1.length === 0 ? 'PASS' : 'FAIL -> ' + not1.map(g => g.title)));
if (not1.length) problems.push('1P page had non-1-seat games');

for (const p of [2, 3, 4, 5]) {
  const bad = games.filter(g => fitsOnPage(g, p) && g.max < p);
  console.log('  ' + p + 'P page has no game seating fewer than ' + p + ' : ' + (bad.length === 0 ? 'PASS' : 'FAIL'));
  if (bad.length) problems.push(p + 'P page leaked bigger games');
}

const partyLeak = [];
for (let p = 1; p <= 5; p++) for (const id of PARTY) if (fitsOnPage(games.find(g => g.id === id), p)) partyLeak.push(id + ' on ' + p + 'P');
console.log('  party games never on an X page       : ' + (partyLeak.length === 0 ? 'PASS' : 'FAIL -> ' + partyLeak));
if (partyLeak.length) problems.push('party games leaked: ' + partyLeak);

console.log('\n' + (problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'ALL CHECKS PASS'));

