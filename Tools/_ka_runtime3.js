'use strict';
/* Verifies the rule the director gave: as soon as the level before it is open -
   including when that open state is one an ad bought - the next level carries
   the offer. Lifts the real functions out of the game IIFE and runs them. */
const fs = require('fs');
const html = fs.readFileSync('app/src/main/assets/games/knot-away/index.html', 'utf8');

function grab(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('not found: ' + name);
  let d = 0, started = false;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') { d++; started = true; }
    else if (src[k] === '}') { d--; if (started && d === 0) return src.slice(i, k + 1); }
  }
  throw new Error('unbalanced: ' + name);
}
const names = ['starSvg', 'tempGrants', 'tempFor', 'lvlOpen', 'firstLocked', 'adEligible', 'fmtRemain', 'grantAdLevel', 'totalLevels', 'renderLevels'];
const code = names.map(n => grab(html, n)).join('\n');
const bi = html.indexOf('const BASE_LEVELS=');
const baseLevels = html.slice(bi, html.indexOf('];', bi) + 2);

global.__save = { unlocked: 9, levels: {}, settings: {}, extraLevels: 0 };
const save = global.__save;
global.__toast='';
const timers = [];
const tiles = [];
const grid = {
  _h: '', set innerHTML(v) { this._h = v; tiles.length = 0; }, get innerHTML() { return this._h; },
  appendChild(c) { tiles.push(c); },
  querySelector: () => (timers.length ? timers[0] : null),
  querySelectorAll: () => timers,
};
global.__grid = grid;
const mkEl = () => ({
  style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {}, appendChild() {}, setAttribute() {}, getAttribute: () => null,
  querySelector: () => null, querySelectorAll: () => [], remove() {},
  set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h || ''; },
});
global.__mkEl = mkEl;

(0, eval)(`var document={createElement:()=>global.__mkEl()};
var grid=global.__grid;
var $=function(){return grid};
var kaToast=function(m){global.__toast=m};
var persist=function(){};
var AudioSys={sfx:function(){}};
var haptic=function(){};
var newRun=function(){};
var startLevel=function(){};
var RM=false;
var LOCK_SVG='[lock]';
var AD_CHIP='[adchip]';
var STAR_PATH='M12 2.6l2.9 5.9';
var save=global.__save;
var AD_UNLOCK_MS=30*60*1000;
${baseLevels}
${code}`);

let fails = 0;
const ck = (label, got, want) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  if (!good) fails++;
  console.log('  ' + (good ? 'ok  ' : 'FAIL') + ' ' + label + (good ? '' : '  got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want)));
};

// levels 1-9 finished; 10 is the first shut one
const idx = () => tiles.map((t, i) => (/ad-open/.test(t.className) ? 'AD' : /ad-temp/.test(t.className) ? 'TMP' : /locked/.test(t.className) ? 'x' : 'o')).join('');

global.renderLevels();
ck('fresh: offer on level 10 only', idx(), 'oooooooooADxxxxxxxxxxo');

save.temp = { lvl: 9, until: Date.now() + 30 * 60 * 1000 };   // old single-grant save
global.renderLevels();
ck('legacy save migrates, offer moves to 11', idx(), 'oooooooooTMPADxxxxxxxxxo');

global.grantAdLevel(10);                                       // ad on level 11
global.renderLevels();
ck('after ad on 11, offer moves to 12', idx(), 'oooooooooTMPTMPADxxxxxxxxo');
ck('two grants alive at once', global.tempGrants().length, 2);
ck('toast named the level', global.__toast, 'LEVEL 11 UNLOCKED FOR 30 MIN');

// the headline case the director reported: a temporary open still frees the next
ck('temp-open makes the NEXT level eligible', global.adEligible(11), true);
ck('and not a level beyond that', global.adEligible(12), false);
ck('the ad-opened level itself is no longer offered', global.adEligible(10), false);

save.temps[1].until = Date.now() - 1;                            // level 11 lapses
global.renderLevels();
ck('lapsed grant reverts to locked, offer returns', idx(), 'oooooooooTMPADxxxxxxxxxo');
ck('lapsed grant pruned from the save', global.tempGrants().length, 1);

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'all runtime checks passed'));
