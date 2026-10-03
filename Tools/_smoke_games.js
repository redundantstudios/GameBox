/* Smoke-runs every integrated game: it EXECUTES the game's real script inside a
 * stubbed DOM and reports anything that throws.
 *
 * WHY THIS EXISTS
 *     Verifying that a file parses proves only that it parses. It does not prove
 *     the game boots. A single TypeError at load time leaves the player staring
 *     at the static menu markup over a dead canvas - the page "looks" loaded
 *     (title, buttons, HUD) while nothing is rendering at all. That exact bug
 *     shipped to a device once already: root.io died on `save.unlocked` being
 *     read before `save` was assigned. Every syntax check passed and the game
 *     was unplayable.
 *
 *     So: run it, drive the frame loop, and click the main buttons.
 *
 * USAGE
 *     node _smoke_games.js            # every game
 *     node _smoke_games.js root-io    # just one
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.dirname(__dirname);
const GAMES = path.join(ROOT, 'app', 'src', 'main', 'assets', 'games');

/* ---- a DOM stub complete enough to boot a canvas game ---- */
function makeEl(id, tag) {
  const listeners = {};
  const el = {
    id: id || '',
    tagName: (tag || 'div').toUpperCase(),
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } },
    dataset: {}, children: [],
    textContent: '', value: '',
    checked: false, disabled: false, hidden: false,
    clientWidth: 300, clientHeight: 150,
    offsetWidth: 300, offsetHeight: 150, width: 300, height: 150,
    parentNode: null,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, on) { if (on === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else { on ? this._s.add(c) : this._s.delete(c); } }
    },
    addEventListener(ev, fn) { (listeners[ev] || (listeners[ev] = [])).push(fn); },
    removeEventListener() {},
    appendChild(c) {
      /* A real appendChild MOVES the node: it is removed from its previous parent
         first. Without that, the extremely common
           while (d.firstChild) document.body.appendChild(d.firstChild);
         never terminates, because firstChild is children[0] and the child is
         never taken out of d. Ember hit exactly this and was parked as MANUAL
         "does not terminate" - a phantom failure caused by the stub, not the
         game. It appended 112 million nodes before the array length blew up. */
      const prev = c && c.parentNode;
      if (prev && prev.children && prev.children !== el.children) {
        const i = prev.children.indexOf(c);
        if (i >= 0) prev.children.splice(i, 1);
      }
      el.children.push(c); c.parentNode = el; return c;
    },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    getElementsByTagName() { return []; },
    querySelector() { return makeEl('', 'div'); },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 300, bottom: 150, width: 300, height: 150, x: 0, y: 0 }; },
    closest() { return null; },
    focus() {}, blur() {}, click() {}, remove() {
      const p = el.parentNode;
      if (p && p.children) { const i = p.children.indexOf(el); if (i >= 0) p.children.splice(i, 1); }
    },
    getContext(kind) { return /webgl/i.test(kind || '') ? null : ctx2d(); },
    dispatch(ev, e) { (listeners[ev] || []).forEach((fn) => fn(e || fakeEvent(el))); }
  };
  /* Games do `el.innerHTML = '<svg…>'` and then append `el.firstChild`. The stub
     cannot parse markup, so synthesise one child whenever innerHTML is set to a
     non-empty string - otherwise the append receives undefined and the report
     shows a failure that does not exist in a real browser. */
  let _html = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _html; },
    set(v) {
      _html = String(v == null ? '' : v);
      el.children.length = 0;
      if (_html.trim()) {
        const ch = makeEl('', 'div');
        /* parentNode must be set, or appendChild cannot tell that this node
           already belongs to el and will not detach it when moving. Ember's
           `while (d.firstChild) document.body.appendChild(d.firstChild)`
           then spins forever. A real DOM always keeps parentNode in step. */
        ch.parentNode = el;
        el.children.push(ch);
      }
    },
    enumerable: true, configurable: true
  });
  Object.defineProperty(el, 'firstChild', {
    get() { return el.children[0] || null; }, enumerable: true, configurable: true
  });
  Object.defineProperty(el, 'firstElementChild', {
    get() { return el.children[0] || null; }, enumerable: true, configurable: true
  });
  return el;
}

