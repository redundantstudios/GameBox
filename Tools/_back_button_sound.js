/* Make the shell's injected BACK button sound like the game it sits in.
 *
 * The button plays the SHELL tap, which is right for shell chrome but wrong for
 * a button living inside a game. Every game names its audio differently -
 * sfx.click, SFX.click, Snd.click, a bare uiClick - so this looks the game's
 * own click up by shape rather than hard-coding nine names, which is how the
 * nine would drift apart. The shell tap stays as the fallback, so a game with no
 * recognisable click is not left silent.
 *
 *     node Tools/_back_button_sound.js [--write]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');
const WRITE = process.argv.includes('--write');

const OLD = "try{ var b=window.NativeBridge; if(b&&b.playUiTap)b.playUiTap(); }catch(_){}";

const NEW = [
  "/* Sound like the game this button sits in: try its own click first and",
  "         fall back to the shell tap. The lookup is by shape, not by a name",
  "         per game, because each game names its audio differently and nine",
  "         hard-coded names is nine things to keep in step. */",
  "try{",
  "        var s=(typeof sfx!=='undefined'&&sfx)||(typeof SFX!=='undefined'&&SFX)||(typeof Snd!=='undefined'&&Snd);",
  "        if(s&&typeof s.click==='function')s.click();",
  "        else if(typeof uiClick==='function')uiClick();",
  "        else if(typeof click==='function')click();",
  "        else{var b=window.NativeBridge; if(b&&b.playUiTap)b.playUiTap();}",
  "      }catch(_){}",
].join('\n');

let n = 0;
for (const g of fs.readdirSync(GAMES).sort()) {
  const f = path.join(GAMES, g, 'index.html');
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  if (s.indexOf(OLD) < 0) { console.log('skip ' + g + ' (no shell-tap handler)'); continue; }
  if (s.includes("typeof sfx!=='undefined'")) { console.log('skip ' + g + ' (already done)'); continue; }
  s = s.split(OLD).join(NEW);
  if (WRITE) fs.writeFileSync(f, s);
  console.log((WRITE ? 'OK   ' : 'fix  ') + g);
  n++;
}
console.log('\n' + n + ' game(s) ' + (WRITE ? 'updated' : 'would change'));