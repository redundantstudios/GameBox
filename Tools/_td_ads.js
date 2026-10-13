'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games/truth-or-dare', 'index.html');
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* ---------- REAL ADS, NOT THE FAKE ONES ----------
   The game shipped a SIMULATED ad: a three-second overlay counting down, shown
   whenever no bridge answered. Its own bridge check looked for
   `bridge.showInterstitial()` called with NO arguments, which cannot work -
   the shell matches by exact arity - so every request fell through to the
   simulation. Rewired to the shell's real ads, with the simulation kept only as
   a last resort for a plain browser tab. */
swap(
  /  interstitial\(\)\{\r?\n    if\(!this\.canInter\(\)\) return Promise\.resolve\(false\);\r?\n    this\.lastInter=Date\.now\(\);\r?\n    if\(this\.bridge && this\.bridge\.showInterstitial\)\{\r?\n      try\{ this\.bridge\.showInterstitial\(\); return Promise\.resolve\(true\); \}catch\(e\)\{\}\r?\n    \}\r?\n    return this\.simulate\('INTERSTITIAL · SIMULATED',3\);\r?\n  \},/,
  '  interstitial(){\n' +
  '    if(!this.canInter()) return Promise.resolve(false);\n' +
  '    this.lastInter=Date.now();\n' +
  '    /* The real ad. showInterstitial takes (callbackName, placement) - matched\n' +
  "     * by EXACT arity - and the name has to exist on window, or the shell fires\n" +
  "     * into the void and the action never runs. The old call passed NO arguments\n" +
  '     * at all, so it could never have matched and every request fell through to\n' +
  '     * the three-second SIMULATED overlay below. */\n' +
  '    if(window.NativeBridge&&window.NativeBridge.showInterstitial){\n' +
  '      return new Promise(res=>{\n' +
  "        var n='__studioInterCbT'+Date.now();\n" +
  '        window[n]=function(){ try{delete window[n]}catch(e){} res(true); };\n' +
  "        try{ window.NativeBridge.showInterstitial(n,'truthordare.break'); }\n" +
  '        catch(e){ try{delete window[n]}catch(_){} res(false); }\n' +
  '      });\n' +
  '    }\n' +
  "    return this.simulate('INTERSTITIAL · SIMULATED',3);\n" +
  '  },',
  'real interstitial');

swap(
  /  rewarded\(placement,onReward\)\{\r?\n    const grant=\(\)=>\{ this\.lastReward=Date\.now\(\); onReward\(\); \};\r?\n    if\(this\.bridge && this\.bridge\.showRewarded\)\{\r?\n      try\{\r?\n        const has = !this\.bridge\.hasRewarded \|\| this\.bridge\.hasRewarded\(\);\r?\n        if\(!has\)\{ grant\(\); return; \}\r?\n        this\.bridge\.showRewarded\(placement, ok=>grant\(\)\);\r?\n        return;\r?\n      \}catch\(e\)\{\}\r?\n    \}\r?\n    this\.simulate\('REWARDED · '\+placement\.toUpperCase\(\),3\)\.then\(grant\);\r?\n  \}/,
  '  rewarded(placement,onReward){\n' +
  '    const grant=()=>{ this.lastReward=Date.now(); onReward(); };\n' +
  '    /* Same story as the interstitial: the old path asked a bridge that the\n' +
  '     * shell does not expose, then simulated. Three arguments, and a unique\n' +
  '     * callback name per request so two offers cannot overwrite each other. */\n' +
  '    if(window.NativeBridge&&window.NativeBridge.showRewardedAd){\n' +
  '      var n="__studioRwCbT"+Date.now();\n' +
  '      window[n]=function(r){\n' +
  '        try{delete window[n]}catch(e){}\n' +
  "        if(r==='granted'||r===true) grant();\n" +
  '      };\n' +
  "      try{ window.NativeBridge.showRewardedAd(n,placement||'truthordare.unlock','UNLOCK'); return; }\n" +
  '      catch(e){ try{delete window[n]}catch(_){} }\n' +
  '    }\n' +
  "    this.simulate('REWARDED · '+placement.toUpperCase(),3).then(grant);\n" +
  '  }',
  'real rewarded');

/* The "SIMULATED AD · SHELL ADS BRIDGE READY" note on screen is no longer true. */
swap(/SIMULATED AD · SHELL ADS BRIDGE READY<br>REAL ADS RENDER HERE VIA WINDOW/,
     'ADS RENDER HERE VIA THE SHELL BRIDGE', 'simulated note removed');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  real interstitial:', /showInterstitial\(n,'truthordare\.break'\)/.test(s));
console.log('  real rewarded    :', /showRewardedAd\(n,placement\|\|'truthordare\.unlock','UNLOCK'\)/.test(s));