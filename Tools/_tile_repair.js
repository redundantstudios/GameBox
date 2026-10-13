'use strict';
const fs = require('fs');
const path = require('path');

const RES = path.join('app', 'src', 'main', 'res');
const NOPI = path.join(RES, 'drawable-nodpi');
const PLAIN = path.join(RES, 'drawable');

const EXT = ['.png', '.jpg', '.jpeg', '.webp'];
const baseName = f => f.slice(0, f.length - path.extname(f).length);

// Every hand-made tile, by base resource name (Android drops the extension).
const handmade = new Set();
for (const e of EXT) {
  const p = path.join(PLAIN, 'tile_' + '' /* placeholder */);
  void p;
}
for (const f of fs.readdirSync(PLAIN)) {
  if (f.startsWith('tile_')) handmade.add(baseName(f));
}
console.log('hand-made tiles in drawable/: ' + [...handmade].join(', '));

let removed = 0;
for (const f of fs.readdirSync(NOPI)) {
  if (!f.startsWith('tile_')) continue;
  const b = baseName(f);
  if (!handmade.has(b)) continue;
  const target = path.join(NOPI, f);
  fs.unlinkSync(target);
  console.log('  removed ' + f + '  (shadowed the hand-made ' + b + ' in drawable/)');
  removed++;
}
console.log('\nremoved ' + removed + ' shadowing file(s)');

const left = fs.readdirSync(NOPI).filter(f => f.startsWith('tile_')).length;
console.log('drawable-nodpi now holds ' + left + ' generated tile(s)');
console.log('drawable still holds ' + handmade.size + ' hand-made tile(s)');