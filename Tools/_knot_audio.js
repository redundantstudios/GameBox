'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'knot-away', 'index.html');
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* ---- FIRST-TAP + LEVEL ----
   The graph is only built by unlock(), which the game calls from a gesture, so
   the game opens silent and the first tap does nothing but arm audio. The shell
   lifts Chromium's autoplay gate, so the graph can be built at boot. */
swap(
  /  function unlock\(\)\{\r?\n    if\(!ensure\(\)\)return false;/,
  '  function unlock(){\n' +
  '    if(!ensure())return false;',
  'unlock anchor');

swap(
  /sfxG=ctx\.createGain\(\);sfxG\.gain\.value=\.9;sfxG\.connect\(ctx\.destination\);\r?\n\s*musG=ctx\.createGain\(\);musG\.gain\.value=\.5;musG\.connect\(ctx\.destination\);/,
  "  /* Louder than the authored mix. These gains sat at .9 / .5 and then had the\n" +
  "     * shell's own volume applied on top, so at anything under full both the\n" +
  "     * taps and the music were well below where they were written to be. */\n" +
  '  const SFX_MAKEUP=1.9, MUS_MAKEUP=2.2;\n' +
  '  sfxG=ctx.createGain();sfxG.gain.value=.9*SFX_MAKEUP;sfxG.connect(ctx.destination);\n' +
  '  musG=ctx.createGain();musG.gain.value=.5*MUS_MAKEUP;musG.connect(ctx.destination);',
  'volume raised');

/* Build the graph as soon as the page is live. */
swap(
  /showScreen\('home'\);/,
  "showScreen('home');\n" +
  "  /* Arm the audio at boot. The shell lifts the autoplay gesture gate, so this\n" +
  "     * can actually make sound - leaving it to unlock() meant the game opened\n" +
  '     * silent and the first tap only armed audio instead of doing what it hit. */\n' +
  '  setTimeout(function(){ try{ unlock(); }catch(e){} },0);',
  'audio at boot');

fs.writeFileSync(f, s);
console.log('\nchecks:');
console.log('  makeup:', /SFX_MAKEUP=1\.9/.test(s));
console.log('  boot audio:', /unlock\(\); \}catch\(e\)\{\} \},0\);/.test(s));