function ctx2d() {
  const grad = { addColorStop() {} };
  const target = {
    canvas: { width: 300, height: 150 },
    measureText() { return { width: 10 }; },
    createLinearGradient() { return grad; },
    createRadialGradient() { return grad; },
    createPattern() { return {}; },
    getImageData() { return { data: [0, 0, 0, 0] }; },
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, (w || 1) * (h || 1) * 4)) }; },
    getContextAttributes() { return { precision: 'highp' }; },
    isPointInPath() { return false; }
  };
  return new Proxy(target, {
    get(t, k) { if (k in t) return t[k]; return () => undefined; },
    set() { return true; }
  });
}

/* A permissive WebGL stub. Three.js-style engines probe a lot of context
   attributes at construction; without this they die on the first missing one
   and the report blames the game for something the harness never provided. */
function webgl2d() {
  const nums = new Set(['STENCIL_BITS', 'DEPTH_BITS', 'MAX_TEXTURE_SIZE', 'MAX_TEXTURE_IMAGE_UNITS',
    'MAX_VERTEX_ATTRIBS', 'MAX_VERTEX_UNIFORM_VECTORS', 'MAX_VARYING_VECTORS', 'MAX_COMBINED_TEXTURE_IMAGE_UNITS',
    'MAX_TEXTURE_MAX_ANISOTROPY_EXT', 'MAX_SAMPLES', 'MAX_ARRAY_TEXTURE_LAYERS', 'MAX_3D_TEXTURE_SIZE',
    'MAX_CUBE_MAP_TEXTURE_SIZE', 'MAX_RENDERBUFFER_SIZE', 'MAX_VIEWPORT_DIMS', 'ALIASED_LINE_WIDTH_RANGE',
    'ALIASED_POINT_SIZE_RANGE', 'MAX_ELEMENTS_VERTICES', 'MAX_ELEMENTS_INDICES', 'SCISSOR_BOX', 'VIEWPORT',
    'MAX_COLOR_ATTACHMENTS', 'MAX_DRAW_BUFFERS', 'MAX_VERTEX_TEXTURE_IMAGE_UNITS', 'PARAMETER_MAX_TEXTURE_MAX_ANISOTROPY_EXT']);
  const enums = new Set(['getParameter']);
  const obj = {
    canvas: { width: 300, height: 150 },
    getContextAttributes() { return { alpha: true, antialias: true, depth: true, stencil: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false }; },
    getSupportedExtensions() { return ['EXT_texture_filter_anisotropic', 'WEBGL_debug_renderer_info', 'OES_texture_float', 'WEBGL_lose_context']; },
    getShaderPrecisionFormat() { return { rangeMin: 127, rangeMax: 127, precision: 23 }; },
    getParameter(p) { return nums.has(p) ? 16 : null; },
    getExtension() { return { TEXTURE_MAX_ANISOTROPY_EXT: 34046, MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047, UNMASKED_RENDERER_WEBGL: 37446, UNMASKED_VENDOR_WEBGL: 37445 }; },
    getProgramParameter() { return true; },
    getShaderParameter() { return true; },
    getActiveUniform() { return { name: 'u', size: 1, type: 0 }; },
    getActiveAttrib() { return { name: 'a', size: 1, type: 0 }; },
    getUniformLocation() { return {}; },
    getAttribLocation() { return 0; },
    getError() { return 0; },
    isContextLost() { return false; },
    createBuffer() { return {}; },
    createTexture() { return {}; },
    createFramebuffer() { return {}; },
    createRenderbuffer() { return {}; },
    createProgram() { return {}; },
    createShader() { return {}; },
    createVertexArray() { return {}; },
    getExtensionInfo() { return {}; }
  };
  return new Proxy(obj, {
    get(t, k) { if (k in t) return t[k]; return () => undefined; },
    set() { return true; }
  });
}

function fakeEvent(el) {
  return {
    type: 'click', target: el, currentTarget: el, button: 0, key: 'x',
    clientX: 10, clientY: 10, pointerId: 1, identifier: 1,
    preventDefault() {}, stopPropagation() {}, touches: [], changedTouches: []
  };
}

