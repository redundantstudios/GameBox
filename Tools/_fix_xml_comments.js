'use strict';
const fs = require('fs');
const P = 'app/src/main/res/values/values_placeholder';
const F = 'app/src/main/res/values/strings_update.xml';

/* XML forbids "--" anywhere inside a comment. The banner separators were long
   runs of dashes, which is the one thing you cannot write in an XML comment.
   Replace every run of 2+ dashes inside comment lines only - values must keep
   their punctuation untouched. */
const lines = fs.readFileSync(F, 'utf8').split(/\r?\n/);

let inComment = false;
let fixed = 0;
const out = lines.map((line) => {
  const t = line.trim();
  if (!inComment && t.startsWith('<!--')) inComment = true;
  let l = line;
  if (inComment && /-{2,}/.test(l)) {
    l = l.replace(/-{2,}/g, (m) => '='.repeat(m.length));
    fixed++;
  }
  if (inComment && t.endsWith('-->')) inComment = false;
  return l;
});

fs.writeFileSync(F, out.join('\n'));
console.log('lines fixed: ' + fixed);

const after = fs.readFileSync(F, 'utf8');
// strip comments, then check the remaining document for "--"
const stripped = after.replace(/<!--[\s\S]*?-->/g, '');
console.log('"--" outside comments :', stripped.includes('--'));
console.log('comment pairs balanced:', (after.match(/<!--/g) || []).length === (after.match(/-->/g) || []).length);
console.log('values intact        :', /<item>Take a break\?<\/item>/.test(stripped));
console.log('array count          :', (stripped.match(/<item>/g) || []).length);