'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/chinese-checkers/index.html', 'utf8');
const c = {
  'showBanner called': /if\(B\.showBanner\)B\.showBanner\(\)/.test(s),
  'hideBanner called': /if\(B\.hideBanner\)B\.hideBanner\(\)/.test(s),
  'syncBanner defined+used': /function syncBanner/.test(s) && (s.match(/syncBanner\(\)/g) || []).length >= 3,
  'showInterstitial arity': /B\.showInterstitial\(name,placement\|\|'chinesecheckers'\)/.test(s),
  'unique cb names': /__studioInterCb'/.test(s),
  'Game pause/resume/destroy': /pause:function/.test(s) && /resume:function/.test(s) && /destroy:function/.test(s),
  'settings live push': /setSettings:function\(st\)/.test(s),
  'volume from shell': /GAME_VOL=Q\.has\('vol'\)/.test(s),
  'auto path reads players': /Q\.get\('players'\)/.test(s),
  'auto path validates SEATS': /n in SEATS/.test(s),
  'back button exits': /B\.exitGame/.test(s),
  'no local settings copy': /const saveSettings=\(\)=>\{\}/.test(s),
};
Object.entries(c).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));