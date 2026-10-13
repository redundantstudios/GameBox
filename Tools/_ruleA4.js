'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* Rule A, in one pass.
 *
 * An N PLAYER page lists a game if it can be played with X people or FEWER.
 * Judged on the game's MINIMUM. Never more than the page.
 *
 * Two earlier passes got this wrong: a symmetric "+/-1" rule that put 1-player
 * games on the 2 PLAYER page, then a version that applied that relaxation only
 * to the NEW cohort, so new and established games followed different rules on
 * the same page. Both gone - one rule, one direction.
 *
 * Done by line range from anchors I have just read off the file, so there is
 * nothing to mistype.
 */

/* ---- 1. the filter block: fitsExactly + fitsNearby + alias -> fitsOnPage ---- */
{
  const start = L.findIndex(l => /True when the game genuinely seats this many people/.test(l || '')) - 1;
  const end = L.findIndex((l, k) => k > start && /fun fitsPage\(/.test(l || ''));
  if (start < 0 || end < 0) { console.log('MISS filter block', start, end); process.exit(1); }
  console.log('replacing filter block lines ' + (start + 1) + '-' + (end + 1));

  L.splice(start, end - start + 1,
    '        /**',
    '         * Which games an N PLAYER page lists.',
    '         *',
    '         * ONE rule, one direction: a game belongs on page X if it can be',
    '         * played with X people or FEWER. Never more.',
    '         *',
    '         *   a 2-player game appears on the 3 PLAYER page    (needs 2, 2 <= 3)',
    '         *   a 3-player game never appears on the 2 PLAYER page (needs 3 > 2)',
    '         *',
    "         * Judged on the game's MINIMUM, not its maximum, so a game that can",
    '         * fill a seat with a bot is never hidden from a page it could really',
    '         * be played on.',
    '         *',
    '         * Party games are excluded: they are pass-the-phone, not a seat',
    '         * count, and they have their own tile.',
    '         */',
    '        fun fitsOnPage(game: GameManifest, pageCount: Int): Boolean {',
    '            if (game.id in PARTY_GAME_IDS) return false',
    '            return game.minPlayers <= pageCount',
    '        }',
    '',
    '        /** Kept so any caller still asking the old question compiles. */',
    '        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsOnPage(game, pageCount)');
}

/* ---- 2. ordering: keep NEW on top, drop the exact/near split key ---- */
{
  const k = L.findIndex(l => /fitsExactly\(it, playerCount\)/.test(l || ''));
  if (k < 0) { console.log('MISS order key'); process.exit(1); }
  // the two comment lines immediately above it belong to that key
  let c = k - 1;
  while (c > 0 && !/NEW cohort pins/.test(L[c])) c--;
  L.splice(c, k - c + 1);
  console.log('OK   ordering: exact/near key removed, NEW key kept');
}

/* ---- 3. filterGames: the single rule ---- */
{
  const i = L.findIndex(l => /fitsExactly\(it, playerCount\) \|\| fitsNearby\(it, playerCount\)/.test(l || ''));
  if (i < 0) { console.log('MISS filterGames body'); process.exit(1); }
  L[i] = '            games.filter { fitsOnPage(it, playerCount) }';
  console.log('OK   filterGames uses fitsOnPage');

  const d = L.findIndex((l, k) => k < i && /Established games appear only when/.test(l || ''));
  if (d >= 0) {
    let e = d;
    while (e < L.length && L[e].trim() !== '*/') e++;
    L.splice(d, e - d + 1, '        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */');
    console.log('OK   filterGames doc');
  }
}

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  fitsOnPage present :', /fun fitsOnPage\(/.test(s));
console.log('  min rule           :', /return game\.minPlayers <= pageCount/.test(s));
console.log('  no fitsExactly     :', !/fitsExactly/.test(s));
console.log('  no fitsNearby      :', !/fitsNearby/.test(s));
console.log('  NEW still on top   :', /if \(it\.id in NEW_GAME_IDS\) 0 else 1/.test(s));
console.log('  groupFor intact    :', /fun groupFor\(/.test(s));
console.log('  compareBy count    :', (s.match(/compareBy\(/g) || []).length);