'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/planetmerge/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

/* ---- 1. The interstitial helper could not run a callback ----
   `const cbName = callback || 'interstitialCb'` used the callback FUNCTION as
   the callback NAME. The shell evaluates a NAME it is given, and looks it up on
   window, so passing a function meant the lookup found nothing: the ad still
   showed, but the code that was supposed to run after it never did. Now each
   request registers a unique string name, exactly as the other games do. */
s = s.replace(
  "      const cbName = callback || 'interstitialCb';\n" +
  "      window[cbName] = function(result){\n" +
  "        if(typeof callback === 'function') callback(result);\n" +
  "        delete window[cbName];\n" +
  "      };\n" +
  "      b.showInterstitial(cbName,'');\n" +
  "      return;",

  "      /* A NAME, not the function. The shell evaluates the string it is given\n" +
  "         and looks it up on window; passing the function itself meant the lookup\n" +
  "         found nothing, so the ad showed but the code after it never ran. */\n" +
  "      window.__studioInterSeq=(window.__studioInterSeq||0)+1;\n" +
  "      const cbName='__studioInterCb'+window.__studioInterSeq;\n" +
  "      window[cbName] = function(result){\n" +
  "        try{ delete window[cbName]; }catch(_){}\n" +
  "        if(typeof callback === 'function') callback(result);\n" +
  "      };\n" +
  "      try{ b.showInterstitial(cbName,''); return; }\n" +
  "      catch(e){ try{ delete window[cbName]; }catch(_){} }");

/* ---- 2. Banner background = the page it sits on ----
   body is linear-gradient(#d3e4c6,#c2d8b6); the strip is at the bottom. */
s = s.replace(/^bannerBg: #\w+\r?\n/m, 'bannerBg: #c2d8b6\n');

/* ---- 3. MAIN MENU on the game over popup ----
   The popup had PLAY AGAIN and nothing else, so the only way out of a finished
   run was to replay it. */
s = s.replace('    <button class="play" id="againBtn">PLAY AGAIN</button>',
  '    <button class="play" id="againBtn">PLAY AGAIN</button>\n' +
  '    <button class="play alt" id="overMenuBtn">MAIN MENU</button>');

/* ---- 4. Ads on the buttons that end a run ----
   PLAY AGAIN, the in-game NEW GAME, and the back-to-start control all abandon
   the run the player is in and none asked for an ad. The game-over overlay
   itself already does (it fires when the overlay is revealed). */
s = s.replace(
  "on($('againBtn'),'click',()=>{const el=$('againBtn');if(!el)return;SFX.ensure();SFX.click();resetGame();});",
  "on($('againBtn'),'click',()=>{const el=$('againBtn');if(!el)return;SFX.ensure();SFX.click();\n" +
  "  Studio.ads.interstitial(function(){ resetGame(); });});\n" +
  "on($('overMenuBtn'),'click',()=>{SFX.ensure();SFX.click();\n" +
  "  Studio.ads.interstitial(function(){\n" +
  "    state='start';overOverlay.classList.remove('show');\n" +
  "    Studio.ads.banner('hide');startOverlay.classList.add('show');updateHUD();\n" +
  "  });});");

s = s.replace(
  "on($('resetBtn'),'click',()=>{ if(state==='start')return;SFX.ensure();SFX.click();resetGame();toast('New game'); });",
  "on($('resetBtn'),'click',()=>{ if(state==='start')return;SFX.ensure();SFX.click();\n" +
  "  Studio.ads.interstitial(function(){ resetGame(); toast('New game'); }); });");

s = s.replace(
  "on($('backBtn'),'click',()=>{ if(!startOverlay)return; SFX.ensure();SFX.click(); state='start';Studio.ads.banner('hide');startOverlay.classList.add('show');updateHUD(); });",
  "on($('backBtn'),'click',()=>{ if(!startOverlay)return; SFX.ensure();SFX.click();\n" +
  "  Studio.ads.interstitial(function(){ state='start';Studio.ads.banner('hide');startOverlay.classList.add('show');updateHUD(); }); });");

fs.writeFileSync(f, s);

const checks = {
  'callback-name bug fixed': /const cbName='__studioInterCb'\+window\.__studioInterSeq;/.test(s),
  'bannerBg = page bottom': /bannerBg: #c2d8b6/.test(s),
  'MAIN MENU button added': /id="overMenuBtn">MAIN MENU</.test(s),
  'game over still asks': /Studio\.ads\.interstitial\(\);/.test(s),
  'PLAY AGAIN ad': /againBtn[\s\S]{0,200}Studio\.ads\.interstitial/.test(s),
  'MAIN MENU ad': /overMenuBtn[\s\S]{0,320}Studio\.ads\.interstitial/.test(s),
  'NEW GAME ad': /resetBtn[\s\S]{0,220}Studio\.ads\.interstitial/.test(s),
  'BACK ad': /backBtn[\s\S]{0,260}Studio\.ads\.interstitial/.test(s),
  'exit still ad-free': /function introBack[\s\S]{0,150}Studio\.exitGame/.test(s),
  'changed': s !== before,
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));