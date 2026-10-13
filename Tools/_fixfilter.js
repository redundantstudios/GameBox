'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
let s = fs.readFileSync(F, 'utf8');

function swap(label, from, to) {
  if (!s.includes(from)) { console.log('MISS ' + label); process.exit(1); }
  if (s.split(from).length - 1 !== 1) { console.log('AMBIGUOUS ' + label); process.exit(1); }
  s = s.replace(from, to);
  console.log('OK   ' + label);
}

/* The near-miss tier was applied to EVERY game, so a 1-player game turned up on
   the 2 PLAYER page and a 2-player game on the 3 PLAYER page. That is not what
   was asked for.

   What was asked: the NEW games are not all exact-seat matches for every page,
   and they should still show. Everything else keeps the strict rule. So the
   relaxation now applies to the NEW cohort only. */
swap('fitsNearby is NEW-only',
`        fun fitsNearby(game: GameManifest, pageCount: Int): Boolean {
            if (game.id in PARTY_GAME_IDS) return false
            return (game.minPlayers..game.maxPlayers).any { Math.abs(it - pageCount) == 1 }
        }`,
`        fun fitsNearby(game: GameManifest, pageCount: Int): Boolean {
            if (game.id in PARTY_GAME_IDS) return false
            // NEW cohort only. Relaxing it for every game put 1-player games on
            // the 2 PLAYER page and 2-player games on the 3 PLAYER page, which
            // is not what an N PLAYER page is meant to mean.
            if (game.id !in NEW_GAME_IDS) return false
            return (game.minPlayers..game.maxPlayers).any { Math.abs(it - pageCount) == 1 }
        }`);

swap('filterGames doc',
`        /**
         * Games an N PLAYER page lists: everything that seats this many people
         * exactly, plus the games one seat either side of it.
         */`,
`        /**
         * Games an N PLAYER page lists.
         *
         * Established games appear only when they seat this many people exactly.
         * The NEW cohort is also allowed one seat either side, because a new
         * game is not always an exact match for every page and would otherwise
         * be invisible on most of them - which defeats the point of pinning it
         * to the top in the first place.
         */`);

fs.writeFileSync(F, s);
console.log('\nverify:');
console.log('  NEW-only guard:', /if \(game\.id !in NEW_GAME_IDS\) return false/.test(s));
console.log('  still exact for old games:', /fitsExactly\(it, playerCount\) \|\| fitsNearby\(it, playerCount\)/.test(s));