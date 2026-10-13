'use strict';
/* Rule A against the real catalogue: page X lists a game if it needs X or
   FEWER people. Never more. */
const fs = require('fs');
const path = require('path');
const dir = 'app/src/main/assets/games';
const PARTY = new Set(['mimic', 'truth-or-dare']);
const NEW = new Set(['colour-rush', 'ember', 'orrery', 'sheepdog-trials', 'pool-8ball',
  'midnight-overdrive', 'magnet-pull', 'kiro', 'root-io', 'carroms']);

function parse(id) {
  const s = fs.readFileSync(path.join(dir, id, 'index.html'), 'utf8');
  const head = s.slice(0, s.indexOf('-->'));
  const g = (k) => { const m = head.match(new RegExp('^\\s*' + k + ':\\s*(.+)$', 'm')); return m ? m[1].trim() : null; };
  return { id, title: g('title') || id, min: +g('minPlayers'), max: +g('maxPlayers') };
}

const fitsOnPage = (g, p) => !PARTY.has(g.id) && g.min <= p;
const games = fs.readdirSync(dir).filter(d => fs.statSync(path.join(dir, d)).isDirectory()).map(parse).sort((a, b) => a.title.localeCompare(b.title));

console.log('catalogue: ' + games.length + ' games\n');
let problems = [];

for (const p of [1, 2, 3, 4, 5]) {
  const shown = games.filter(g => fitsOnPage(g, p));
  const tooBig = shown.filter(g => g.min > p);
  const fitsExactly = shown.filter(g => g.min === p);
  const smaller = shown.filter(g => g.min < p);
  console.log('--- ' + p + ' PLAYER page: ' + shown.length + ' games ---');
  console.log('  exact (' + fitsExactly.length + ')  : ' + fitsExactly.map(g => g.title + ' ' + g.min + '-' + g.max).join(', '));
  console.log('  smaller (' + smaller.length + '): ' + smaller.map(g => g.title + ' ' + g.min + '-' + g.max).join(', '));
  if (tooBig.length) problems.push(p + 'P page shows a game needing more: ' + tooBig.map(g => g.title).join(', '));
  if (games.filter(g => !PARTY.has(g.id) && !shown.includes(g)).length) {
    const hidden = games.filter(g => !PARTY.has(g.id) && !shown.includes(g));
    console.log('  hidden      : ' + hidden.map(g => g.title + ' (' + g.min + '-' + g.max + ')').join(', '));
  }
  console.log('');
}

// the director's two examples, spelled out
const cc = games.find(g => g.id === 'chinese-checkers');
console.log('DIRECTOR EXAMPLES');
const twoSeat = games.filter(g => g.min === 2 && !PARTY.has(g.id)).map(g => g.title);
const threeSeat = games.filter(g => g.min === 3 && !PARTY.has(g.id)).map(g => g.title);
console.log('  a 2-player game on the 3 PLAYER page : ' + twoSeat.filter(t => fitsOnPage(games.find(g => g.title === t), 3)).length + '/' + twoSeat.length + ' of ' + twoSeat.join(', '));
console.log('  a 3-player game on the 2 PLAYER page : ' + threeSeat.filter(t => fitsOnPage(games.find(g => g.title === t), 2)).length + '/' + threeSeat.length + ' (must be 0)');
if (threeSeat.some(t => fitsOnPage(games.find(g => g.title === t), 2))) problems.push('a 3-player game leaked onto the 2 PLAYER page');

console.log('\nChinese Checkers: ' + cc.min + '-' + cc.max + ' (tile badge reads ' + cc.max + 'P)');
console.log('\n' + (problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'RULE HOLDS: no game ever appears on a page below its minimum'));