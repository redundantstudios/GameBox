'use strict';
const fs = require('fs');
const path = require('path');

const GAMES = path.join('app', 'src', 'main', 'assets', 'games');
const RES = path.join('app', 'src', 'main', 'res');

/* GameAdapter resolves art with
     getIdentifier("tile_" + id.lowercase().replace('-','_'), "drawable", pkg)
   Android drops the extension when matching, and drawable-nodpi outranks the
   unqualified drawable/. So the check is: exactly one matching base name across
   the drawable dirs, or the tile is shadowed. */
const want = id => 'tile_' + id.toLowerCase().replace(/-/g, '_');

const ids = fs.readdirSync(GAMES)
  .filter(d => fs.existsSync(path.join(GAMES, d, 'index.html'))).sort();

const byName = new Map();
for (const dir of fs.readdirSync(RES)) {
  if (!dir.startsWith('drawable')) continue;
  const full = path.join(RES, dir);
  for (const f of fs.readdirSync(full)) {
    if (!f.startsWith('tile_')) continue;
    const base = f.slice(0, f.length - path.extname(f).length);
    if (!byName.has(base)) byName.set(base, []);
    byName.get(base).push(dir + '/' + f);
  }
}

let bad = 0;
ids.forEach(id => {
  const w = want(id);
  const have = byName.get(w) || [];
  const ok = have.length === 1;
  if (!ok) bad++;
  console.log((ok ? '  OK   ' : '  BAD  ') + id.padEnd(20) + '-> ' + w.padEnd(24) +
    (have.length ? '[' + have.join(', ') + ']' : 'MISSING'));
});

const wanted = new Set(ids.map(want));
const extra = [...byName.keys()].filter(k => !wanted.has(k));
if (extra.length) console.log('\n  extra tiles with no game: ' + extra.join(', '));

console.log('\n' + (bad ? bad + ' BAD' : 'all ' + ids.length + ' games resolve to exactly one tile'));
process.exit(bad ? 1 : 0);