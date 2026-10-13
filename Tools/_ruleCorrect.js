'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

const i = L.findIndex(l => /return game\.maxPlayers <= pageCount/.test(l || ''));
if (i < 0) { console.log('MISS rule line'); process.exit(1); }
// replace the whole comment block + rule, up to and including the rule line
let start = i;
while (start > 0 && !/\/\*/.test(L[start])) start--;
L.splice(start, i - start + 1,
  '            /* Page X lists games that seat AT LEAST X people.',
  '             *',
  '             *   1 PLAYER page -> games seating 1, 2, 3, 4 or 5. Every game, because',
  '             *                     any of them can be played solo against bots.',
  '             *   2 PLAYER page -> games seating 2, 3, 4 or 5',
  '             *   3 PLAYER page -> games seating 3, 4 or 5',
  '             *   4 PLAYER page -> games seating 4 or 5',
  '             *   5 PLAYER page -> games seating 5',
  '             *',
  '             * Measured on the LARGEST seat count. Two earlier passes had this',
  '             * the other way round: one used the minimum, which put Chess on the',
  '             * 1 PLAYER page, and the next used max but pointing down, which hid',
  '             * everything multi-player from the 2 and 3 PLAYER pages.',
  '             *',
  '             * Party games never appear here - they are pass-the-phone, not a',
  '             * seat count. They live in the Party Games tile and in All Games. */',
  '            return game.maxPlayers >= pageCount');

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('OK   rule is now maxPlayers >= pageCount');
console.log('\nverify:');
console.log('  >= rule      :', /return game\.maxPlayers >= pageCount/.test(s));
console.log('  <= rule gone :', !/maxPlayers <= pageCount/.test(s));
console.log('  party excluded:', /if \(game\.id in PARTY_GAME_IDS\) return false/.test(s));
console.log('  NEW on top   :', /if \(it\.id in NEW_GAME_IDS\) 0 else 1/.test(s));