function boot(html, gameId) {
  const els = new Map();
  const getEl = (id) => { if (!els.has(id)) els.set(id, makeEl(id, 'div')); return els.get(id); };

  let rafQ = [];
  const store = new Map();
  /* Games log banner art and diagnostics on load. Keep that out of the report
     so a real failure is the only thing on screen. */
  const quiet = { log() {}, info() {}, debug() {}, trace() {}, warn() {}, error() {} };
  const sandbox = {
    console: quiet,
    setTimeout: () => 0, clearTimeout() {},
    setInterval: () => 0, clearInterval() {},
    requestAnimationFrame(fn) { rafQ.push(fn); return rafQ.length; },
    cancelAnimationFrame() {},
    performance: { now: () => Date.now() },
    devicePixelRatio: 2,
    innerWidth: 412, innerHeight: 892,
    screen: {
      orientation: { type: 'portrait', angle: 0, addEventListener() {}, removeEventListener() {}, lock: () => Promise.resolve(), unlock() {} },
      width: 412, height: 892, availWidth: 412, availHeight: 892,
      colorDepth: 24, pixelDepth: 24
    },
    location: {
      href: 'file:///android_asset/games/index.html', protocol: 'file:', host: '', hostname: '',
      port: '', pathname: '/android_asset/games/index.html', search: '', hash: '', origin: 'null',
      reload() {}, assign() {}, replace() {}
    },
    navigator: { vibrate() {}, userAgent: 'node' },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    },
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    AudioContext: function () {
      this.currentTime = 0; this.state = 'running'; this.destination = {};
      this.sampleRate = 44100; this.state = 'running';
      const g = { value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
      /* Every AudioNode the game can ask for, wired to the same shape. Audio
         graphs are chainable, and a factory that returns undefined makes the
         game look broken when only the stub is incomplete. */
      const node = () => ({
        connect() { return node(); }, disconnect() {},
        gain: g, frequency: g, threshold: g, knee: g, ratio: g,
        attack: g, release: g, delayTime: g, Q: g, detune: g,
        pan: g, value: 0, type: '', channelCount: 2, buffer: null, loop: false,
        start() {}, stop() {}, getChannelData: () => new Float32Array(4),
        setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}
      });
      return new Proxy(this, {
        get(t, k) {
          if (k in t) return t[k];
          if (typeof k === 'string' && /^create/.test(k)) return () => node();
          return undefined;
        },
        set() { return true; }
      });
    },
    /* Browser globals a handful of games touch at load. */
    URLSearchParams, URL, TextEncoder, TextDecoder, MutationObserver: function () {
      return { observe() {}, disconnect() {}, takeRecords() { return []; } };
    }, ResizeObserver: function () {
      return { observe() {}, unobserve() {}, disconnect() {} };
    }, IntersectionObserver: function () {
      return { observe() {}, unobserve() {}, disconnect() {} };
    },
    getComputedStyle: () => new Proxy({ getPropertyValue: () => '' }, {
      get: (t, k) => (k in t ? t[k] : ''), set: () => true
    }),
    Image: function () { this.width = 0; this.height = 0; },
    HTMLImageElement: function () {},
    Audio: function () { this.play = () => Promise.resolve(); this.pause = () => {}; this.volume = 1; },
    addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return true; }
  };
  /* Constructor-style globals some games feature-detect on. */
  const classStub = function () {};
  sandbox.Element = classStub;
  sandbox.HTMLElement = classStub;
  sandbox.HTMLCanvasElement = classStub;
  sandbox.CanvasRenderingContext2D = classStub;
  sandbox.WebGLRenderingContext = classStub;
  sandbox.OffscreenCanvas = classStub;
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.document = {
    getElementById: getEl,
    querySelector: (sel) => getEl(sel),
    querySelectorAll: () => [],
    createElement: (tag) => makeEl('', tag),
    createElementNS: (_ns, tag) => makeEl('', tag),
    addEventListener() {}, removeEventListener() {},
    body: makeEl('body', 'body'),
    documentElement: makeEl('html', 'html'),
    fullscreenElement: null,
    visibilityState: 'visible'
  };
  sandbox.document.documentElement.requestFullscreen = () => Promise.resolve();

  /* The shell bridge that the integrator's SDK shim talks to. */
  const granted = { rewarded: 0, interstitial: 0, banner: 0 };
  sandbox.NativeBridge = {
    showRewardedAd() {
      granted.rewarded++;
      const f = sandbox.window['__studioAdCb']; if (f) f('granted');
    },
    showInterstitial(cb) {
      granted.interstitial++;
      const f = sandbox.window['__studioInterstitialCb']; if (f) f('closed');
      if (cb) cb();
    },
    showBanner() { granted.banner++; },
    hideBanner() {},
    save() {}, load() { return null; },
    haptic() {}, exitGame() {}
  };

  const ctx = vm.createContext(sandbox);
  const scripts = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);

  const errors = [];
  for (const src of scripts) {
    try { vm.runInContext(src, ctx, { filename: gameId + '.js' }); }
    catch (e) {
      errors.push('script: ' + (e && e.message));
      if (process.env.SMOKE_DEBUG) errors.push((e && e.stack) || '');
    }
  }

  /* Drive the real frame loop, then the main entry buttons. */
  const step = (n) => {
    let t = 0;
    for (let i = 0; i < n; i++) {
      const q = rafQ; rafQ = [];
      t += 16.7;
      for (const cb of q) {
        try { cb(t); }
        catch (e) { errors.push('frame: ' + (e && e.message)); if (errors.length > 4) return; }
      }
    }
  };
  const click = (id) => { const el = els.get(id); if (el) el.dispatch('click'); };

  const phases = [
    ['boot', () => step(12)],
    ['play', () => { click('btnPlay'); step(25); }],
    ['again', () => { click('btnAgain'); step(15); }],
    ['menu', () => { click('btnGoMenu'); step(10); }],
    ['lab', () => { click('btnCustomize'); step(10); }]
  ];
  for (const [, fn] of phases) {
    try { fn(); } catch (e) { errors.push(e && e.message); }
  }
  return { errors, granted };
}

