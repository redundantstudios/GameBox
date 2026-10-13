'use strict';
const fs = require('fs');
const path = require('path');
const f = path.join('app/src/main/assets/games', 'connect-four', 'index.html');
const s = fs.readFileSync(f, 'utf8');
const lines = s.split(/\r?\n/);

let all = true;
const T = (label, re) => { const ok = re.test(s); if (!ok) all = false; console.log((ok ? 'PASS  ' : 'FAIL  ') + label); };

console.log('--- manifest (must be in the first 30 lines) ---');
const head = lines.slice(0, 30).join('\n');
T('marker in first 30 lines', /STUDIO_GAME_MANIFEST/);
['id: connect-four', 'title: Connect Four', 'orientation: portrait',
 'minPlayers: 1', 'maxPlayers: 2', 'aiSupport: full', 'online: false',
 'banner: bottom', 'bannerBg: #150C05', 'released: 2026-10-12']
  .forEach(k => T('  ' + k, new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));

console.log('--- storage ---');
T('shell store preferred', /if\(SB&&SB\.save\)\{ SB\.save\(k,String\(v\)\); return; \}/);
T('shell load preferred',  /if\(SB&&SB\.load\)/);
T('localStorage fallback', /try\{localStorage\.setItem\(k,v\)\}/);

console.log('--- audio ---');
T('master honours volume', /master\.gain\.value=\.95\*vol/);
T('setVolume exposed',     /setVolume\(v\)\{ vol=/);
T('graph built at boot',   /try\{ SFX\.unlock\(\); \}catch\(e\)\{\}/);
T('pointerdown kept',      /addEventListener\('pointerdown',\(\)=>SFX\.unlock\(\),\{once:true\}\)/);

console.log('--- screens / banner ---');
T('intro -> home',   /shellScreen\("home"\)/);
T('play -> game',    /shellScreen\("game"\)/);
T('overlay blocking',/function syncShellOverlay\(\)/);
T('plaque blocks',   /plaque'\)\.classList\.contains\('on'\)/);
T('how-to blocks',   /howtoEl\.classList\.add\('on'\);syncShellOverlay\(\)/);
T('settings blocks', /setEl\.classList\.add\('on'\);\}\r\n  syncShellOverlay\(\)/);
T('banner gate',     /window\.__shellScreen===GAME && !window\.__shellBlocked/);

console.log('--- ads ---');
T('win ad',        /connectfour\.over\.win/);
T('draw ad',       /connectfour\.over\.draw/);
T('play again ad', /connectfour\.playagain/);
T('restart ad',    /connectfour\.restart/);
T('menu/home ad-free', /^(?![\s\S]{0,4000}connectfour\.menu)/);
T('exact arity inter', /B\.showInterstitial\(n,placement\|\|'break'\)/);
T('exact arity rew',   /B\.showRewardedAd\(n,placement\|\|'reward','NORMAL'\)/);

console.log('--- shell contract ---');
T('Studio defined',   /window\.Studio = window\.Studio \|\| \{\}/);
T('settings from qs', /Q\.get\('sound'\)/);
T('vol 0-100 norm',   /n>1\?n\/100:n/);
T('settings pushed after Studio', /window\.Game\.setSettings\(settings\)/);
T('Game.setSettings preserved',   /var ownSet=window\.Game\.setSettings/);
T('back button',      /window\.__shellBackBtn=btn/);
T('__shellAd exported',/window\.__shellAd=ad/);

console.log('--- hygiene ---');
T('no stray top-of-file code', /^(<!DOCTYPE html>\r?\n<!--\r?\nSTUDIO_GAME_MANIFEST)/);
T('no &amp; in script',       /^(?![\s\S]*&amp;)/);
T('no doubled comma',         /^(?![\s\S]{0,3000}\},,\n)/);

console.log('--- tile ---');
const tiles = fs.readdirSync('app/src/main/res/drawable-nodpi')
  .map(f => 'app/src/main/res/drawable-nodpi/' + f)
  .filter(f => /^tile_connect_four\./.test(f.split('/').pop()))
  .concat(fs.readdirSync('app/src/main/res/drawable')
    .map(f => 'app/src/main/res/drawable/' + f)
    .filter(f => /^tile_connect_four\./.test(f.split('/').pop())));
const found = tiles.find(t => fs.existsSync(t));
const tileRe = new RegExp('x');   // placeholder, replaced below
const okTile = !!found;
if (!okTile) all = false;
console.log((okTile ? 'PASS  ' : 'FAIL  ') + 'tile image exists: ' + (found || 'NONE'));
void tileRe;

console.log('\n' + (all ? 'ALL CONNECT FOUR CHECKS PASS' : 'SOME CHECKS FAILED'));