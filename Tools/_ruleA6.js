'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* The 38-line replacement left the old block's opening "/**" behind, and the
   doc rewrite then added its own - so two "/**" sat stacked, which nests one
   comment inside another and swallows the code between them. */
let removed = 0;
for (let i = 1; i < L.length; i++) {
  if (L[i].trim() === '/**' && L[i - 1].trim() === '/**') {
    L.splice(i, 1);
    removed++;
    break;
  }
}
console.log('removed ' + removed + ' stacked comment opener');

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  no stacked /**  :', !/\/\*\*\s*\n\s*\/\*\*/.test(s));
console.log('  fitsPage intact :', /fun fitsPage\(/.test(s));
console.log('  orderForPage    :', /fun orderForPage\(/.test(s));
console.log('  filterGames     :', /fun filterGames\(/.test(s));
const open = (s.match(/\/\*\*/g) || []).length;
const close = (s.match(/\*\//g) || []).length;
console.log('  comment pairs   : ' + open + ' / ' + close);