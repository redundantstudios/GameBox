/* Add the banner opt-in to a game's manifest, after its tileColor line.
 *
 * The edge and colour are passed in deliberately rather than guessed here:
 * colour comes from the game's own page/canvas background (see _bg_survey and
 * _bg_probe), NOT from tileColor, which is launcher artwork and is often a
 * completely different colour - root.io's is light green against a near-black
 * game, which put a green bar on a dark screen.
 *
 * Idempotent: a game that already carries a banner: line is left alone.
 *
 *     node Tools/_opt_in_banner.js bottom #221c2b bomb-relay checkers ...
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const [edge, bg, ...ids] = process.argv.slice(2);
if (!ids.length) {
  console.error('usage: node _opt_in_banner.js <top|bottom> <#rrggbb> <game> [game...]');
  process.exit(2);
}

for (const g of ids) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) { console.log('MISSING  ' + g); continue; }
  let src = fs.readFileSync(f, 'utf8');

  if (/^banner:/m.test(src)) { console.log('skip     ' + g + ' (already opted in)'); continue; }

  const m = src.match(/^tileColor:.*$/m);
  if (!m) { console.log('NO TILE  ' + g + ' (no tileColor line to anchor to)'); continue; }

  const nl = src.includes('\r\n') ? '\r\n' : '\n';
  src = src.replace(/^tileColor:.*$/m, m[0] + nl + 'banner: ' + edge + nl + 'bannerBg: ' + bg);
  fs.writeFileSync(f, src);
  console.log('OK       ' + g + '  banner: ' + edge + '  bannerBg: ' + bg);
}