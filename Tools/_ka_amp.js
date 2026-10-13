'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8');
const lines = s.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.indexOf('&amp;') >= 0) {
    const inScript = false;
    console.log('line ' + (i + 1) + ': ' + l.trim().slice(0, 110));
    /* is it inside a <script> block? */
    const before = s.slice(0, s.indexOf(l.trim() === l ? l : l));
    void before; void inScript;
  }
});
/* locate precisely by offset */
let at = s.indexOf('&amp;');
while (at >= 0) {
  const lineNo = s.slice(0, at).split('\n').length;
  const lineStart = s.lastIndexOf('\n', at) + 1;
  const lineEnd = s.indexOf('\n', at);
  console.log('\n-> line ' + lineNo + ': ' + s.slice(lineStart, lineEnd).trim().slice(0, 120));
  at = s.indexOf('&amp;', at + 1);
}