'use strict';
const fs = require('fs');
const path = require('path');

const ART = path.join('sources', 'Shell Art');
/* Tiles live in drawable-nodpi, never in plain drawable/: a copy in both would
   shadow the one the game actually ships. */
const NOPI = path.join('app', 'src', 'main', 'res', 'drawable-nodpi');

/* Art file -> resource name. The resource name is tile_<id> with the id's dashes
   turned into underscores, which is exactly what GameAdapter asks
   getIdentifier() for. */
const MAP = [
  ['8-Ball-Pool_tile_imag', 'pool_8ball'],
  ['balloon_battle_tile_img.png', 'balloon_battle'],
  ['bomb_relay_tile_img.png', 'bomb_relay'],
  ['carrom_tile_img.png', 'carroms'],
  ['checkers_tile_img.png', 'checkers'],
  ['chess_tile_img.png', 'chess'],
  ['chicken_chaos_tile.png', 'chicken_chaos'],
  ['chinese_chickers_tile_img.jpeg', 'chinese_checkers'],
  ['colour_rush_tile_img.png', 'colour_rush'],
  ['connect_4_tile_img.png', 'connect_four'],
  ['egg_rush_tile.png', 'egg_rush'],
  ['Ember_tile_img.jpeg', 'ember'],
  ['kiro_tile_img.jpeg', 'kiro'],
  ['knot_away_tile_img.jpeg', 'knot_away'],
  ['last_balloon_tile_img.jpeg', 'last_balloon'],
  ['ludo_tile_img.png', 'ludo'],
  ['magnet_pull_tile_img.png', 'magnet_pull'],
  ['memory_grab_tile_img.png', 'memory_grab'],
  ['MidNight_Overdrive_tile_img.png', 'midnight_overdrive'],
  ['mimic_tile_img.png', 'mimic'],
  ['orrery_tile_img.jpeg', 'orrery'],
  ['planet_merge_tile.png', 'planetmerge'],
  ['root.io_tile_img.jpeg', 'root_io'],
  ['sheep_dog_tile_img.png', 'sheepdog_trials'],
  ['snakes_and_ladders_tile_img.jpeg', 'snakes_and_ladders'],
  ['truth_or_dare_tile_img.png', 'truth_or_dare'],
];

const sniff = b => {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
  if (b[0] === 0x42 && b[1] === 0x4D) return 'bmp';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  // ISO-BMFF: "ftypavif" is the AVIF brand.
  if (b.slice(4, 12).toString() === 'ftypavif') return 'avif';
  return 'unknown';
};

/* Canonical extension for each format. AAPT2 does not accept .jpeg as a drawable
   extension, and two of these files were AVIF wearing a .png name - which AAPT2
   would reject outright - so both get normalised here rather than at build time. */
const EXT = { png: '.png', jpeg: '.jpg', webp: '.webp', gif: '.gif', avif: '.jpg' };

fs.mkdirSync(NOPI, { recursive: true });

const convertQueue = [];
const installed = [];

MAP.forEach(([file, res]) => {
  const src = path.join(ART, file);
  if (!fs.existsSync(src)) { console.log('MISS ' + file); return; }
  const kind = sniff(fs.readFileSync(src));
  if (kind === 'unknown') { console.log('SKIP unrecognised ' + file); return; }

  const dst = path.join(NOPI, 'tile_' + res + EXT[kind]);

  if (kind === 'avif') {
    // Needs re-encoding; hand it to Pillow.
    convertQueue.push([src, dst, file]);
    installed.push([dst, res, 'avif->jpg', file]);
    return;
  }
  fs.copyFileSync(src, dst);
  const kb = (fs.statSync(dst).size / 1024).toFixed(0);
  const changed = path.extname(file).toLowerCase() !== EXT[kind] && !!path.extname(file);
  console.log('  ' + file.padEnd(34) + '-> tile_' + res + EXT[kind] + '  ' + kb.padStart(6) + ' KB'
    + (changed ? '  (renamed)' : ''));
  installed.push([dst, res, kind, file]);
});

fs.writeFileSync(path.join('Tools', '_art_convert_queue.json'),
  JSON.stringify(convertQueue, null, 1));

console.log('\n' + installed.length + ' tile(s) installed');
console.log(convertQueue.length + ' need AVIF conversion: ' +
  convertQueue.map(c => c[2]).join(', '));