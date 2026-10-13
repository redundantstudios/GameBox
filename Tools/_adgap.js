'use strict';
const fs = require('fs');
const F = 'app/src/main/java/com/redundantstudios/arcade/ads/AdPolicy.kt';
let s = fs.readFileSync(F, 'utf8');

const from = `     * The cap is gone. Frequency is now the gap alone: once 90s have passed an
     * ad is READY, and it waits there until the player taps a natural break
     * (Play Again / Home / Menu). The ad never fires on a timer by itself, so it
     * can never ambush someone mid-action - the player's own tap is what shows
     * it, which is why no separate count is needed.
     *
     * 90s, halved from 180s at the director's request once interstitials were
     * added to every game's completion and pause buttons. The gap is what stops
     * a mash-tap on a results card from stacking ads, and 90s still means a
     * player cannot see two interstitials in one short round.
     */
    const val INTERSTITIAL_GAP_MS = 90_000L`;

const to = `     * The cap is gone. Frequency is now the gap alone: once 3 minutes have
     * passed an ad is READY, and it waits there until the player taps a natural
     * break (Play Again / Home / Menu). The ad never fires on a timer by itself,
     * so it can never ambush someone mid-action - the player's own tap is what
     * shows it, which is why no separate count is needed.
     *
     * 180s. The director asked for 3 minutes because the previous 90s allowed two
     * interstitials inside one short round, and a run is often shorter than that.
     * The gap is still what stops a mash-tap on a results card from stacking ads.
     */
    const val INTERSTITIAL_GAP_MS = 180_000L`;

if (!s.includes(from)) { console.log('MISS gap block'); process.exit(1); }
if (s.split(from).length - 1 !== 1) { console.log('AMBIGUOUS'); process.exit(1); }
s = s.replace(from, to);

// the file header still describes the old number
s = s.replace(/\* at the director's request: a 120s interstitial gap, revives limited to one per/,
  "* at the director's request: a 180s interstitial gap, revives limited to one per");

fs.writeFileSync(F, s);
console.log('OK   interstitial gap 90s -> 180s (3 min)');
const out = fs.readFileSync(F, 'utf8');
console.log('\nverify:');
console.log('  value       :', /INTERSTITIAL_GAP_MS = 180_000L/.test(out));
console.log('  no 90_000L  :', !/INTERSTITIAL_GAP_MS = 90_000L/.test(out));
console.log('  docs match  :', /once 3 minutes have/.test(out));