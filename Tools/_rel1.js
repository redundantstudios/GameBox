'use strict';
const fs = require('fs');
const path = require('path');
const NL = f => fs.readFileSync(f, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const MA = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';

/* ============ 1. X PLAYERS pages also list near-miss games ============
   The page used to show ONLY games that seat exactly X, so a 3-player game
   was invisible on the 2 PLAYER page and vice versa. The director asked for
   those to appear too - but AFTER the new games, so the NEW cohort still reads
   as the first thing on the page.

   Ordering therefore becomes:
     1. NEW games, exact fit or near miss
     2. exact-fit games, in the existing order
     3. near-miss games, in the existing order

   Party games stay excluded from these pages entirely - they are
   pass-the-phone, not a seat count, and they have their own tile. */
{
  const L = fs.readFileSync(MA, 'utf8').split(NL(MA));

  // --- relax the filter to include +/-1 near misses ---
  const f = L.findIndex(l => /fun fitsPage\(/.test(l || ''));
  if (f < 0) { console.log('MISS fitsPage'); process.exit(1); }
  let fe = f;
  { let d = 0, s = false; for (let k = f; k < L.length; k++) { for (const c of L[k]) { if (c === '{') { d++; s = true; } else if (c === '}') { d--; if (s && d === 0) { fe = k; k = L.length; } } } } }

  L.splice(f, fe - f + 1,
    '        /** True when the game genuinely seats this many people. */',
    '        fun fitsExactly(game: GameManifest, pageCount: Int): Boolean =',
    '            if (game.id in PARTY_GAME_IDS) {',
    '                // Party games are pass-the-phone, NOT a seat-count crowd. They',
    '                // must never appear in the 1/2/3/4 PLAYER tiles - a player',
    '                // tapping "2 PLAYER" wants games that genuinely seat two. They',
    '                // live in their own Party Games tile (and in All Games, which',
    '                // lists everything, as it should).',
    '                false',
    '            } else if (pageCount == 1) {',
    '                // One human alone: either the game genuinely seats 1, or it can',
    '                // fill the rest with bots. Opening one never forces bot mode -',
    "                // the game's own menu decides how the seats are filled.",
    '                game.minPlayers == 1 || canPlayWithBots(game)',
    '            } else {',
    '                game.minPlayers <= pageCount && game.maxPlayers >= pageCount',
    '            }',
    '',
    '        /**',
    '         * True for a game that does not seat this many people but is close',
    '         * enough to be worth showing: within one seat of the page.',
    '         *',
    '         * A 2 PLAYER page therefore also lists 1P and 3P games, a 3 PLAYER',
    '         * page also lists 2P and 4P games, and so on. Party games are still',
    '         * excluded for the reason above.',
    '         */',
    '        fun fitsNearby(game: GameManifest, pageCount: Int): Boolean {',
    '            if (game.id in PARTY_GAME_IDS) return false',
    '            return (game.minPlayers..game.maxPlayers).any { Math.abs(it - pageCount) == 1 }',
    '        }',
    '',
    '        /** Kept for callers that want the strict, exact-seat-only answer. */',
    '        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsExactly(game, pageCount)');

  // --- the page now draws from exact + nearby ---
  const call = L.findIndex(l => l.indexOf('orderForPage(filterGames(allGames, playerCount), playerCount)') >= 0);
  if (call < 0) { console.log('MISS filterGames call'); process.exit(1); }
  L[call] = '            else -> orderForPage(filterGames(allGames, playerCount), playerCount)';

  // --- ordering: NEW first, then exact, then nearby ---
  const key = L.findIndex(l => l.indexOf('{ if (it.id in NEW_GAME_IDS) 0 else 1 },') >= 0);
  if (key < 0) { console.log('MISS NEW key'); process.exit(1); }
  L.splice(key, 1,
    '                    /* NEW cohort pins to the very top, whether the game seats',
    '                       this many people exactly or is only a near miss. */',
    '                    { if (it.id in NEW_GAME_IDS) 0 else 1 },',
    '                    /* then exact fits, then the +/-1 ones, so the games that',
    '                       genuinely seat X are still the ones you see first */',
    '                    { if (fitsExactly(it, playerCount)) 0 else 1 },');

  // --- filterGames gains the nearby tier ---
  const ff = L.findIndex(l => /fun filterGames\(/.test(l || ''));
  if (ff < 0) { console.log('MISS filterGames'); process.exit(1); }
  let ffe = ff;
  { let d = 0, s = false; for (let k = ff; k < L.length; k++) { for (const c of L[k]) { if (c === '{') { d++; s = true; } else if (c === '}') { d--; if (s && d === 0) { ffe = k; k = L.length; } } } } }
  L.splice(ffe, ffe - ff + 1,
    '        /** Games an N PLAYER page lists: exact fits first, then near misses. */',
    '        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =',
    '            games.filter { fitsExactly(it, playerCount) || fitsNearby(it, playerCount) }');

  fs.writeFileSync(MA, L.join(NL(MA)));
  console.log('OK   N PLAYERS pages now include near misses, NEW still on top');
}

/* ============ 2. reset the NEW badge window ============
   GameSeenStore keys off a versioned prefs file name. Bumping v2 -> v3 makes
   every install start with an empty store, so every tile wears NEW again with
   the full 10 day window from the moment this update lands. That is how the
   catalogue was reset once already, and it needs no device-side deletion. */
{
  const G = 'app/src/main/java/com/redundantstudios/arcade/util/GameSeenStore.kt';
  let s = fs.readFileSync(G, 'utf8');
  if (s.includes('game_seen_v3')) { console.log('SKIP seen store already v3'); }
  else {
    s = s.replace('private const val PREFS = "game_seen_v2"',
      'private const val PREFS = "game_seen_v3"');
    s = s.replace('window was widened from 7 to 10 days and the existing catalogue reset in\n       * one step, instead of deleting the store on a user\'s device. */',
      'window was widened from 7 to 10 days and the existing catalogue reset in\n' +
      '       * one step, instead of deleting the store on a user\'s device.\n' +
      '\n' +
      '       * v2 -> v3 for the 1.1.0 release: every game wears NEW again for the full\n' +
      '       * window, so the new cohort is actually seen as new by people who had\n' +
      '       * the previous build installed. */');
    fs.writeFileSync(G, s);
    console.log('OK   GameSeenStore bumped to v3 - NEW restarts fresh');
  }
}