'use strict';
const fs = require('fs');

/* ---------- ad gap 90s -> 3 min ---------- */
{
  const F = 'app/src/main/java/com/redundantstudios/arcade/ads/AdPolicy.kt';
  let s = fs.readFileSync(F, 'utf8');
  s = s.replace('INTERSTITIAL_GAP_MS = 90_000L', 'INTERSTITIAL_GAP_MS = 180_000L');
  s = s.replace('once 90s have passed an', 'once 3 minutes have passed an');
  s = s.replace('a 120s interstitial gap', 'a 180s interstitial gap');
  s = s.replace(
    /\* 90s, halved from 180s at the director's request once interstitials were[\s\S]*?one short round\.\n/,
    ' * 180s. The director asked for 3 minutes because 90s allowed two interstitials\n' +
    '     * inside one short round, and a run is often shorter than that. The gap is\n' +
    '     * still what stops a mash-tap on a results card from stacking ads.\n');
  fs.writeFileSync(F, s);
  console.log('OK   interstitial gap -> 180s');
  console.log('  value :', /INTERSTITIAL_GAP_MS = 180_000L/.test(s));
  console.log('  clean :', !/90_000L/.test(s));
}