'use strict';
/* ModeActivity, done in one pass with exact whole-block string replacement.
   Brace counting is wrong for expression-bodied Kotlin (`fun x() = if (...)`),
   which is how the previous attempts corrupted this file. */
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
let s = fs.readFileSync(F, 'utf8');

function swap(label, from, to) {
  if (!s.includes(from)) { console.log('MISS  ' + label); process.exit(1); }
  if (s.split(from).length - 1 !== 1) { console.log('AMBIGUOUS ' + label); process.exit(1); }
  s = s.replace(from, to);
  console.log('OK    ' + label);
}

/* 1. import the NEW cohort */
swap('import NEW_GAME_IDS',
  'import com.redundantstudios.arcade.model.GameManifest',
  'import com.redundantstudios.arcade.model.GameManifest\nimport com.redundantstudios.arcade.model.NEW_GAME_IDS');

/* 2. fitsPage -> fitsExactly, plus a near-miss tier */
const OLD_FITS = `        /** True when the game can actually be opened with this many people. */
        fun fitsPage(game: GameManifest, pageCount: Int): Boolean =
            if (game.id in PARTY_GAME_IDS) {
                // Party games are pass-the-phone, NOT a seat-count crowd. They
                // must never appear in the 1/2/3/4 PLAYER tiles - a player
                // tapping "2 PLAYER" wants games that genuinely seat two. They
                // live in their own Party Games tile (and in All Games, which
                // lists everything, as it should).
                false
            } else if (pageCount == 1) {
                // One human alone: either the game genuinely seats 1, or it can
                // fill the rest with bots. Opening one never forces bot mode -
                // the game's own menu decides how the seats are filled.
                game.minPlayers == 1 || canPlayWithBots(game)
            } else {
                game.minPlayers <= pageCount && game.maxPlayers >= pageCount
            }`;

const NEW_FITS = `        /** True when the game genuinely seats this many people. */
        fun fitsExactly(game: GameManifest, pageCount: Int): Boolean =
            if (game.id in PARTY_GAME_IDS) {
                // Party games are pass-the-phone, NOT a seat-count crowd. They
                // must never appear in the 1/2/3/4 PLAYER tiles - a player
                // tapping "2 PLAYER" wants games that genuinely seat two. They
                // live in their own Party Games tile (and in All Games, which
                // lists everything, as it should).
                false
            } else if (pageCount == 1) {
                // One human alone: either the game genuinely seats 1, or it can
                // fill the rest with bots. Opening one never forces bot mode -
                // the game's own menu decides how the seats are filled.
                game.minPlayers == 1 || canPlayWithBots(game)
            } else {
                game.minPlayers <= pageCount && game.maxPlayers >= pageCount
            }

        /**
         * True for a game that does not seat this many people but is close
         * enough to be worth listing: within one seat of the page.
         *
         * The director asked for an N PLAYER page to show X+1 and X-1 games as
         * well, because somebody browsing "2 PLAYER" does not want a wall of
         * two-seat games and nothing else. Party games stay excluded for the
         * reason given in [fitsExactly].
         */
        fun fitsNearby(game: GameManifest, pageCount: Int): Boolean {
            if (game.id in PARTY_GAME_IDS) return false
            return (game.minPlayers..game.maxPlayers).any { Math.abs(it - pageCount) == 1 }
        }

        /** Strict answer, for anything that wants exact-seat-only. */
        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsExactly(game, pageCount)`;
swap('fitsExactly + fitsNearby', OLD_FITS, NEW_FITS);

/* 3. the page draws from both tiers */
const OLD_FILTER = `        /** Single source of truth for which games belong to a player count. */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { fitsPage(it, playerCount) }`;
const NEW_FILTER = `        /**
         * Games an N PLAYER page lists: everything that seats this many people
         * exactly, plus the games one seat either side of it.
         */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { fitsExactly(it, playerCount) || fitsNearby(it, playerCount) }`;
swap('filterGames union', OLD_FILTER, NEW_FILTER);

/* 4. NEW cohort on top, exact fits above near misses */
const OLD_ORDER = `            return games.sortedWith(
                compareBy(
                    { groupFor(it) },`;
const NEW_ORDER = `            return games.sortedWith(
                compareBy(
                    /* NEW games pin to the very top of the page, whether they seat
                       this many people exactly or are only a near miss. */
                    { if (it.id in NEW_GAME_IDS) 0 else 1 },
                    /* then exact fits, then the +/-1 ones, so the games that really
                       do seat X are still the first thing you see. */
                    { if (fitsExactly(it, playerCount)) 0 else 1 },
                    { groupFor(it) },`;
swap('orderForPage NEW-first', OLD_ORDER, NEW_ORDER);

/* 5. doc */
swap('orderForPage doc',
  `         * Order an N PLAYER page: tightest-fitting games first, then the ones
         * that stretch to more people, and within each group the newest game
         * first, then A-Z.`,
  `         * Order an N PLAYER page: the NEW cohort first, then games that seat
         * this many people exactly, then the near misses, then the ones that
         * stretch to more people - and within each group the newest first, then
         * A-Z.`);

fs.writeFileSync(F, s);
console.log('\nverify:');
console.log('  fitsExactly   :', /fun fitsExactly\(/.test(s));
console.log('  fitsNearby    :', /fun fitsNearby\(/.test(s));
console.log('  fitsPage kept :', /fun fitsPage\(/.test(s));
console.log('  union filter  :', /fitsExactly\(it, playerCount\) \|\| fitsNearby\(it, playerCount\)/.test(s));
console.log('  NEW key       :', /if \(it\.id in NEW_GAME_IDS\) 0 else 1/.test(s));
console.log('  canPlay once  :', (s.match(/canPlayWithBots\(game\)/g) || []).length === 1);
console.log('  lines         :', s.split(/\r?\n/).length);