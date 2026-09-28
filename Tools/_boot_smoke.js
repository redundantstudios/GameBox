/* Boots the shell-integrated games in a stubbed DOM and reports anything their
   own top-level code throws, so a bad integration patch fails here instead of
   on the phone.  Usage: node Tools/_boot_smoke.js [game-id ...]  */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'app', 'src', 'main', 'assets', 'games');
const noop = () => {};
const grad = { addColorStop: noop };
const ids = process.argv.slice(2).filter(a => !a.startsWith('-'));
if (!ids.length) {
  for (const name of fs.readdirSync(ASSETS).sort()) {
    if (fs.existsSync(path.join(ASSETS, name, 'index.html'))) ids.push(name);
  }
}
function ctxStub() {
  return new Proxy({}, { get: (t, k) => {
    if (k === 'canvas') return { width: 0, height: 0 };
    if (k === 'measureText') return s => ({ width: String(s).length * 7 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
    if (k === 'getImageData') return () => ({ data: [] });
    if (k === 'getLineDash') return () => [];
    return typeof k === 'string' ? noop : undefined;
  }, set: () => true });
}
let bad = 0;
for (const id of ids) {
  const src = fs.readFileSync(path.join(ASSETS, id, 'index.html'), 'utf8');
  const blocks = [...src.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const base = { style: { setProperty: noop, removeProperty: noop, getPropertyValue: () => '' },
    dataset: {}, children: [], childNodes: [], firstChild: null, lastChild: null, nextSibling: null,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, removeEventListener: noop, appendChild: noop, append: noop,
    insertBefore: noop, setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    remove: noop, focus: noop, blur: noop, getContext: () => ctxStub(),
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 1080, height: 600, x: 0, y: 0 }),
    clientWidth: 1080, clientHeight: 600, offsetWidth: 100, offsetHeight: 40,
    scrollWidth: 1080, scrollHeight: 600, querySelector: () => null, querySelectorAll: () => [],
    setPointerCapture: noop, releasePointerCapture: noop, contains: () => false,
    parentElement: null, parentNode: null, innerHTML: '', textContent: '', tagName: 'DIV', id: '' };
  const el = () => Object.create(base);
  const s = { console, setTimeout: noop, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    document: { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
      createElement: () => el(), createElementNS: () => el(), addEventListener: noop,
      removeEventListener: noop, body: el(), head: el(), documentElement: el(), hidden: false,
      fonts: { load: () => Promise.resolve(), ready: Promise.resolve() } },
    navigator: { userAgent: 'node', maxTouchPoints: 5, vibrate: noop },
    location: { search: '', href: 'file:///x', protocol: 'file:' },
    performance: { now: () => Date.now() }, devicePixelRatio: 2, innerWidth: 1080, innerHeight: 600,
    addEventListener: noop, removeEventListener: noop,
    matchMedia: () => ({ matches: false, addListener: noop, addEventListener: noop }),
    history: { replaceState: noop }, Audio: function () { return { play: noop, pause: noop }; },
    URLSearchParams, Image: function () {}, ImageData: function () {}, Promise, Math, Date, JSON,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    screen: { wakeLock: null, orientation: { lock: () => Promise.resolve(), unlock: noop } } };
  s.window = s; s.globalThis = s; s.self = s; s.top = s; s.parent = s;
  s.Element = function Element() {}; s.Element.prototype = { matches: () => false };
  s.CanvasRenderingContext2D = function CanvasRenderingContext2D() {};
  s.CanvasRenderingContext2D.prototype = { roundRect: noop, createLinearGradient: () => grad, createRadialGradient: () => grad };
  vm.createContext(s);
  let err = null;
  try { vm.runInContext(blocks.join('\n;\n'), s, { filename: id + '.js', timeout: 20000 }); }
  catch (e) { err = e; }
  // Three.js games ask for a real GPU the moment the renderer is built; that is
  // the one failure a stubbed DOM cannot rule out, so it is reported, not failed.
  const needsGl = err && /WebGL|getShaderPrecisionFormat|precision/.test(err.message);
  if (err && !needsGl) { bad++; console.log('FAIL ' + id + ' :: ' + err.message); }
  else if (needsGl) console.log('OK   ' + id + ' :: reaches the point that needs a real GPU (' + err.message + ')');
  else console.log('PASS ' + id + ' :: ' + blocks.length + ' script blocks ran clean');
}
process.exit(bad ? 1 : 0);
