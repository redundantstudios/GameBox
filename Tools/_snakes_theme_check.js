/* Targeted checks for Snakes & Ladders' temporary theme unlock.
 *
 * WHY THIS EXISTS
 *     The rewarded flow is the one place the game hands out something of
 *     value, and it is driven by four moving parts that a syntax check cannot
 *     see: the bridge's refusal tokens, the two-hour window, the live
 *     countdown, and what happens when the window closes while the player is
 *     still using that theme. Each has a failure mode that looks fine on
 *     screen:
 *       - a payout on "closed"/"limit_reached" is a free theme,
 *       - an unlock that never expires is not the feature that was asked for,
 *       - a countdown that stops at 0:00 leaves a theme that should be locked,
 *       - an expired theme that stays applied silently bypasses the ad.
 *
 *     So this boots the REAL game through the smoke harness (reusing its DOM
 *     stub) and drives the real bridge callbacks.
 *
 * Run: node Tools/_snakes_theme_check.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { boot } = require('./_smoke_games');

const FILE = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games',
  'snakes-and-ladders', 'index.html');

let failures = 0;
let checks = 0;
function ok(cond, label, detail) {
  checks++;
  if (cond) { console.log('  PASS  ' + label); return; }
  failures++;
  console.log('  FAIL  ' + label + (detail ? '  [' + detail + ']' : ''));
}
function eq(got, want, label) {
  ok(got === want, label, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
}

/* ---- real bridge: exact arity, one callback name per request ---- */
const saved = new Map();
const calls = { rewarded: [], interstitial: [] };
let lastReward = null;
const bridge = {
  showRewardedAd(cb, placement, kind) {
    calls.rewarded.push({ cb, placement, kind, arity: arguments.length });
    lastReward = cb;
  },
  showInterstitial(cb, placement) {
    calls.interstitial.push({ cb, placement, arity: arguments.length });
  },
  save(k, v) { saved.set(k, String(v)); },
  load(k) { return saved.has(k) ? saved.get(k) : null; },
  haptic() {},
  exitGame() {},
  newRun() {}
};

const html = fs.readFileSync(FILE, 'utf8');
const r = boot(html, 'snakes-and-ladders', { bridge });
const run = (expr) => vm.runInContext(expr, r.ctx);

console.log('SNAKES & LADDERS - THEME UNLOCK');
console.log('==================================================');

const errors = [...new Set(r.errors)].filter((e) => !/^\s+at /.test(e));
ok(errors.length === 0, 'game boots clean', errors.slice(0, 2).join(' | '));

/* ---- 1. the window is two hours ---- */
eq(run('THEME_UNLOCK_MS'), 2 * 60 * 60 * 1000, 'unlock window is exactly 2 hours');

/* ---- 2. countdown formatting ---- */
const formats = [
  [2 * 60 * 60 * 1000, '2:00:00'],
  [3661000, '1:01:01'],
  [3599000, '59:59'],
  [59000, '00:59'],
  [1000, '00:01'],
  [0, '00:00']
];
for (const [ms, want] of formats) {
  eq(run('fmtRemaining(' + ms + ')'), want, 'fmtRemaining(' + ms + ')');
}

/* ---- 3. an old array save becomes a two-hour unlock ---- */
run("store.set('sl_unlocked',['ocean'])");
const migrated = JSON.parse(run('JSON.stringify(getThemeUnlocks())'));
const left = (migrated.ocean || 0) - Date.now();
ok(left > 2 * 60 * 60 * 1000 - 5000 && left <= 2 * 60 * 60 * 1000,
  'legacy array unlock migrates to 2 hours', 'left=' + left);

/* ---- 4. every refusal token pays nothing ---- */
const refusals = ['closed', 'unavailable', 'offline', 'cooldown', 'cooldown:42',
  'limit_reached', 'forbidden', 'first_session'];
for (const token of refusals) {
  run("store.set('sl_unlocked',{})");
  run("AdManager.pendingTheme='jungle';AdManager.watch();");
  const call = calls.rewarded[calls.rewarded.length - 1];
  if (!call) { ok(false, token + ' reaches the bridge'); continue; }
  ok(call.arity === 3, token + ': rewarded bridge call has arity 3', 'arity=' + call.arity);
  r.sandbox[call.cb](token);
  const unlock = JSON.parse(run('JSON.stringify(getThemeUnlocks())'));
  ok(!unlock.jungle, token + ' does not unlock a theme');
}

/* ---- 5. "granted" pays out for two hours ---- */
run("store.set('sl_unlocked',{})");
run("AdManager.pendingTheme='jungle';AdManager.watch();");
const grant = calls.rewarded[calls.rewarded.length - 1];
ok(grant && grant.placement === 'theme_unlock', 'rewarded placement is theme_unlock',
  grant ? grant.placement : 'no call');
r.sandbox[grant.cb]('granted');
const unlock = JSON.parse(run('JSON.stringify(getThemeUnlocks())'));
const span = (unlock.jungle || 0) - Date.now();
ok(span > 2 * 60 * 60 * 1000 - 5000 && span <= 2 * 60 * 60 * 1000,
  '"granted" unlocks for 2 hours', 'left=' + span);
eq(run('THEME.id'), 'jungle', 'granted theme is applied immediately');
ok(typeof r.sandbox[grant.cb] === 'undefined', 'reward callback is deleted after payout');

/* ---- 6. the countdown badge is on the theme tile ---- */
run("curPanel='themes';renderThemeGrid()");
const tiles = run("document.querySelector('#themeGrid').children.map(c=>c.innerHTML)");
ok(tiles.length === run('THEMES.length'), 'one tile per theme', 'tiles=' + tiles.length);
ok(tiles.some((h) => h.indexOf('data-theme="jungle"') >= 0),
  'unlocked theme shows a countdown badge');
ok(tiles.some((h) => h.indexOf('LOCKED') >= 0), 'locked themes still offer the ad');
run("curPanel='home'");

/* ---- 7. expiry reverts the theme and clears the badge ---- */
run("store.set('sl_unlocked',{jungle:Date.now()-1000})");
run("applyTheme('jungle')");
let ticked = 0;
for (const fn of r.intervals) {
  try { fn(); ticked++; } catch (_) {}
}
ok(ticked > 0, 'the countdown tick runs');
eq(run('THEME.id'), 'classic', 'expired theme falls back to Classic');
eq(run("store.get('sl_theme','classic')"), 'classic', 'the fallback is persisted');
const after = JSON.parse(run('JSON.stringify(getThemeUnlocks())'));
ok(!after.jungle, 'expired unlock is removed from storage');

console.log('==================================================');
console.log(failures ? failures + ' of ' + checks + ' checks FAILED' : 'all ' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
