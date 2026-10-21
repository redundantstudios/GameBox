'use strict';
/*
 * COUNTS THE CANVAS DRAW CALLS A GAME MAKES PER FRAME.
 *
 * Most "it lags" reports in this project turned out to be draw calls, not
 * file size and not app size. This measures them, in the game's own real
 * playing state, and says which functions are responsible.
 *
 *   node Tools/_profile_game.mjs app/src/main/assets/games/orrery/index.html
 *   node Tools/_profile_game.mjs <file> "<js to run first, to reach real play>"
 *
 * It loads the game in a headless DOM, counts every 2D context drawing call
 * for a run of frames, and attributes each call to the function that made it.
 * The number that matters is the TOTAL PER FRAME: a game at 2,000 calls is
 * struggling on a phone, and a game at 60 is not.
 *
 * A high total with no obvious culprit usually means the calls are coming
 * from somewhere the attribution cannot see - a closure, or a function that
 * was not instrumented. That is itself a clue: look for the game's draw
 * loop and read it.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const FILE = process.argv[2];
const SETUP = process.argv[3] || '';
if (!FILE) { console.log('usage: node Tools/_profile_game.mjs <game html> [setup js]'); process.exit(1); }
if (!fs.existsSync(FILE)) { console.log('no such file: ' + FILE); process.exit(1); }

const html = fs.readFileSync(FILE, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);

/* ---------- a DOM small enough to be fast, big enough to run a game ---------- */
class Path2D { constructor() { } moveTo() { } lineTo() { } closePath() { } arc() { } quadraticCurveTo() { } }
let drawCalls = 0;
const byFn = new Map();
const stack = [];
function bump() {
  drawCalls++;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (typeof stack[i] === 'string') { byFn.set(stack[i], (byFn.get(stack[i]) || 0) + 1); return; }
  }
}
class CRC {
  createRadialGradient() { bump(); return { addColorStop() { } }; }
  createLinearGradient() { bump(); return { addColorStop() { } }; }
  createPattern() { bump(); return null; }
  measureText() { return { width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }; }
  getImageData() { return { data: new Uint8ClampedArray(4) }; }
  getLineDash() { return []; }
}
for (const m of ['fillRect', 'strokeRect', 'clearRect', 'beginPath', 'closePath', 'moveTo', 'lineTo',
  'arc', 'arcTo', 'ellipse', 'rect', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke',
  'clip', 'save', 'restore', 'translate', 'scale', 'rotate', 'setTransform', 'transform', 'drawImage',
  'fillText', 'strokeText', 'putImageData', 'setLineDash']) CRC.prototype[m] = function () { bump(); };

