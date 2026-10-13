'use strict';
/* Rule A, applied by EXACT line ranges read off the file. No searching, no
   backwards walks - both of those are what corrupted this file three times. */
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

// sanity: the anchors must be exactly where they were when read
if (!/fun fitsExactly\(/.test(L[102])) { console.log('ABORT line 103 is not fitsExactly'); process.exit(1); }
if (!/fun fitsPage\(/.test(L[138])) { console.log('ABORT line 139 is not fitsPage'); process.exit(1); }
if (!/fitsExactly\(it, playerCount\) \|\| fitsNearby/.test(L[206])) { console.log('ABORT line 207 mismatch'); process.exit(1); }
if (!/if \(fitsExactly\(it, playerCount\)\)/.test(L[156])) { console.log('ABORT line 157 mismatch'); process.exit(1); }
console.log('anchors confirmed');

/* ---- replace lines 102..139 (1-based) = index 101..138 ---- */
L.splice(101, 39 - 1,
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
  '         *',
  '         * Two earlier passes got this wrong: a symmetric "+/-1" rule put',
  '         * 1-player games on the 2 PLAYER page, and the next applied that',
  '         * relaxation only to NEW games, so new and established games followed',
  '         * different rules on the same page.',
  '         */',
  '        fun fitsOnPage(game: GameManifest, pageCount: Int): Boolean {',
  '            if (game.id in PARTY_GAME_IDS) return false',
  '            return game.minPlayers <= pageCount',
  '        }',
  '',
  '        /** Kept so any caller still asking the old question compiles. */',
  '        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsOnPage(game, pageCount)');

/* ---- ordering key: find it fresh by content, single line only ---- */
{
  const k = L.findIndex(l => /if \(fitsExactly\(it, playerCount\)\) 0 else 1/.test(l || ''));
  if (k < 0) { console.log('MISS order key'); process.exit(1); }
  L.splice(k - 2, 3);   // the key plus its two comment lines
  console.log('OK   ordering: exact/near key + its comment removed');
}

/* ---- filterGames ---- */
{
  const i = L.findIndex(l => /fitsExactly\(it, playerCount\) \|\| fitsNearby/.test(l || ''));
  if (i < 0) { console.log('MISS filterGames body'); process.exit(1); }
  L[i] = '            games.filter { fitsOnPage(it, playerCount) }';

  const d = L.findIndex((l, k) => k < i && /Established games appear only when/.test(l || ''));
  if (d >= 0) {
    let e = d;
    while (e < L.length && L[e].trim() !== '*/') e++;
    L.splice(d, e - d + 1, '        /** Games an N PLAYER page lists: see [fitsOnPage] for the rule. */');
  }
  console.log('OK   filterGames uses fitsOnPage');
}

/* ---- orderForPage doc ---- */
{
  const d = L.findIndex(l => /Order an N PLAYER page: the NEW cohort first/.test(l || ''));
  if (d >= 0) {
    let e = d;
    while (e < L.length && L[e].trim() !== '*/') e++;
    L.splice(d, e - d + 1,
      '        /**',
      '         * Order an N PLAYER page: the NEW cohort first, then the games that',
      '         * fit this count most tightly, then the ones that stretch to more',
      '         * people - and within each group the newest first, then A-Z.',
      '         */');
    console.log('OK   orderForPage doc');
  }
}

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  fitsOnPage     :', /fun fitsOnPage\(/.test(s));
console.log('  min rule       :', /return game\.minPlayers <= pageCount/.test(s));
console.log('  no fitsExactly :', !/fitsExactly/.test(s));
console.log('  no fitsNearby  :', !/fitsNearby/.test(s));
console.log('  NEW on top     :', /if \(it\.id in NEW_GAME_IDS\) 0 else 1/.test(s));
console.log('  groupFor       :', /fun groupFor\(/.test(s));
console.log('  class intact   :', /^package com\.redundantstudios\.arcade\.ui/m.test(s) && /compareBy\(/.test(s));