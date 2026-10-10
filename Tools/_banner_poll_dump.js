/* Print each game's EXISTING banner poll, so its own rule can be reused
 * instead of writing a second one.
 * Run: node Tools/_banner_poll_dump.js [game ...]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
const list = ids.length ? ids : fs.readdirSync(GAMES).sort();

for (const g of list) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);

  const idx = [];
  for (let i = 0; i < lines.length; i++) {
    if (/ads\.banner\(/.test(lines[i])) idx.push(i);
  }
  if (!idx.length) continue;

  console.log('\n########## ' + g + ' - ' + idx.length + ' call site(s) ##########');
  for (const i of idx) {
    const from = Math.max(0, i - 9);
    console.log('--- lines ' + (from + 1) + '-' + (i + 2) + ' ---');
    for (let k = from; k <= Math.min(lines.length - 1, i + 1); k++) {
      const mark = k === i ? '>>' : '  ';
      console.log(mark + String(k + 1).padStart(5) + ' | ' + lines[k].trim().slice(0, 100));
    }
  }
}