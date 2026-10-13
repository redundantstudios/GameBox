'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* The original fitsPage was expression-bodied (`fun fitsPage(...) = if (...)`),
   so it has no opening brace for a counter to latch onto - the sweep stopped at
   the first inner `}` and left the tail of the old body behind. Delete that
   tail by exact content, not by counting. */
const TAIL = [
  '                // One human alone: either the game genuinely seats 1, or it can',
  '                // fill the rest with bots. Opening one never forces bot mode -',
  "                // the game's own menu decides how the seats are filled.",
  '                game.minPlayers == 1 || canPlayWithBots(game)',
  '            } else {',
  '                game.minPlayers <= pageCount && game.maxPlayers >= pageCount',
  '            }',
];

const at = L.findIndex((l, i) => l === TAIL[0] && TAIL.every((t, k) => L[i + k] === t));
if (at < 0) {
  console.log('MISS leftover tail');
  console.log('looking for:', JSON.stringify(TAIL[0]));
  console.log('line after fitsPage alias:', JSON.stringify(L.findIndex(l => /fun fitsPage\(/.test(l || '')) + 1));
} else {
  L.splice(at, TAIL.length);
  console.log('OK   leftover tail of the old fitsPage removed (' + TAIL.length + ' lines)');
}

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  fitsExactly present:', /fun fitsExactly\(/.test(out));
console.log('  fitsNearby present :', /fun fitsNearby\(/.test(out));
console.log('  fitsPage alias     :', /fun fitsPage\(game: GameManifest, pageCount: Int\): Boolean = fitsExactly\(game, pageCount\)/.test(out));
console.log('  no orphan canPlay  :', (out.match(/game\.minPlayers == 1 \|\| canPlayWithBots\(game\)/g) || []).length === 1);
console.log('  filterGames union  :', /fitsExactly\(it, playerCount\) \|\| fitsNearby\(it, playerCount\)/.test(out));