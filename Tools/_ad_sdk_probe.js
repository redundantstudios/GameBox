/* Proves Chicken Chaos actually REACHES the shell with an interstitial request.

   WHY THIS EXISTS
   The game's hand-written Studio SDK read a bare `placement||'break'` that was
   never declared. The file runs under "use strict", so that threw a
   ReferenceError, the surrounding `catch(_){}` swallowed it, and control fell
   straight through to onDone(). The bridge was never called, so the game asked
   for no ad at all while every other game showed one - and the "no ads" symptom
   looked like a policy problem rather than a dead call.

   This drives the real Studio block out of the real game file against a fake
   window.NativeBridge and asserts the bridge is reached with the exact arity
   addJavascriptInterface requires. Run: node Tools/_ad_sdk_probe.js
*/
'use strict';
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games',
    'chicken-chaos', 'index.html');

const html = fs.readFileSync(GAME, 'utf8');
const src = html.match(/<script>[\s\S]*?<\/script>/)[0].replace(/<\/?script>/g, '');

const start = src.indexOf('const Studio = (() => {');
// The Studio IIFE closes with "})();", so slice to that - not to a later comment
// banner, which would cut a block comment in half.
const close = src.indexOf('})();', start);
if (start < 0 || close < 0) throw new Error('could not locate the Studio block');
const studioSrc = src.slice(start, close + '})();'.length);

// Fake bridge. Real addJavascriptInterface dispatches by EXACT arity, so a
// one-argument call is not merely wrong, it never arrives.
let requested = null;
global.window = {
    NativeBridge: {
        showInterstitial: function () {
            requested = {
                argc: arguments.length,
                callback: arguments[0],
                placement: arguments[1]
            };
        },
        load: () => null,
        save: () => {}
    }
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = { createElement: () => ({ getContext: () => ({}) }) };
global.getComputedStyle = () => ({
    paddingLeft: 0, paddingTop: 0, paddingRight: 0, paddingBottom: 0
});

// eslint-disable-next-line no-eval
// `const Studio` inside eval() is scoped to the eval, so publish it explicitly.
eval(studioSrc.replace('const Studio', 'globalThis.Studio'));
const Studio = globalThis.Studio;

let continued = false;
Studio.ads.interstitial(() => { continued = true; }, 'chicken-chaos.matchEnd');

const fail = [];
if (!requested) {
    fail.push('the bridge was NEVER called - the ad request died before the shell');
} else {
    if (requested.argc !== 2) {
        fail.push('expected arity 2, got ' + requested.argc +
            ' - addJavascriptInterface will not dispatch this');
    }
    if (requested.callback !== '__studioInterCb') {
        fail.push('callback name was "' + requested.callback + '"');
    }
    if (requested.placement !== 'chicken-chaos.matchEnd') {
        fail.push('placement was "' + requested.placement + '"');
    }
    // The shell answers; the game must get its continuation back.
    global.window[requested.callback]('closed');
}
if (!continued) fail.push('onDone never ran, so the game would hang on the ad');

if (fail.length) {
    console.log('FAIL');
    fail.forEach(f => console.log('  - ' + f));
    process.exit(1);
}
console.log('PASS - bridge reached with arity 2, placement "' + requested.placement +
    '", continuation delivered');