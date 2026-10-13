'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ui/ModeActivity.kt';
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);

/* Replace the whole fitsExactly + fitsNearby + fitsPageAlias block by line
   range, which is deterministic here - the previous attempt failed only because
   my search string had a typo in a comment. */
const start = L.findIndex(l => /True when the game genuinely seats this many people/.test(l || '')) - 1;
if (start < 0) { console.log('MISS start'); process.exit(1); }
const end = L.findIndex((l, k) => k > start && /fun fitsPage\(/.test(l || ''));
if (end < 0) { console.log('MISS end'); process.exit(1); }
// include that line (single-expression body)
L.splice(start, end - start + 1,
  '        /**',
  '         * Which games an N PLAYER page lists.',
  '         *',
  '         * ONE rule, one direction: a game belongs on page X if it can be played',
  '         * with X people or FEWER. Never more.',
  '         *',
  '         *   a 2-player game appears on the 3 PLAYER page   (needs 2, and 2 <= 3)',
  '         *   a 3-player game never appears on the 2 PLAYER page (needs 3 > 2)',
  '         *',
  '         * Judged on the game\'s MINIMUM, not its maximum, so a game that can fill',
  '         * a seat with a bot is never hidden from a page it could actually be',
  '         * played on.',
  '         *',
  '         * Two earlier passes got this wrong and are worth not repeating: one',
  '         * used a symmetric "+/-1" rule, which put 1-player games on the 2 PLAYER',
  '         * page; the next applied that relaxation only to the NEW cohort, so new',
  '         * and established games followed different rules on the same page.',
  '         *',
  '         * Party games are excluded: they are pass-the-phone, not a seat count,',
  '         * and they have their own tile.',
  '         */',
  '        fun fitsOnPage(game: GameManifest, pageCount: Int): Boolean {',
  '            if (game.id in PARTY_GAME_IDS) return false',
  '            return game.minPlayers <= pageCount',
  '        }',
  '',
  '        /** Kept so any caller still asking the old question compiles. */',
  '        fun fitsPage(game: GameManifest, pageCount: Int): Boolean = fitsOnPage(game, pageCount)');

fs.writeFileSync(F, L.join(NL));
const s = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  fitsOnPage  :', /fun fitsOnPage\(/.test(s));
console.log('  min rule    :', /return game\.minPlayers <= pageCount/.test(s));
console.log('  no fitsExactly:', !/fitsExactly/.test(s));
console.log('  no fitsNearby :', !/fitsNearby/.test(s));