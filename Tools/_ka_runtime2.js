'use strict';
/* Same technique as _ka_runtime.js: lift the real functions out of the game
   IIFE and run them. Now also pins the badge order and walks the unlock rule. */
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
const bi = html.indexOf('const BASE_LEVELS=');
const baseLevels = html.slice(bi, html.indexOf('];', bi) + 2);

global.__save = { unlocked: 1, levels: {}, settings: {}, extraLevels: 0 };
const save = global.__save;
let toastText = '', persisted = 0;
const tiles = [];
const grid = {
  _h: '', set innerHTML(v) { this._h = v; tiles.length = 0; }, get innerHTML() { return this._h; },
  appendChild(c) { tiles.push(c); }, querySelector: () => null, querySelectorAll: () => [],
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
var startLevel=function(){};
var RM=false;
var LOCK_SVG='[lock]';
var AD_CHIP='[adchip]';
var STAR_PATH='M12 2.6l2.9 5.9';
var save=global.__save;
${baseLevels}
${code}`);

let fails = 0;
const ck = (label, got, want) => {
  const good = got === want;
  if (!good) fails++;
  console.log('  ' + (good ? 'ok  ' : 'FAIL') + ' ' + label + (good ? '' : '  got="' + got + '" want="' + want + '"'));
};
const render = () => { global.renderLevels(); return tiles; };

console.log('badge order on an ad-opened level');
save.unlocked = 1;
save.temp = { lvl: 1, until: Date.now() + 30 * 60 * 1000 };
let t = render();
const html2 = t[1]._h;
ck('timer comes before the number', html2.indexOf('t-timer') < html2.indexOf('t-num'), true);
ck('timer present', /t-timer/.test(html2), true);
ck('number still present', /class="t-num">2</.test(html2), true);
ck('not locked', / locked/.test(t[1].className), false);
ck('badge order in raw markup', t[1]._h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').slice(0, 30), '|30:00|2|');

console.log('\nunlock rule: which levels carry the offer');
const classes = n => { render(); return tiles.slice(0, n).map(x => x.className); };

save.temp = null;
ck('fresh: L1 open, L2 offers',
  classes(3).join(' '), 'tile current tile locked ad-open tile locked');

save.unlocked = 4;                       // levels 1-4 done
save.levels = {0:{stars:3,moves:9,time:60},1:{stars:2,moves:11,time:80},2:{stars:1,moves:14,time:99},3:{stars:3,moves:10,time:70}};
ck('after 4 levels: L5 offers',
  classes(6).join(' '),
  'tile tile tile tile tile locked ad-open tile locked');

save.temp = { lvl: 4, until: Date.now() + 60 * 1000 };
ck('granted: L5 open w/ countdown, L6 still locked, no offer on L6',
  classes(6).join(' '),
  'tile tile tile tile tile ad-temp tile locked');

save.temp = { lvl: 4, until: Date.now() - 1 };
ck('lapsed: L5 locked again and offers',
  classes(6).join(' '),
  'tile tile tile tile tile locked ad-open tile locked');

console.log('\nadEligible truth table (save.unlocked=4, total=' + global.totalLevels() + ')');
for (const i of [0, 3, 4, 5, 6, global.totalLevels()]) {
  console.log('  level index ' + i + ' -> ' + global.adEligible(i));
}
save.temp = { lvl: 4, until: Date.now() + 60000 };
console.log('  with a live grant on index 4:');
for (const i of [4, 5]) console.log('  level index ' + i + ' -> ' + global.adEligible(i));
save.temp = { lvl: 9, until: Date.now() + 60000 };
console.log('  with a grant on a FAR level (index 9), index 4 -> ' + global.adEligible(4)
  + '  (offer still shows: not suppressed)');
save.temp = null;

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'all runtime checks passed'));

