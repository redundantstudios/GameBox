'use strict';
const fs = require('fs');

/* ---------- 1. Chinese Checkers is a SIX player game ---------- */
{
  const F = 'app/src/main/assets/games/chinese-checkers/index.html';
  let s = fs.readFileSync(F, 'utf8');
  const from = 'maxPlayers: 5';
  const to = 'maxPlayers: 6';
  if (!s.includes(from)) { console.log('MISS maxPlayers'); process.exit(1); }
  if (s.split(from).length - 1 !== 1) { console.log('AMBIGUOUS maxPlayers'); process.exit(1); }
  s = s.replace(from, to);
  fs.writeFileSync(F, s);
  console.log('OK    chinese-checkers maxPlayers 5 -> 6 (tile now reads 6P)');
}

/* ---------- 2. Rule A: show a game on page X if it needs X or fewer ---------- */
{
  const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
  let s = fs.readFileSync(F, 'utf8');

  const swap = (label, from, to) => {
    if (!s.includes(from)) { console.log('MISS ' + label); process.exit(1); }
    if (s.split(from).length - 1 !== 1) { console.log('AMBIGUOUS ' + label); process.exit(1); }
    s = s.replace(from, to);
    console.log('OK   ' + label);
  };

  // replace fitsExactly + fitsNearby with the single one-way rule
  swap('fitsExactly/fitsNearby -> fitsOnPage',
`        /** True when the game genuinely seats this many people. */
        fun fitsExactly(game: GameManifest, pageCount: Int): Boolean =
            if (game.id in PARTY_GAME_IDS) {
                // Party games are pass-the-phone, NOT a seat-count crowd. They
                // must never appear in the 1/2/3/4/PLAYER tiles - a player
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
            // NEW cohort only. Relaxing it for every game put 1-player games on
            // the 2 PLAYER page and 2-player games on the 3 PLAYER page, which
            // is not what an N PLAYER page is meant to mean.
            if (game.id !in NEW_GAME_IDS) return false
            return (game.minPlayers..game.maxPlayers).any { Math.abs(it - pageCount) == 1 }
        }

        /** Strict answer, for anything that wants exact-seat-only. */
        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsExactly(game, pageCount)`,

`        /**
         * Which games an N PLAYER page lists.
         *
         * ONE rule, one direction: a game belongs on page X if it can be played
         * with X people or FEWER. Never more.
         *
         *   - a 2-player game appears on the 3 PLAYER page  (needs 2, 2 <= 3)
         *   - a 3-player game never appears on the 2 PLAYER page (needs 3 > 2)
         *
         * Judged on the game's MINIMUM, not its maximum, so a game that can fill
         * a seat with a bot is never hidden from a page it could actually be
         * played on. An earlier pass used a symmetric "+/-1" rule, which put
         * 1-player games on the 2 PLAYER page and made every page inconsistent;
         * a later pass applied that relaxation only to NEW games, so new and
         * established games followed different rules on the same page. Both are
         * gone.
         *
         * Party games are excluded: they are pass-the-phone, not a seat count,
         * and they have their own tile.
         */
        fun fitsOnPage(game: GameManifest, pageCount: Int): Boolean {
            if (game.id in PARTY_GAME_IDS) return false
            return game.minPlayers <= pageCount
        }

        /** Kept so any caller asking the old question still compiles. */
        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsOnPage(game, pageCount)`);

  swap('filterGames uses the single rule',
`        /**
         * Games an N PLAYER page lists.
         *
         * Established games appear only when they seat this many people exactly.
         * The NEW cohort is also allowed one seat either side, because a new
         * game is not always an exact match for every page and would otherwise
         * be invisible on most of them - which defeats the point of pinning it
         * to the top in the first place.
         */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { fitsExactly(it, playerCount) || fitsNearby(it, playerCount) }`,
`        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */
        fun filterGames(games: List<GameManifest>, playerCount: Int): List<GameManifest> =
            games.filter { fitsOnPage(it, playerCount) }`);

  swap('ordering drops the exact/near split',
`                compareBy(
                    /* NEW games pin to the very top of the page, whether they seat
                       this many people exactly or are only a near miss. */
                    { if (it.id in NEW_GAME_IDS) 0 else 1 },
                    /* then exact fits, then the +/-1 ones, so the games that really
                       do seat X are still the first thing you see. */
                    { if (fitsExactly(it, playerCount)) 0 else 1 },
                    { groupFor(it) },`,
`                compareBy(
                    /* NEW cohort pins to the very top of the page. */
                    { if (it.id in NEW_GAME_IDS) 0 else 1 },
                    { groupFor(it) },`);

  swap('orderForPage doc',
`         * Order an N PLAYER page: the NEW cohort first, then games that seat
         * this many people exactly, then the near misses, then the ones that
         * stretch to more people - and within each group the newest first, then
         * A-Z.`,
`         * Order an N PLAYER page: the NEW cohort first, then the games that fit
         * this count most tightly, then the ones that stretch to more people -
         * and within each group the newest first, then A-Z.`);

  fs.writeFileSync(F, s);
  console.log('\nverify:');
  console.log('  single rule      :', /fun fitsOnPage\(/.test(s));
  console.log('  fitsNearby gone  :', !/fitsNearby/.test(s));
  console.log('  fitsExactly gone :', !/fitsExactly/.test(s));
  console.log('  filterGames      :', /games\.filter \{ fitsOnPage\(it, playerCount\) \}/.test(s));
}