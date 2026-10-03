/* Catalogue-wide ad audit. One pass, one table.
   Reports, per shipped game: whether a real rewarded ad is wired, whether a
   fake ad placeholder is present (the Root.io / Kiro trap), whether an
   interstitial is requested, and whether the game exposes the two things a
   rewarded ad is actually FOR - a continue/revive, and skins/teams. */
const fs = require('fs');
const path = require('path');
const A = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const n = (h, re) => (h.match(re) || []).length;
const rows = [];

for (const id of fs.readdirSync(A).sort()) {
  const f = path.join(A, id, 'index.html');
  if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, 'utf8');

  const rewardedStudio = n(h, /Studio\.ads\.rewarded\s*\(/g);
  const rewardedPortal = n(h, /requestAd\(\s*['"]rewarded['"]/g);
  const interStudio = n(h, /Studio\.ads\.interstitial\s*\(/g);
  const interPortal = n(h, /requestAd\(\s*['"](?:midgame|midGame|interstitial)['"]/g);
  /* Some games hold the bridge in a local alias (b.showInterstitial) rather
     than going through Studio. Missing these made balloon-battle and ludo look
     like they had no interstitial at all, when both already had one wired. */
  const interAlias = n(h, /\b[A-Za-z_$][\w$]*\.showInterstitial\s*\(/g) -
                      n(h, /NativeBridge\.showInterstitial\s*\(/g) -
                      n(h, /Studio\.ads\.interstitial\s*\(/g);

  /* A direct bridge call bypasses the allow-list and is where the arity trap
     lives (showRewardedAd needs 3 args, showInterstitial needs 2). */
  const direct = n(h, /NativeBridge\.(?:showRewardedAd|showInterstitial)\s*\(/g);

  const fake = /TEST PLACEHOLDER|__testAdOverlay/.test(h);
  const hasCont = /CONTINUE|RETRY|REVIVE|WATCH AD|watch-ad/i.test(h);
  const hasSkin = /skin|SKIN|outfit|costume|avatar|unlock|equip/i.test(h);

  rows.push({
    id,
    rewarded: rewardedStudio + rewardedPortal,
    interstitial: interStudio + interPortal + interAlias,
    direct,
    fake,
    cont: hasCont,
    skin: hasSkin
  });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('GAME', 20) + pad('REWARDED', 10) + pad('INTERSTIT', 11) +
            pad('DIRECT', 8) + pad('FAKE', 6) + pad('CONTINUE', 10) + 'SKINS/UNLOCKS');
console.log('-'.repeat(78));
for (const r of rows) {
  console.log(pad(r.id, 20) +
    pad(r.rewarded || '-', 10) +
    pad(r.interstitial || '-', 11) +
    pad(r.direct || '-', 8) +
    pad(r.fake ? 'YES!' : '-', 6) +
    pad(r.cont ? 'yes' : '-', 10) +
    (r.skin ? 'yes' : '-'));
}
console.log('\n' + rows.length + ' games shipped');
const noRewarded = rows.filter((r) => !r.rewarded && r.cont);
const noInter = rows.filter((r) => !r.interstitial);
const fakes = rows.filter((r) => r.fake);
const direct = rows.filter((r) => r.direct);
console.log('continue/revive but NO rewarded ad : ' + (noRewarded.map((r) => r.id).join(', ') || 'none'));
console.log('no interstitial at all             : ' + (noInter.map((r) => r.id).join(', ') || 'none'));
console.log('fake ad placeholder present        : ' + (fakes.map((r) => r.id).join(', ') || 'none'));
console.log('direct bridge calls (arity risk)   : ' + (direct.map((r) => r.id + '(' + r.direct + ')').join(', ') || 'none'));