'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

const i = L.findIndex(l => /return game\.minPlayers <= pageCount/.test(l || ''));
if (i < 0) { console.log('MISS the rule line'); process.exit(1); }

L.splice(i, 1,
  '            /* MAX, not minimum. Judged on the minimum, a 2-player game such as',
  '             * Chess (1-2) landed on the 1 PLAYER page, which is exactly what the',
  '             * director called out. The rule is:',
  '             *',
  '             *   1 PLAYER page -> only games that seat 1',
  '             *   2 PLAYER page -> games that seat 1, and games that seat 2',
  '             *   3 PLAYER page -> those, and games that seat 3',
  '             *   ...up to 5',
  '             *',
  '             * i.e. page X lists every game whose LARGEST seat count is X or',
  '             * fewer. A game never appears on a page below its largest seat',
  '             * count, and never appears on a page above it either - a 4-player',
  '             * game is not listed on the 5 PLAYER page. */',
  '            return game.maxPlayers <= pageCount');

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('OK   rule is now maxPlayers <= pageCount');
console.log('\nverify:');
console.log('  max rule      :', /return game\.maxPlayers <= pageCount/.test(s));
console.log('  min rule gone :', !/game\.minPlayers <= pageCount/.test(s));
console.log('  party excluded:', /if \(game\.id in PARTY_GAME_IDS\) return false/.test(s));