/* Fix Studio.pushSettings() dropping keys the shell wrote.
 *
 * The shim re-serialised only three of the six keys:
 *
 *     JSON.stringify({sound:..., music:..., haptics:...})
 *
 * so volume, haptic and preset - which SettingsManager.getSettingsJson() writes
 * and games read - were wiped from the stored copy the moment a game pushed its
 * settings back. Seven games read one of those keys, and an undefined volume
 * turns a gain calculation into NaN, which silences the game outright.
 *
 * All six keys are written back instead. JSON.stringify drops undefined values,
 * so a key that genuinely was never read stays absent rather than becoming null.
 *
 *     node Tools/_fix_push_settings.js [--write]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');
const WRITE = process.argv.includes('--write');

const OLD = /this\.save\('shell:settings',JSON\.stringify\(\{sound:([^}]*?)haptics:([^}]*?)\}\)\)/;

const NEW_BODY = (soundExpr, musicExpr, hapticsExpr) =>
  "/* Keep every key the shell sent. This used to re-serialise only sound, music" +
  " and haptics, which wiped volume, haptic and preset out of the stored copy the" +
  " moment a game pushed its settings back - and a game reading settings.volume" +
  " afterwards got undefined, turning a gain calculation into NaN and silencing" +
  " it. JSON.stringify drops undefined values, so a key never read stays absent" +
  " rather than turning into null. */\n" +
  "  this.save('shell:settings',JSON.stringify({sound:" + soundExpr + ",music:" + musicExpr +
  ",volume:settings.volume,haptics:" + hapticsExpr + ",haptic:settings.haptic,preset:settings.preset}))";

let changed = 0;
const skipped = [];

for (const dir of fs.readdirSync(GAMES).sort()) {
  const file = path.join(GAMES, dir, 'index.html');
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  if (!html.includes('pushSettings')) { skipped.push(dir + ' (no pushSettings)'); continue; }
  if (/haptic:settings\.haptic/.test(html)) { skipped.push(dir + ' (already fixed)'); continue; }

  const m = OLD.exec(html);
  if (!m) { skipped.push(dir + ' (pattern not matched)'); continue; }

  const before = html;
  /* Keep the game's own expressions for the three keys it already wrote.
     Each captured piece ends with a comma from the original list, so it has to
     be trimmed - leaving it in produced "music:x,," and broke the parse in all
     nine games it touched. */
  const trim = s => s.trim().replace(/,$/, '').trim();
  const parts = m[1].split(',music:');
  const soundExpr = trim(parts[0] || 'settings.sound');
  const musicExpr = trim(parts[1] || 'settings.music');
  const hapticsExpr = trim(m[2] || 'settings.haptics');
  if (/,$/.test(musicExpr) || /,,/.test(musicExpr)) {
    throw new Error(dir + ': captured expressions still contain a comma - aborting rather than writing broken JS');
  }
  html = html.replace(m[0], NEW_BODY(soundExpr, musicExpr, hapticsExpr));

  if (html === before) { skipped.push(dir + ' (no change)'); continue; }
  if (WRITE) fs.writeFileSync(file, html, 'utf8');
  console.log((WRITE ? 'OK   ' : 'would fix ') + dir);
  changed++;
}

console.log('\n' + changed + ' game(s) ' + (WRITE ? 'fixed' : 'would be fixed'));
skipped.forEach(s => console.log('  skipped ' + s));