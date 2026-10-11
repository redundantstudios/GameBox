'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/planetmerge/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.replace(from, to);
  console.log('OK   ' + label);
};

/* The callback function was being used as the callback NAME. */
swap(
  "        const cbName = callback || 'interstitialCb';\n" +
  "        window[cbName] = function(result){\n" +
  "          if(typeof callback === 'function') callback(result);\n" +
  "          delete window[cbName];\n" +
  "        };\n" +
  "        b.showInterstitial(cbName,'');\n" +
  "        return;",

  "        /* A NAME, not the function. The shell evaluates the string it is given\n" +
  "           and looks it up on window; passing the function itself meant the lookup\n" +
  "           found nothing, so the ad showed but the code after it never ran. */\n" +
  "        window.__studioInterSeq=(window.__studioInterSeq||0)+1;\n" +
  "        const cbName='__studioInterCb'+window.__studioInterSeq;\n" +
  "        window[cbName] = function(result){\n" +
  "          try{ delete window[cbName]; }catch(_){}\n" +
  "          if(typeof callback === 'function') callback(result);\n" +
  "        };\n" +
  "        try{ b.showInterstitial(cbName,''); return; }\n" +
  "        catch(e){ try{ delete window[cbName]; }catch(_){} }",
  'interstitial callback-name fix');

/* In-game NEW GAME ends the run. */
swap(
  "on($('resetBtn'),'click',()=>{\n" +
  "  if(state==='start')return;SFX.ensure();SFX.click();resetGame();toast('New game');\n" +
  "});",
  "on($('resetBtn'),'click',()=>{\n" +
  "  if(state==='start')return;SFX.ensure();SFX.click();\n" +
  "  Studio.ads.interstitial(function(){ resetGame(); toast('New game'); });\n" +
  "});",
  'NEW GAME ad');

/* Back to the start overlay ends the run. */
swap(
  "on($('backBtn'),'click',()=>{\n" +
  "  if(!startOverlay)return;\n" +
  "  SFX.ensure();SFX.click();\n" +
  "  state='start';Studio.ads.banner('hide');startOverlay.classList.add('show');updateHUD();\n" +
  "});",
  "on($('backBtn'),'click',()=>{\n" +
  "  if(!startOverlay)return;\n" +
  "  SFX.ensure();SFX.click();\n" +
  "  Studio.ads.interstitial(function(){\n" +
  "    state='start';Studio.ads.banner('hide');startOverlay.classList.add('show');updateHUD();\n" +
  "  });\n" +
  "});",
  'BACK ad');

fs.writeFileSync(f, s);

const checks = {
  'callback-name fixed': /const cbName='__studioInterCb'\+window\.__studioInterSeq;/.test(s),
  'NEW GAME ad': /resetBtn[\s\S]{0,240}Studio\.ads\.interstitial/.test(s),
  'BACK ad': /backBtn[\s\S]{0,300}Studio\.ads\.interstitial/.test(s),
  'MAIN MENU ad': /overMenuBtn[\s\S]{0,340}Studio\.ads\.interstitial/.test(s),
  'PLAY AGAIN ad': /againBtn[\s\S]{0,220}Studio\.ads\.interstitial/.test(s),
  'game over ad intact': /Studio\.ads\.interstitial\(\);/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));