/* Behavioural check for Ember's first-tap sound.
 *
 * The bug this guards: on the very first gesture the AudioContext is created
 * during the event, and `resume()` is ASYNCHRONOUS, so `ac.state` is still
 * 'suspended' for the remainder of that same event. A `wake()` that returned
 * `ac.state==='running'` therefore made every sound on the first tap drop
 * itself - which is what the player heard as "the first tap is silent".
 *
 * This runs Ember's REAL audio block against a mock context that reproduces
 * that exact timing (resume only lands on the NEXT task, as in a browser),
 * then asserts that a click sound was actually scheduled on the first tap.
 *
 *   node _check_ember_first_tap.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games', 'ember', 'index.html'),
  'utf8');

/* The Snd IIFE runs from the AUDIO banner comment to the "day-cycle palettes"
   banner. The start anchor is the opening /* of the banner, not the word
   AUDIO, or the slice begins inside the comment. The end is cut back to the
   IIFE's own "})();" so the shell wiring that follows is not dragged in - it
   references names this standalone harness does not define. */
const start = HTML.lastIndexOf('/*', HTML.indexOf('AUDIO v10'));
const end = HTML.indexOf('/* ================= day-cycle palettes');
if (start < 0 || end < 0 || end <= start) {
  throw new Error('could not locate the Ember audio block');
}
const src = HTML.slice(start, end);

const scheduled = [];
let state = 'suspended';

const param = (v) => ({
  value: v,
  setValueAtTime() { return this; },
  linearRampToValueAtTime() { return this; },
  exponentialRampToValueAtTime() { return this; },
  setTargetAtTime() { return this; }
});

const node = (kind) => {
  const n = {
    kind,
    connect() { return n; },
    disconnect() {},
    start(t) { scheduled.push({ kind, t }); },
    stop() {},
    gain: param(1), frequency: param(440), delayTime: param(0),
    Q: param(1), playbackRate: param(1), type: 'sine', buffer: null
  };
  return n;
};

const ctx = {
  get state() { return state; },
  get currentTime() { return 1.0; },
  get sampleRate() { return 44100; },
  get destination() { return node('destination'); },
  resume() {
    /* Real browsers only settle on the next task, NOT synchronously. This one
       detail is the whole bug, so the mock has to reproduce it exactly. */
    setTimeout(() => { state = 'running'; }, 0);
    return Promise.resolve();
  },
  createGain: () => node('gain'),
  createOscillator: () => node('osc'),
  createBiquadFilter: () => node('biquad'),
  createDelay: () => node('delay'),
  createStereoPanner: () => node('panner'),
  createBufferSource: () => node('bufsrc'),
  createDynamicsCompressor: () => node('comp'),
  createBuffer(ch, len) {
    return { length: len, getChannelData: () => new Float32Array(len) };
  }
};

const sandbox = {
  window: { AudioContext: function () { return ctx; } },
  localStorage: { getItem: () => null, setItem() {} },
  document: { getElementById: () => null, querySelector: () => null },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Promise, Math, Date, console,
  /* The audio block reads two names that live just above it in the real page:
     the localStorage shim `store` and the haptics flag. */
  store: { get: () => null, set() {} },
  hapOn: true,
  hap() {},
  Studio: { settings: { sound: true } }
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.__Snd = Snd;', sandbox);

const Snd = sandbox.__Snd;
if (!Snd) throw new Error('Snd did not initialise');

/* Exactly what a pointerdown does: arm the engine, build the graph, then ask
   for the first sound - all inside one synchronous turn. */
Snd.markGesture();
Snd.init();
Snd.click();

const firstTap = scheduled.length;
const stateDuringTap = state;

setTimeout(() => {
  const before = scheduled.length;
  Snd.click();
  const secondTap = scheduled.length - before;

  console.log('state during first tap  :', stateDuringTap, '(suspended, as in a browser)');
  console.log('first-tap sounds        :', firstTap);
  console.log('second-tap sounds       :', secondTap);
  console.log('state after resume      :', state);

  const ok = firstTap > 0 && secondTap > 0;
  if (!ok) {
    console.log('\nFAIL - a tap scheduled no sound; the first-tap-silent bug is back.');
    process.exit(1);
  }
  console.log('\nOK - the first tap is audible, and later taps still are.');
  /* The audio block installs a music-tick interval, so exit explicitly rather
     than waiting for an idle event loop that never comes. */
  process.exit(0);
}, 30);

/* ---- self-test: prove this check can actually fail ----
   A check that cannot fail proves nothing. This rebuilds the same audio block
   with the OLD wake() (returning ac.state === 'running', which is false during
   the first gesture because resume() is async) and re-runs the identical
   scenario. It must schedule zero first-tap sounds. */
function runScenario(label, html) {
  const blockStart = html.lastIndexOf('/*', html.indexOf('AUDIO v10'));
  const blockEnd = html.indexOf('/* ================= day-cycle palettes');
  const body = html.slice(blockStart, blockEnd);

  const made = [];
  let st = 'suspended';
  const p = (v) => ({ value: v, setValueAtTime() { return this; },
    linearRampToValueAtTime() { return this; },
    exponentialRampToValueAtTime() { return this; },
    setTargetAtTime() { return this; } });
  const mk = (kind) => {
    const n = { kind, connect() { return n; }, disconnect() {},
      start() { made.push(kind); }, stop() {},
      gain: p(1), frequency: p(440), delayTime: p(0), Q: p(1),
      playbackRate: p(1), type: 'sine', buffer: null };
    return n;
  };
  const cx = {
    get state() { return st; }, get currentTime() { return 1; },
    get sampleRate() { return 44100; }, get destination() { return mk('dest'); },
    resume() { setTimeout(() => { st = 'running'; }, 0); return Promise.resolve(); },
    createGain: () => mk('gain'), createOscillator: () => mk('osc'),
    createBiquadFilter: () => mk('bq'), createDelay: () => mk('delay'),
    createStereoPanner: () => mk('pan'), createBufferSource: () => mk('buf'),
    createDynamicsCompressor: () => mk('comp'),
    createBuffer: (c, n) => ({ length: n, getChannelData: () => new Float32Array(n) })
  };
  const box = {
    window: { AudioContext: function () { return cx; } },
    localStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: () => null, querySelector: () => null },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Math, Date, console,
    store: { get: () => null, set() {} }, hapOn: true, hap() {},
    Studio: { settings: { sound: true } }
  };
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(body + '\n;globalThis.__S = Snd;', box);
  box.__S.markGesture();
  box.__S.init();
  /* init() builds the graph and starts its own oscillators, so the counter is
     zeroed AFTER it. Without this the self-test sees the music graph's 1
     source and wrongly concludes the old buggy code produced a click. */
  made.length = 0;
  box.__S.click();
  return { label, first: made.length };
}

if (process.argv[2] === '--self-test') {
  const old = HTML.replace(
    /if\(ac\.state!=='running'\)\{try\{ac\.resume\(\);\}catch\(_\)\{\}\}\s*\n\s*return true;/,
    "if(ac.state!=='running'){try{ac.resume();}catch(_){}}\n    return ac.state==='running';");
  if (old === HTML) {
    console.log('self-test: could not build the OLD variant; wake() text not found');
    process.exit(1);
  }
  const res = runScenario('old', old);
  console.log('old wake() first-tap sounds:', res.first);
  if (res.first > 0) {
    console.log('SELF-TEST FAILED - the old code passed, so this check proves nothing');
    process.exit(1);
  }
  console.log('SELF-TEST OK - the old code schedules nothing on the first tap,');
  console.log('              so a non-zero count really does mean the fix is present');
  process.exit(0);
}
