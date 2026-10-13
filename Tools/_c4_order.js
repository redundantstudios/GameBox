'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'connect-four', 'index.html');
let s = fs.readFileSync(f, 'utf8');

/* Load order problem worth being explicit about: the game's own script block
   runs FIRST and boots itself - builds the audio graph, applies its own
   defaults, calls its Game.setSettings once. Only AFTER that does the shell
   block run and create window.Studio. So the boot-time settings call in the
   game reads window.Studio.settings, finds nothing (Studio does not exist yet)
   and quietly returns, leaving the game on its own defaults: full volume,
   sound and haptics on, whatever the shell was actually set to.

   GameActivity does push settings again on onResume, so this self-corrects a
   moment later - but only for changes made while the app was already running,
   and the first frames play at the wrong level. Pushing once at the end of the
   shell block closes the gap. */
const from =
  "  window.__shellAd=ad;\r\n" +
  "  window.__shellRewarded=rewarded;";
const to =
  "  /* Hand the settings over now that Studio exists (see note above). The game\r\n" +
  "   * block ran first and could not have seen them. */\r\n" +
  "  try{ if(window.Game&&window.Game.setSettings) window.Game.setSettings(settings); }catch(e){}\r\n" +
  "\r\n" +
  "  window.__shellAd=ad;\r\n" +
  "  window.__shellRewarded=rewarded;";

if (!s.includes(from)) { console.log('MISS shell tail'); process.exit(1); }
s = s.replace(from, to);
fs.writeFileSync(f, s);
console.log('OK   shell pushes settings after Studio is built');
console.log('verified:', /window\.Game\.setSettings\)\)\s*\r?\n?\s*window\.Game\.setSettings\(settings\)/.test(s));