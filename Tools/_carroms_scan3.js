'use strict';
const fs = require('fs');
const s = fs.readFileSync('app/src/main/assets/games/carroms/index.html', 'utf8').split(/\r?\n/);
const show = (re, n, label) => {
  console.log('=== ' + label + ' ===');
  let c = 0;
  s.forEach((l, i) => { if (re.test(l || '') && c++ < (n || 10)) console.log(String(i + 1).padStart(5) + ' | ' + (l || '').trim().slice(0, 104)); });
  console.log('');
};
show(/onclick=.*S\('click'\)|addEventListener\('click',.*S\('click'\)/, 12, 'handlers that still play click');
show(/p-profiles|renderProfiles|type:'bot'|type: 'bot'|BOT|bot/, 14, 'profile / bot options');
show(/p-tut|Tutorial\.|tutBack|tutorialSeen/, 12, 'tutorial panel');