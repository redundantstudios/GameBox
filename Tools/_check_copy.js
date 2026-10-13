'use strict';
/* Read the daily notifications exactly the way the app does, to prove the two
   arrays line up and each message is complete. */
const fs = require('fs');
const s = fs.readFileSync('app/src/main/res/values/strings_update.xml', 'utf8');

function arr(name) {
  const start = s.indexOf('<string-array name="' + name + '"');
  if (start < 0) return [];
  const body = s.slice(start);
  const end = body.indexOf('</string-array>');
  return [...body.slice(0, end).matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
}

const t = arr('daily_msg_titles');
const b = arr('daily_msg_bodies');
console.log('titles: ' + t.length + '   bodies: ' + b.length + '   aligned: ' + (t.length === b.length));
console.log('');
t.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x + '  ->  ' + (b[i] || '(MISSING)')));

const problems = [];
if (t.length !== 10) problems.push('expected 10 titles, found ' + t.length);
if (b.length !== 10) problems.push('expected 10 bodies, found ' + b.length);
t.forEach((x, i) => {
  if (!x.trim()) problems.push('empty title at ' + (i + 1));
  if (!b[i] || !b[i].trim()) problems.push('empty/missing body at ' + (i + 1));
  if (x.includes('\n') || (b[i] || '').includes('\n')) problems.push('newline in entry ' + (i + 1));
});

console.log('');
console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'all ten complete and aligned');