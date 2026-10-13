'use strict';
const fs = require('fs');
const path = require('path');
const F = path.join('app', 'src', 'main', 'assets', 'games', 'knot-away', 'index.html');
const NL = fs.readFileSync(F, 'utf8').includes('\r\n') ? '\r\n' : '\n';
const L = fs.readFileSync(F, 'utf8').split(NL);
const done = [];
const ok = n => { done.push(n); console.log('OK   ' + n); };

/* ---------- 1. countdown above the level number ----------
   The tile is a column flexbox, so markup order is visual order. The number
   came first, which put the timer under it; swapped so the timer reads as a
   badge over the number rather than a footnote. */
{
  const i = L.findIndex(l => /\?\`<span class="t-num">\$\{i\+1\}<\/span><span class="t-timer"/.test(l || ''));
  if (i < 0) { console.log('MISS temp tile markup'); process.exit(1); }
  L[i] = '      ?`<span class="t-timer" data-until="${tmp.until}">${fmtRemain(tmp.until-Date.now())}</span><span class="t-num">${i+1}</span><span class="t-stars">${[0,1,2].map(s=>starSvg(rec&&rec.stars>s)).join(\'\')}</span>`';
  ok('timer now renders above the level number');

  // a little breathing room between badge and number
  const c = L.findIndex(l => /^\.tile \.t-timer\{/.test(l || ''));
  if (c < 0) { console.log('MISS timer css'); process.exit(1); }
  L[c] = L[c].replace('padding:2px 6px;border-radius:8px;min-width:42px;text-align:center}',
    'padding:2px 6px;border-radius:8px;min-width:42px;text-align:center;margin-bottom:4px');
  ok('timer badge spacing');
}

/* ---------- 2. the ad offer follows the previous level ----------
   The rule is "a level can be opened by ad as soon as the one before it is
   open", which for a linear list is the first locked level. Kept that as the
   single source of truth and dropped the branch that suppressed the offer
   whenever any ad grant existed: a grant is only ever created on the first
   locked level, so it could only ever hide the offer on the level that was
   already open. */
{
  const i = L.findIndex(l => /^function adEligible\(i\)\{/.test(l || ''));
  if (i < 0) { console.log('MISS adEligible'); process.exit(1); }
  let end = i;
  while (end < L.length && L[end].trim() !== '}') end++;
  L.splice(i, end - i + 1,
    '/* Which level a rewarded ad can open.',
    ' *',
    ' * The rule the player sees is simple: as soon as the level before it is',
    ' * open, this one can be opened with an ad. For a linear list that is the',
    ' * first locked level - index save.unlocked - and nothing further along.',
    ' *',
    ' * The old version also refused to show any offer while a previous 30-minute',
    ' * grant was still running. That could never be useful: a grant is only ever',
    ' * placed on the first locked level, so the offer it suppressed was the one on',
    ' * the level already open. Dropped so the rule reads as the single condition',
    ' * it actually is. */',
    'function adEligible(i){',
    '  if(i<save.unlocked) return false;      /* already open outright */',
    '  const t=tempLevel();',
    '  if(t && t.lvl===i) return false;       /* the ad grant is already on it */',
    '  return i===save.unlocked && i<totalLevels();',
    '}');
  ok('adEligible states the rule directly');
}

fs.writeFileSync(F, L.join(NL));
const out = fs.readFileSync(F, 'utf8');
console.log('\nchecks:');
console.log('  edits     :', done.length + '/3');
console.log('  order     :', /t-timer"[^>]*>\$\{fmtRemain[^`]*<\/span><span class="t-num"/.test(out));
console.log('  eligible  :', /return i===save\.unlocked && i<totalLevels\(\);/.test(out));
console.log('  old guard gone:', !/another level holds the offer/.test(out));