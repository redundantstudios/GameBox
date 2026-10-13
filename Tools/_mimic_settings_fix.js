'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/mimic/index.html';
let s = fs.readFileSync(f, 'utf8');

const swap = (from, to, label) => {
  const re = from instanceof RegExp ? from : new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  if (!re.test(s)) { console.log('MISS ' + label); return; }
  s = s.replace(re, to);
  console.log('OK   ' + label);
};

/* THE SILENCE.
   BLOCK 2 is an IIFE: `var settings={...}` is PRIVATE to it. BLOCK 3 - the
   game - is a different IIFE and has no such binding. So the bare `settings`
   in applyMaster() was a ReferenceError, thrown inside ensureAudio()'s try,
   which caught it and set actx = null: no context, no sound, no visible cause.

   Everything in BLOCK 3 has to go through the PUBLIC Studio.settings object.
   The query-string bootstrap is inside BLOCK 2, where the bare name IS correct. */
swap(
  /var v=effMuted\(\)\?0:CFG\.audio\.master\*\(settings\.volume==null\?1:settings\.volume\);/,
  'var vol=(Studio.settings&&Studio.settings.volume!=null)?Studio.settings.volume:1;\n' +
  '  var v=effMuted()?0:CFG.audio.master*vol;',
  'applyMaster uses Studio.settings');

swap(
  /var s2=r\.w\*0\.26/,
  'var s2=r.w*0.26',
  'noop');

swap(
  /\+ ' sound='\+Studio\.settings\.sound\+' vol='\+settings\.volume\);/,
  "+ ' sound='+Studio.settings.sound+' vol='+vol);",
  'log uses Studio.settings');

/* Game.setSettings had the same bare name - and its own try/catch, so it failed
   silently and the shell's live setting pushes were dropped on the floor. */
swap(
  /if\(typeof st\.sound==="boolean"\) settings\.sound=st\.sound;/,
  'if(typeof st.sound==="boolean") Studio.settings.sound=st.sound;',
  'setSettings sound');
swap(
  /if\(typeof st\.haptics==="boolean"\) settings\.haptics=st\.haptics;/,
  'if(typeof st.haptics==="boolean") Studio.settings.haptics=st.haptics;',
  'setSettings haptics');
swap(
  /if\(typeof st\.volume==="number"\) settings\.volume=Math\.max\(0,Math\.min\(1,st\.volume>1\?st\.volume\/100:st\.volume\)\);/,
  'if(typeof st.volume==="number") Studio.settings.volume=Math.max(0,Math.min(1,st.volume>1?st.volume/100:st.volume));',
  'setSettings volume');

/* Fold the pushed volume into the master gain too. */
swap(
  /    applyMaster\(\);\r?\n  \}catch\(e\)\{\} \},/,
  '    applyMaster();\n  }catch(e){} },',
  'setSettings applies master');

fs.writeFileSync(f, s);

/* Any remaining bare `settings` outside BLOCK 2 is still broken. */
const blocks = s.split(/<script>|<\/script>/);
let bare = 0;
blocks.forEach((b, i) => {
  if (i < 2) return;                      /* BLOCK 1 + 2 own the private name */
  const m = b.match(/(^|[^\w.$])settings\s*[.=,)]/g);
  if (m) { bare += m.length; console.log('  bare ref in block ' + i + ': ' + m.length); }
});
console.log('\nbare `settings` outside BLOCK 2:', bare);
console.log('applyMaster fixed:', /Studio\.settings&&Studio\.settings\.volume/.test(s));