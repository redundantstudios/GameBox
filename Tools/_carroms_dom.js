'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8');
const body = s.slice(s.indexOf('<body'), s.indexOf('</body>'));

/* Walk the top-level structure so the nesting is unambiguous. */
const re = /<\/?([a-zA-Z][\w-]*)([^>]*)>/g;
let depth = 0, m;
const out = [];
while ((m = re.exec(body))) {
  const closing = m[0][1] === '/';
  const self = /\/>$/.test(m[0]) || /^(img|input|br|hr|meta|link|source)$/i.test(m[1]);
  if (closing) depth--;
  if (/id="(overlay|toast|canvas|fx|board|app)"|class="[^"]*\bpanel\b/.test(m[2] || '')) {
    out.push('  '.repeat(Math.max(0, depth)) + (closing ? '</' : '<') + m[1] +
      ' ' + (m[2] || '').trim().slice(0, 70));
  }
  if (!closing && !self) depth++;
}
out.forEach(l => console.log(l));