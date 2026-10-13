'use strict';
const fs = require('fs');
const path = require('path');
const FILE = path.join('app', 'src', 'main', 'assets', 'games', 'carroms', 'index.html');
let s = fs.readFileSync(FILE, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';
let lines = s.split(NL);

/* Replace the whole body of renderProfiles by line range. */
const start = lines.findIndex(l => l.indexOf('function renderProfiles(){') >= 0);
if (start < 0) { console.log('MISS renderProfiles'); process.exit(1); }
let end = start;
while (end < lines.length && lines[end].trim() !== '}') end++;
if (end >= lines.length) { console.log('MISS end'); process.exit(1); }

const body = [
  'function renderProfiles(){',
  "  const n=Setup.types.length;",
  "  $('#profSub').textContent=(Setup.cmode==='family'?'FAMILY POINT':'CLASSIC CARROM')",
  "    +' \\u00b7 '+(Setup.type==='team'?'TEAMS \\u00b7 4 PLAYERS':n+' PLAYERS')",
  "    +' \\u00b7 PICK WHO PLAYS';",
  '  /* Seat 1 is the player: always HUMAN, and shown as a fixed chip rather than a',
  '     toggle. Offering BOT there is what made a bot-only game reachable - bots',
  '     playing each other with nobody at the table. */',
  "  $('#profRow').innerHTML=Setup.types.map((t,i)=>`",
  '    <div class="pcard">',
  '      <div class="pname">${shortName(i)}</div>',
  '      <div class="ptog">',
  '        ${i===0',
  "          ? '<div class=\"ptb on locked\">HUMAN</div>'",
  '          : `<button class="ptb${t===\'bot\'?\' on\':\'\'}" data-i="${i}" data-t="bot">BOT</button>`+',
  '            `<button class="ptb${t===\'human\'?\' on\':\'\'}" data-i="${i}" data-t="human">HUMAN</button>`}',
  '      </div>',
  '    </div>`).join(\'\');',
  '}',
];
lines.splice(start, end - start + 1, ...body);

/* simplify the now-dead second guard in the click handler */
lines = lines.map(l =>
  l.indexOf("if(i===0){ Setup.types[0]='human'; return; }") >= 0 ? null : l
).filter(l => l !== null);
const gi = lines.findIndex(l => l.indexOf("if(i===0||b.dataset.t!=='bot'&&b.dataset.t!=='human')return;") >= 0);
if (gi >= 0) {
  lines[gi] = "  if(i===0){ Setup.types[0]='human'; renderProfiles(); return; }";
  console.log('OK   simplified the seat-1 guard');
}

/* style for the locked chip */
const si = lines.findIndex(l => l.indexOf('.ptb{') >= 0);
if (si < 0) { console.log('MISS .ptb style'); process.exit(1); }
let se = si;
while (se < lines.length && lines[se].indexOf('}') < 0) se++;
lines.splice(se + 1, 0,
  '/* Seat 1 shows this instead of a toggle: same shape, not clickable. */',
  '.ptb.locked{opacity:1;cursor:default;pointer-events:none}');

fs.writeFileSync(FILE, lines.join(NL));
const out = fs.readFileSync(FILE, 'utf8');
console.log('OK   renderProfiles rewritten');
console.log('  seat1 chip  :', /ptb on locked/.test(out));
console.log('  locked style:', /\.ptb\.locked\{/.test(out));