'use strict';
const fs = require('fs');
const path = require('path');

const SRC = 'sources/Playable Games/Chinese Checkers.html';
const OUT_DIR = 'app/src/main/assets/games/chinese-checkers';
const OUT = path.join(OUT_DIR, 'index.html');

fs.mkdirSync(OUT_DIR, { recursive: true });
let s = fs.readFileSync(SRC, 'utf8');

/* ---------- 1. Manifest ---------- */
const MANIFEST =
  '<!--\n' +
  'STUDIO_GAME_MANIFEST\n' +
  'id: chinese-checkers\n' +
  'title: Chinese Checkers\n' +
  'orientation: portrait\n' +
  'minPlayers: 2\n' +
  'maxPlayers: 6\n' +
  'aiSupport: full\n' +
  'online: false\n' +
  'tileColor: #7c4f27\n' +
  'banner: bottom\n' +
  'bannerBg: #1a100a\n' +
  'version: 1\n' +
  'released: 2026-10-11\n' +
  '-->\n';

if (!/STUDIO_GAME_MANIFEST/.test(s)) {
  s = s.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n' + MANIFEST);
  console.log('manifest added');
}

/* ---------- 2. Shell settings replace the local settings block ----------
   The game kept its own music/sfx/haptics flags in localStorage, which meant
   the shell's Settings screen and the game's Settings screen could disagree.
   The shell's query string is now the single source of truth for the initial
   state, and Game.setSettings() keeps it live. */
const OLD_SETTINGS =
  /let settings=Object\.assign\(\{music:false,sfx:true,haptics:true\},LS\.get\('cc_set',\{\}\)\);\s*\r?\n\s*let stats=Object\.assign\(\{games:0,wins:0\},LS\.get\('cc_stats',\{\}\)\);\s*\r?\n\s*const saveSettings=\(\)=>LS\.set\('cc_set',settings\);\s*\r?\n\s*const saveStats=\(\)=>LS\.set\('cc_stats',stats\);/;

const NEW_SETTINGS =
  '/* The shell owns sound/haptics. These start from the query string it passes\n' +
  '   (sound, vol, vibe, haptic, preset) and are kept live by Game.setSettings,\n' +
  "   so the game's own Settings screen and the shell's can never disagree.\n" +
  "   GAME_VOL is the shell's volume slider; the per-bus gains below apply it. */\n" +
  'const Q=new URLSearchParams(location.search);\n' +
  'let GAME_VOL=Q.has(\'vol\')?clamp(parseFloat(Q.get(\'vol\'))||0,0,1):0.8;\n' +
  'let settings={\n' +
  "  music:Q.has('sound')?Q.get('sound')==='1':false,\n" +
  "  sfx:Q.has('sound')?Q.get('sound')==='1':true,\n" +
  "  haptics:Q.has('vibe')?Q.get('vibe')==='1':true\n" +
  '};\n' +
  'let stats=Object.assign({games:0,wins:0},LS.get(\'cc_stats\',{}));\n' +
  "const saveSettings=()=>{};   /* no local copy: the shell is the store */\n" +
  'const saveStats=()=>LS.set(\'cc_stats\',stats);\n' +
  'function applyShellSettings(){\n' +
  '  if(!ACTX)return;\n' +
  '  const on=settings.sfx;\n' +
  '  sfxG.gain.value=on?GAME_VOL:0;\n' +
  '  musG.gain.value=settings.music?GAME_VOL:0;\n' +
  "  if(settings.music&&!Music.timer&&ACTX)Music.start();\n" +
  '  if(!settings.music&&Music.timer)Music.stop();\n' +
  '}';

if (!OLD_SETTINGS.test(s)) { console.log('MISS settings block'); }
else { s = s.replace(OLD_SETTINGS, NEW_SETTINGS); console.log('settings: shell-owned'); }

/* Volume now rides the shell's slider. */
s = s.replace(
  'function applyAudioSettings(){if(!ACTX)return;sfxG.gain.value=settings.sfx?1:0;musG.gain.value=settings.music?1:0}',
  'function applyAudioSettings(){applyShellSettings()}');
s = s.replace(
  "  sfxG=ACTX.createGain();sfxG.connect(mg);musG=ACTX.createGain();musG.connect(mg);\n" +
  '  applyAudioSettings();if(settings.music)Music.start();',
  "  sfxG=ACTX.createGain();sfxG.connect(mg);musG=ACTX.createGain();musG.connect(mg);\n" +
  '  applyAudioSettings();if(settings.music)Music.start();');

/* RESET DATA must not clear the shell's settings any more. */
s = s.replace(
  " ['cc_set','cc_stats','cc_save'].forEach(LS.del);\n" +
  " settings={music:false,sfx:true,haptics:true};stats={games:0,wins:0};",
  " ['cc_stats','cc_save'].forEach(LS.del);\n" +
  ' stats={games:0,wins:0};');
s = s.replace(
  " ['music','sfx','haptics'].forEach((k,i)=>{const el=['setMusic','setSfx','setHaptics'][i];",
  " ['music','sfx','haptics'].forEach((k,i)=>{const el=['setMusic','setSfx','setHaptics'][i];");

/* The in-game toggles now push to the shell instead of only changing a local flag. */
s = s.replace(
  "  el.onclick=()=>{SFX.click();settings[key]=!settings[key];saveSettings();sync();applyAudioSettings();\n" +
  "    if(key==='music'){if(settings.music&&ACTX)Music.start();if(!settings.music)Music.stop()}};",
  "  el.onclick=()=>{SFX.click();settings[key]=!settings[key];sync();applyAudioSettings();\n" +
  '    Studio.settings[key]=!!settings[key];try{Studio.pushSettings()}catch(e){}};');

fs.writeFileSync(OUT, s);
console.log('written:', OUT, s.length, 'bytes');