/* ---- run ---- */
const only = process.argv.slice(2);
const ids = fs.readdirSync(GAMES)
  .filter((d) => fs.existsSync(path.join(GAMES, d, 'index.html')))
  .filter((d) => !only.length || only.includes(d));

/* Games that genuinely cannot be judged under the stub. Reported as MANUAL -
   neither passed nor failed - because a stub-induced outcome says nothing about
   the game on a real device.

   Both entries that were here have been removed:
     echo  - deleted from the catalogue; its folder is gone.
     ember - was blamed on the stub's appendChild, which appended without
             detaching from the previous parent. With that fixed ember boots
             cleanly and is tested like everything else. Keeping a phantom
             "does not terminate" entry would have meant ember was never
             actually executed by this harness at all. */
const MANUAL = {};

let bad = 0;
let skipped = 0;
let manual = 0;
console.log('GAME                BOOT   ERRORS');
console.log('--------------------------------------------------');
for (const id of ids) {
  if (MANUAL[id]) {
    manual++;
    console.log(id.padEnd(20) + 'MANUAL'.padEnd(7) + MANUAL[id]);
    continue;
  }
  const html = fs.readFileSync(path.join(GAMES, id, 'index.html'), 'utf8');
  /* A real GPU is not something a stub can fake. Games that ask for a WebGL
     context are reported as device-only rather than failed: passing them here
     would be a fiction, and failing them would be our stub's fault. */
  if (/getContext\(\s*['"]webgl|WebGLRenderingContext|THREE\./i.test(html)) {
    skipped++;
    console.log(id.padEnd(20) + 'SKIP'.padEnd(7) + 'webgl - needs a device');
    continue;
  }
  let r;
  try { r = boot(html, id); }
  catch (e) { r = { errors: ['harness: ' + e.message] }; }
  const uniq = [...new Set(r.errors)];
  const ok = uniq.filter((x) => !/^\s+at /.test(x)).length === 0;
  if (!ok) bad++;
  const shown = process.env.SMOKE_DEBUG ? uniq : uniq.filter((x) => !/^\s+at /.test(x)).slice(0, 2);
  console.log(id.padEnd(20) + (ok ? 'ok' : 'FAIL').padEnd(7) + (ok ? '-' : shown.join(' | ')));
}
console.log('--------------------------------------------------');
const clean = ids.length - skipped - manual;
console.log(bad === 0
  ? `${clean} boot clean, ${manual} manual, ${skipped} webgl-skip`
  : `${bad} FAILED (of ${clean + bad} checked)`);
process.exit(bad ? 1 : 0);
