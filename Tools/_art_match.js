'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ART = path.join('sources', 'Shell Art');
const DRAW = path.join('app', 'src', 'main', 'res', 'drawable');
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);

const pairs = [
  ['carrom_tile_img.png', 'tile_carroms.png'],
  ['chinese_chickers_tile_img.jpeg', 'tile_chinese_checkers.jpg'],
  ['knot_away_tile_img.jpeg', 'tile_knot_away.jpg'],
  ['mimic_tile_img.png', 'tile_mimic.png'],
  ['truth_or_dare_tile_img.png', 'tile_truth_or_dare.png'],
];

pairs.forEach(([src, have]) => {
  const a = path.join(ART, src), b = path.join(DRAW, have);
  if (!fs.existsSync(b)) { console.log('  ' + have + ' : not installed'); return; }
  const ha = hash(a), hb = hash(b);
  console.log('  ' + have.padEnd(28) + (ha === hb ? 'IDENTICAL to source' : 'DIFFERENT from source')
    + '   (' + ha + ' vs ' + hb + ')');
});