'use strict';
/* renderLevels lives inside the game's IIFE, so it cannot be reached from outside.
   Pull the real source of the level-list functions out of the file and run them
   against a stub DOM. This is what catches a temporal dead zone or a broken
   template - both of which parse perfectly and only fail on screen. */
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

const names = ['starSvg', 'tempLevel', 'lvlOpen', 'adEligible', 'fmtRemain', 'grantAdLevel', 'totalLevels', 'renderLevels'];
const code = names.map(n => grab(html, n)).join('\n');

/* totalLevels() reads BASE_LEVELS, which is a const inside the same IIFE */
const bi = html.indexOf('const BASE_LEVELS=');
if (bi < 0) throw new Error('BASE_LEVELS not found');
const be = html.indexOf('];', bi) + 2;
const baseLevels = html.slice(bi, be);
console.log('BASE_LEVELS: ' + ((baseLevels.match(/\{/g) || []).length) + ' entries');

const AD_UNLOCK_MS = 30 * 60 * 1000;
global.__save = { unlocked: 1, levels: {}, settings: {}, extraLevels: 0 };
const save = global.__save;
let persisted = 0, toastText = '';
const $ = () => grid;

const tiles = [];
const grid = {
  _h: '',
  set innerHTML(v) { this._h = v; tiles.length = 0; },
  get innerHTML() { return this._h; },
  appendChild(c) { tiles.push(c); },
  querySelector: () => null,
  querySelectorAll: () => [],
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
var kaToast=function(m){toastText=m};
var persist=function(){persisted++};
var AudioSys={sfx:function(){}};
var haptic=function(){};
var newRun=function(){};
var startLevel=function(i){global.__started=i};
var RM=false;
var LOCK_SVG='[lock]';
var AD_CHIP='[adchip]';
var STAR_PATH='M12 2.6l2.9 5.9';
var save=global.__save;
${baseLevels}
${code}
global.renderLevels=renderLevels; global.tempLevel=tempLevel;
global.adEligible=adEligible; global.lvlOpen=lvlOpen; global.fmtRemain=fmtRemain;
global.grantAdLevel=grantAdLevel;`);

console.log('extracted: ' + names.join(', '));
console.log('');

function run(label, expect) {
  try {
    global.renderLevels();
    const t0 = tiles[0], t1 = tiles[1];
    const timer = (t1 && t1._h || '').match(/t-timer"[^>]*>([0-9:]+)</);
    console.log('ok   ' + label);
    console.log('       tiles=' + tiles.length
      + '  t0="' + (t0 ? t0.className : '?') + '"'
      + '  t1="' + (t1 ? t1.className : '?') + '"'
      + '  timer=' + (timer ? timer[1] : 'none'));
    if (expect) expect(t0, t1, timer);
  } catch (e) {
    console.log('FAIL ' + label + ': ' + e.message);
  }
}

run('fresh save - level 1 locked, level 2 shows the offer', (t0, t1) => {
  if (/locked/.test(t0.className)) console.log('  !! level 1 is open and must NOT be locked');
  if (!/ad-open/.test(t1.className)) console.log('  !! expected t1 ad-open');
  if (!/\[adchip\]/.test(t1._h)) console.log('  !! expected the ad chip on t1');
});

save.temp = { lvl: 1, until: Date.now() + 30 * 60 * 1000 };
run('ad granted - level 2 open with a live countdown', (t0, t1, timer) => {
  if (/locked/.test(t0.className)) console.log('  !! level 1 should not be locked');
  if (!timer) console.log('  !! expected a countdown on t1');
  else if (!/^29:5\d$|^30:00$/.test(timer[1])) console.log('  !! odd countdown: ' + timer[1]);
});

save.temp = { lvl: 1, until: Date.now() - 1 };
run('grant expired - level 2 locked again, no countdown', (t0, t1) => {
  if (!/locked/.test(t1.className)) console.log('  !! level 2 lapsed and must be locked again');
  if (/t-timer/.test(t1._h)) console.log('  !! countdown should be gone');
});

console.log('\nfmtRemain spot checks:');
[[30 * 60 * 1000, '30:00'], [90 * 1000, '01:30'], [9 * 1000, '00:09'], [0, '00:00'], [-5, '00:00']]
  .forEach(([ms, want]) => {
    const got = global.fmtRemain(ms);
    console.log('  ' + (got === want ? 'ok  ' : 'FAIL') + ' fmtRemain(' + ms + ') = ' + got + (got === want ? '' : ' (want ' + want + ')'));
  });


