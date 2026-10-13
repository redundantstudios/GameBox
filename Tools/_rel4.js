'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
let L = fs.readFileSync(F, 'utf8').split(NL);

/* The tail of the old expression-bodied fitsPage. It was duplicated by an
   earlier bad splice, so remove every copy, scanning from the bottom up so the
   indices stay valid. The stray "} else {" is what makes fitsNearby fail to
   resolve - it breaks the enclosing scope. */
const TAIL = [
  '                // One human alone: either the game genuinely seats 1, or it can',
  '                // fill the rest with bots. Opening one never forces bot mode -',
  "                // the game's own menu decides how the seats are filled.",
  '                game.minPlayers == 1 || canPlayWithBots(game)',
  '            } else {',
  '                game.minPlayers <= pageCount && game.maxPlayers >= pageCount',
  '            }',
];

let removed = 0;
for (let i = L.length - TAIL.length; i >= 0; i--) {
  if (TAIL.every((t, k) => L[i + k] === t)) {
    L.splice(i, TAIL.length);
    removed++;
    i -= TAIL.length;
  }
}
console.log('OK   removed ' + removed + ' leftover tail(s)');

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  canPlayWithBots once  :', (out.match(/game\.minPlayers == 1 \|\| canPlayWithBots\(game\)/g) || []).length === 1);
console.log('  stray } else { gone   :', !/game\.minPlayers == 1 \|\| canPlayWithBots\(game\)\n\s*\} else \{/.test(out));
console.log('  fitsNearby intact     :', /fun fitsNearby\(game: GameManifest, pageCount: Int\): Boolean \{[\s\S]*?\n        \}/.test(out));
console.log('  one filterGames       :', (out.match(/fun filterGames\(/g) || []).length === 1);