class FC {
  constructor() { this._w = 300; this._h = 150; this.style = {}; this._c = null; }
  get width() { return this._w; } set width(v) { this._w = Math.max(0, Math.round(Number(v) || 0)); }
  get height() { return this._h; } set height(v) { this._h = Math.max(0, Math.round(Number(v) || 0)); }
  getContext() { if (!this._c) { this._c = new CRC(); this._c.canvas = this; } return this._c; }
  toDataURL() { return 'data:,'; } toBlob(cb) { if (cb) cb(null); }
}
let sq = 0;
function mk(tag, id) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), id: id || '__e' + (sq++), children: [], dataset: {},
    _cls: new Set(), _html: '', _text: '', _l: {}, parentNode: null, offsetWidth: 100, offsetHeight: 100,
    style: new Proxy({ setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; }, getPropertyValue(k) { return this[k] || ''; } },
      { get: (t, k) => (k in t ? t[k] : ''), set: (t, k, v) => { t[k] = v; return true; } })
  };
  el.classList = {
    add: (...c) => c.forEach(x => el._cls.add(x)), remove: (...c) => c.forEach(x => el._cls.delete(x)),
    toggle: (c, on) => { const w = on === undefined ? !el._cls.has(c) : !!on; w ? el._cls.add(c) : el._cls.delete(c); return w; },
    contains: c => el._cls.has(c)
  };
  Object.defineProperty(el, 'className', { get: () => [...el._cls].join(' '), set: v => { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }, configurable: true });
  Object.defineProperty(el, 'innerHTML', { get: () => el._html, set: v => { el._html = v == null ? '' : String(v); if (!el._html) el.children = []; }, configurable: true });
  Object.defineProperty(el, 'textContent', { get: () => el._text, set: v => { el._text = v == null ? '' : String(v); }, configurable: true });
  el.appendChild = c => { el.children.push(c); c.parentNode = el; return c; };
  el.removeChild = c => { el.children = el.children.filter(x => x !== c); return c; };
  el.contains = () => false;
  el.addEventListener = (t, f) => { (el._l[t] ||= []).push(f); };
  el.removeEventListener = () => { };
  el.setAttribute = () => { }; el.getAttribute = () => null;
  el.querySelector = () => mk('div'); el.querySelectorAll = () => []; el.getElementsByTagName = () => [];
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 393, height: 851, right: 393, bottom: 851 });
  el.focus = () => { }; el.blur = () => { }; el.getContext = () => new FC().getContext();
  el.insertBefore = n => n; el.append = c => { el.children.push(c); return c; }; el.remove = () => { };
  el.scrollIntoView = () => { };
  return el;
}
function ce(id) {
  const c = new FC(), e = mk('canvas', id);
  Object.defineProperty(e, 'width', { get: () => c.width, set: v => { c.width = v; }, configurable: true });
  Object.defineProperty(e, 'height', { get: () => c.height, set: v => { c.height = v; }, configurable: true });
  e.getContext = () => c.getContext(); e.toDataURL = () => 'data:,'; e.toBlob = cb => cb && cb(null);
  return e;
}
const byId = new Map();
for (const m of html.matchAll(/<([a-zA-Z][\w-]*)([^>]*\sid="([^"]+)")/g)) {
  byId.set(m[3], /canvas/i.test(m[1]) ? ce(m[3]) : mk(m[1], m[3]));
}
const doc = {
  documentElement: mk('html'), body: mk('body'), hidden: false, _l: {},
  getElementById: id => byId.get(id) || (byId.set(id, mk('div', id)), byId.get(id)),
  createElement: t => String(t).toLowerCase() === 'canvas' ? ce() : mk(t),
  addEventListener: (t, f) => { (doc._l[t] ||= []).push(f); },
  removeEventListener: () => { },
  querySelector: () => ce(), querySelectorAll: () => [], getElementsByTagName: () => [],
  exitFullscreen: () => Promise.resolve()
};
let rafQ = [], clock = 0;
const win = {
  innerWidth: 393, innerHeight: 851, devicePixelRatio: 2, document: doc, _l: {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
  performance: { now: () => (clock += 1) },
  requestAnimationFrame: f => { rafQ.push(f); return rafQ.length; }, cancelAnimationFrame: () => { },
  setTimeout: f => { try { f(); } catch (e) { } return 1; }, clearTimeout: () => { }, setInterval: () => 1, clearInterval: () => { },
  queueMicrotask: f => f(), Promise, Math, JSON, URLSearchParams,
  navigator: { userAgent: 'Chrome/120', vibrate: () => true, maxTouchPoints: 5 },
  matchMedia: () => ({ matches: false, addEventListener() { }, addListener() { } }),
  addEventListener: (t, f) => { (win._l[t] ||= []).push(f); },
  removeEventListener: () => { }, getComputedStyle: () => ({}),
  screen: { orientation: {} }, console: { log() { }, warn() { }, error() { } },
  Event: function (t) { this.type = t; }, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
  CanvasRenderingContext2D: CRC, Path2D,
  AudioContext: function () {
    return {
      createGain: () => ({ gain: { value: 0 }, connect() { } }), createOscillator: () => ({ frequency: { value: 1 }, connect() { }, start() { } }),
      createBuffer: () => ({ getChannelData: () => new Float32Array(8) }), createBufferSource: () => ({ connect() { }, start() { }, stop() { } }),
      createBiquadFilter: () => ({ connect() { } }), destination: {}, sampleRate: 44100, currentTime: 0,
      resume() { }, suspend() { }, state: 'running', decodeAudioData: (b, cb) => cb({ duration: 1 })
    };
  },
  Worker: function () { throw new Error('no workers in the profiler'); },
  Blob: function () { }, URL: { createObjectURL: () => 'blob:x' }
};
win.window = win; win.self = win; win.globalThis = win; win.top = win; doc.defaultView = win;
const cx = vm.createContext(win);

for (let i = 0; i < scripts.length; i++) {
  try { vm.runInContext(scripts[i], cx, { filename: 's#' + i, timeout: 20000 }); }
  catch (e) { console.log('  (script ' + i + ' did not load: ' + e.message + ')'); }
}

/* Instrument the game's own functions so calls can be attributed to them. */
for (const name of Object.keys(win)) {
  if (name === 'window' || name === 'self' || name === 'globalThis' || name === 'top') continue;
  const v = win[name];
  if (typeof v !== 'function') continue;
  if (v.prototype && v.prototype !== Object.prototype && typeof v !== 'function') continue;
  try {
    const wrapped = function (...args) {
      stack.push(name);
      try { return v.apply(this, args); } finally { stack.pop(); }
    };
    wrapped.prototype = v.prototype;
    win[name] = wrapped;
  } catch (e) { }
}

if (SETUP) {
  try { vm.runInContext(SETUP, cx, { timeout: 10000 }); }
  catch (e) { console.log('  setup failed: ' + e.message); }
}

function pump(n) {
  for (let i = 0; i < n; i++) {
    const q = rafQ; rafQ = [];
    for (const f of q) { try { f(clock += 16.7); } catch (e) { } }
  }
}

pump(20);                 // let it settle
drawCalls = 0; byFn.clear();
const FRAMES = 30;
pump(FRAMES);

const perFrame = Math.round(drawCalls / FRAMES);
console.log('');
console.log('  ' + path.basename(path.dirname(FILE)) + '/' + path.basename(FILE));
console.log('  draw calls per frame : ' + perFrame);
if (!SETUP) {
  console.log('');
  console.log('  NOTE: no setup was given, so this is the MENU. The menu is usually');
  console.log('  much cheaper than the game, and a number measured here can be');
  console.log('  less than half of what the player actually pays. Pass the setup');
  console.log('  argument to reach real play before you trust a figure.');
}
if (perFrame > 1500) console.log('    ^ HIGH. On a phone this is the lag.');
else if (perFrame > 700) console.log('    ^ MODERATE. Fine on a good phone, heavy on a weak one.');
else console.log('    ^ LOW. This is not where the lag is coming from.');
console.log('');
const top = [...byFn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
if (!top.length) { console.log('  (no calls attributed - the draw loop is probably in a closure)'); }
else {
  console.log('  top functions:');
  for (const [fn, n] of top) {
    console.log('    ' + fn.padEnd(24) + Math.round(n / FRAMES) + '/frame  ' + Math.round(n / drawCalls * 100) + '%');
  }
}
console.log('');