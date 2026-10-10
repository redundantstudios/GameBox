/* Phase B audit: does THIS handler body ask for an interstitial?
 *
 * The earlier proximity version was unreliable because it matched lines near a
 * trigger rather than inside the handler. This extracts the handler body -
 * from addEventListener(...) to its matching close - and looks for an ad call
 * inside it, which is what actually determines whether a button shows one.
 *
 * Run: node Tools/_handler_coverage.js [game ...]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'assets', 'games');
const GAMES2 = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

const AD = /ads\.interstitial\(|showInterstitial|withInterstitial\(|withAd\(|gameInterstitial|requestAd\(|interstitialOnce/;

// Button names that mean each moment.
const MOMENT = {
  'restart': /again|retry|restart|rematch|replay|playagain/i,
  'menu': /menu|home|quit|exit/i,
  'resume': /resume/i,
};

const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
const list = ids.length ? ids : fs.readdirSync(GAMES2).sort();

/* Pull every `something.addEventListener('click', function(){ ... })` body by
 * brace counting, and record whether an ad call appears inside it. */
function handlers(src) {
  const out = [];
  const re = /addEventListener\(\s*['"](click|touchend|pointerdown)['"]\s*,\s*(?:async\s*)?(?:function\s*\w*\s*\([^)]*\)\s*\{|\(?\s*\w*\s*\)?\s*=>\s*\{)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = src.indexOf('{', m.index);
    if (start < 0) continue;
    let depth = 0, i = start;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    const body = src.slice(start, i + 1);
    // The nearest id/name before this binding, for labelling.
    const before = src.slice(Math.max(0, m.index - 90), m.index);
    const idm = /[$\(](['"]?)([A-Za-z_][\w-]*)\1\s*\)?\s*(?:\.|\[)?\s*$/.exec(before);
    const label = idm ? idm[2] : (before.match(/([A-Za-z_][\w-]*)\s*$/) || [, '?'])[1];
    const line = src.slice(0, m.index).split('\n').length;
    out.push({ label, line, body, ad: AD.test(body) });
  }
  return out;
}

for (const g of list) {
  const f = path.join(GAMES2, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const hs = handlers(src);
  if (!hs.length) { console.log('=== ' + g + ': no click handlers parsed'); continue; }

  console.log('\n=== ' + g + ' ===');
  for (const [moment, re] of Object.entries(MOMENT)) {
    const rel = hs.filter(h => re.test(h.label));
    if (!rel.length) continue;
    const withAd = rel.filter(h => h.ad).length;
    console.log('  ' + moment.padEnd(9) + rel.length + ' handler(s), ' + withAd + ' with an ad');
    rel.forEach(h => console.log('      ' + (h.ad ? 'AD  ' : '--  ') + String(h.line).padStart(5) + ' ' + h.label));
  }
}