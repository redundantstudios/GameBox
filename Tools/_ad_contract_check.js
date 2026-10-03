/* Lints the rewarded-ad contract across every integrated game.
 *
 * WHY THIS EXISTS
 *     A rewarded ad pays out real value - a revive, a continue, a power-up.
 *     The bridge can answer "granted", "closed", "unavailable", or refuse with
 *     "limit_reached"/"cooldown". Anything that grants on a REFUSAL is free
 *     value, and it hides the ad cap: the player hits the limit, is told no,
 *     and is handed the reward anyway.
 *
 *     That exact bug shipped. The shared shim read
 *       if (result !== 'closed' && result !== 'unavailable') reward();
 *     so "limit_reached" and "cooldown" both counted as success. Ten games
 *     inherited it from one file, and two legacy games still carried their own
 *     copy. A deny-list is the wrong shape: any refusal token added later
 *     silently becomes a payout. Only "granted" may grant.
 *
 *     It also checks for a single shared global callback. Two overlapping
 *     requests then race on one function: the first ad pays out the second
 *     action, and the overwritten request never settles at all.
 *
 * USAGE
 *     node _ad_contract_check.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const GAMES = path.join(ROOT, 'app', 'src', 'main', 'assets', 'games');
const SHIM = path.join(ROOT, 'Tools', '_shell', 'sdk.html');

const problems = [];
const note = (file, msg) => problems.push({ file, msg });

/* Strips block+line comments so a rule is never "found" inside a comment. */
function strip(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

function checkFile(file, html) {
  const code = strip(html);
  const rel = path.relative(ROOT, file);

  /* 1. deny-list payout: any "not closed and not unavailable" => reward. */
  const deny = /!\s*==\s*['"]closed['"][^;]{0,80}?!\s*==\s*['"]unavailable['"][^;]{0,120}?(reward|onReward|grant)/i.exec(code);
  if (deny) note(rel, 'deny-list payout: a non-failure token grants the reward');

  /* 2. The reward must be gated on the explicit 'granted' token SOMEWHERE -
         a shim may legitimately forward the raw token and let the consumer
         decide (ludo and planetmerge both do exactly that). Checking only the
         shim produced false alarms on games that are already correct, and a
         linter that cries wolf gets ignored. */
  if (/\.rewarded\s*\(|showRewardedAd\s*\(/.test(code)) {
    const gated = /['"]granted['"]/.test(code);
    if (!gated) note(rel, 'rewarded flow with no reference to the "granted" token at all');
    /* A deny-shaped gate anywhere is fraud even if a correct one also exists. */
    if (/\b(result|res|r)\s*!==\s*['"]closed['"]/.test(code) && !/['"]granted['"]/.test(code)) {
      note(rel, 'reward granted on a non-closed token');
    }
  }

  /* 3. one shared global callback across concurrent requests. */
  if (/window\.__studioAdCb\s*=\s*function|window\[['\"]__studioAdCb['\"]\]\s*=/.test(code)) {
    note(rel, 'fixed global __studioAdCb: overlapping requests race on one callback');
  }

  /* 4. EXACT ARITY on every bridge call.
        addJavascriptInterface matches by EXACT arity: a call with too few
        arguments THROWS rather than defaulting the rest. Both ad entry points
        were broken this way, in every game at once:
          showRewardedAd(callback, placement, kind)  - 3 params, 18 of 20 sent 1
          showInterstitial(callback, placement)     - 2 params, 19 of 20 sent 1
        The throw was caught by a bare `catch(_)` and reported as a generic
        "unavailable", so both the reward and the ad break silently never
        happened, app-wide, with nothing in the logs to show for it.

        Checked against the Kotlin signatures, not guessed. Scoped to bridge
        calls: a game may define its own `showRewardedAd` wrapper (root.io
        does), and flagging that would be a false positive. */
  const ARITY = [
    { method: 'showRewardedAd', argc: 3, why: 'callback, placement, kind' },
    { method: 'showInterstitial', argc: 2, why: 'callback, placement' }
  ];
  for (const spec of ARITY) {
    const re = new RegExp(
      '(?:\\bb|NativeBridge|bridge\\(\\))\\s*\\.\\s*' + spec.method +
      '\\(\\s*([^()]*?)\\s*\\)', 'g');
    let mm;
    while ((mm = re.exec(code)) !== null) {
      const inner = mm[1];
      // Count top-level commas only - a nested call or object would skew this.
      let depth = 0, commas = 0, hasContent = false;
      for (const ch of inner) {
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (ch === ',' && depth === 0) commas++;
        else if (ch.trim()) hasContent = true;
      }
      const sent = hasContent ? commas + 1 : 0;
      if (sent !== spec.argc) {
        note(rel, 'bridge ' + spec.method + ' called with ' + sent +
          ' argument(s), needs ' + spec.argc + ' (' + spec.why + ') - the call will throw');
      }
    }
  }

  /* 5. A catch whose entire body is "report unavailable" is how a broken bridge
        call masquerades as a network problem for the player. Matched tightly:
        a legitimate `if(!b||!b.showRewardedAd){onFail('unavailable')}` guard
        is a different thing and must not trip this. */
  if (/catch\s*\([^)]*\)\s*\{\s*(?:try\s*\{[^}]*\}\s*;?\s*)?if\s*\(\s*onFail\s*\)\s*onFail\s*\(\s*['"]unavailable['"]\s*\)\s*;?\s*\}/.test(code)) {
    note(rel, 'swallows a bridge exception and reports it as "unavailable" (looks like a network problem)');
  }

  /* NOTE: there is deliberately no "must mention unavailable" rule. Both a
     `showRewardedAd` call and a watchdog satisfy that need, and a watchdog
     (ludo) is the better pattern because it cannot hang. Flagging the literal
     word would have failed a correct game. */
}

console.log('AD CONTRACT LINT');
console.log('==================================================');

const targets = [{ file: SHIM, html: fs.readFileSync(SHIM, 'utf8') }];
for (const d of fs.readdirSync(GAMES)) {
  const f = path.join(GAMES, d, 'index.html');
  if (fs.existsSync(f)) targets.push({ file: f, html: fs.readFileSync(f, 'utf8') });
}

for (const t of targets) checkFile(t.file, t.html);

if (!problems.length) {
  console.log(`OK  ${targets.length} file(s) satisfy the rewarded contract`);
  console.log('==================================================');
  process.exit(0);
}
const byFile = new Map();
for (const p of problems) {
  if (!byFile.has(p.file)) byFile.set(p.file, []);
  byFile.get(p.file).push(p.msg);
}
for (const [file, msgs] of byFile) {
  console.log('FAIL ' + file);
  for (const m of [...new Set(msgs)]) console.log('       - ' + m);
}
console.log('==================================================');
console.log(`${problems.length} problem(s) across ${byFile.size} file(s)`);
process.exit(1);
